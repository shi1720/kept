import { and, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db/client";
import { ensureMigrated } from "@/lib/db/migrate";
import {
  artifacts,
  criteria as criteriaTable,
  disputes,
  ledgerEntries,
  milestones,
  pacts,
  payments,
  payouts,
  refunds,
  users,
  verdicts,
  webhookEvents,
  type CriterionResult,
  type LedgerAccount,
  type MilestoneStatus,
  type User,
} from "@/lib/db/schema";
import { extractHiddenHtmlText, scanForInjection } from "@/lib/evidence/injection";
import { ACCOUNT_LABELS, accountBalances } from "./ledger";
import { HOLDING_FUNDS } from "./state";

/**
 * Read models for the ops console (/admin).
 *
 * Admins see every workspace; a demo visitor sees an "ops view" of their own
 * sandbox world only. Everything here is read-only and returns plain,
 * serialisable rows (timestamps as epoch ms) so it can be handed straight to
 * client-side AG Grids.
 */

export type OpsScope = { kind: "admin" } | { kind: "demo"; workspace: string };

/** Who may open the ops console, and what they get to see. `null` = no access. */
export function resolveOpsScope(user: User | null): OpsScope | null {
  if (!user) return null;
  if (user.role === "admin") return { kind: "admin" };
  if (user.demoWorkspace) return { kind: "demo", workspace: user.demoWorkspace };
  return null;
}

const ms = (d: Date | null | undefined) => (d ? d.getTime() : null);
const ROW_CAP = 5000;

/* ------------------------------------------------------------------ */
/* Row types                                                           */
/* ------------------------------------------------------------------ */

export interface EscrowRow {
  id: string;
  pactId: string;
  pactTitle: string;
  milestoneTitle: string;
  position: number;
  status: MilestoneStatus;
  amountCents: number;
  currency: string;
  client: string | null;
  freelancer: string | null;
  fundedAt: number | null;
  resolvedAt: number | null;
  releasedPct: number | null;
  captureId: string | null;
  orderId: string | null;
  simulated: boolean | null;
  verdictScore: number | null;
  verdictOverall: "pass" | "partial" | "fail" | null;
  workspace: string | null;
}

export interface LedgerRow {
  id: string;
  txnId: string;
  createdAt: number;
  account: LedgerAccount;
  accountLabel: string;
  amountCents: number;
  memo: string;
  reference: string | null;
  pactId: string | null;
  pactTitle: string | null;
  workspace: string | null;
}

export type MovementType = "capture" | "payout" | "refund";

export interface MovementRow {
  id: string;
  type: MovementType;
  at: number;
  /** Signed from Kept's point of view: + money in, − money out. */
  amountCents: number;
  paypalFeeCents: number | null;
  netCents: number;
  status: string;
  primaryId: string | null;
  secondaryId: string | null;
  counterparty: string | null;
  pactId: string;
  pactTitle: string;
  milestoneTitle: string;
  simulated: boolean;
  detail: string | null;
  /** Chargeback shield: set when the payer opened a PayPal dispute on this capture. */
  paypalDispute: { id: string; status: string; reason: string; stage: string | null; outcome: string | null; amountCents: number | null } | null;
}

export interface VerdictRow {
  id: string;
  createdAt: number;
  pactId: string;
  pactTitle: string;
  milestoneTitle: string;
  provider: string;
  model: string;
  overall: "pass" | "partial" | "fail";
  score: number;
  recommendedReleasePct: number;
  criteriaMet: number;
  criteriaTotal: number;
  injectionDetected: boolean;
  latencyMs: number;
  summary: string;
  /** Per-criterion judgment, joined with the criterion text (for the expandable audit row). */
  criteria: VerdictCriterion[];
  /** Probes Kept's evidence engine ran before the model saw anything. */
  evidence: { probe: string; label: string; detail: string; ok: boolean | null }[];
  /** Text in the deliverable that tried to instruct the referee (re-scanned from stored text artifacts). */
  injectionFindings: { source: string; snippet: string }[];
}

export interface VerdictCriterion {
  id: string;
  position: number;
  text: string;
  kind: "objective" | "subjective" | null;
  result: CriterionResult["result"];
  confidence: number;
  evidence: string;
  reasoning: string;
  machineCheck: { type: string; passed: boolean; detail: string } | null;
}

export type DisputeStatus = "open" | "ruling_proposed" | "escalated" | "resolved";

export interface DisputeRow {
  id: string;
  createdAt: number;
  resolvedAt: number | null;
  pactId: string;
  pactTitle: string;
  milestoneTitle: string;
  amountCents: number;
  currency: string;
  status: DisputeStatus;
  reason: string;
  openedBy: string | null;
  /** Each side's account of what happened, as given to the mediator. */
  clientStatement: string | null;
  freelancerStatement: string | null;
  client: string | null;
  freelancer: string | null;
  proposedPct: number | null;
  finalPct: number | null;
  rationale: string | null;
  mediator: string | null;
  clientAccepted: boolean;
  freelancerAccepted: boolean;
}

export interface WebhookRow {
  id: string;
  createdAt: number;
  paypalEventId: string;
  eventType: string;
  resourceId: string | null;
  verified: boolean;
  processedAt: number | null;
  error: string | null;
}

export interface BooksCheck {
  balanced: boolean;
  totalCents: number;
  txnCount: number;
  unbalancedTxns: { txnId: string; offBy: number }[];
  escrowLiabilityCents: number;
  heldMilestonesCents: number;
  heldMilestoneCount: number;
  pendingPayoutsCents: number;
  pendingRefundsCents: number;
  expectedEscrowCents: number;
  checks: { label: string; ok: boolean; detail: string }[];
}

export interface OpsKpis {
  escrowHeldCents: number;
  /** Part of escrowHeldCents already released or refunded, waiting on PayPal (or a payout email). */
  awaitingPayPalCents: number;
  gmvFundedCents: number;
  grossChargedCents: number;
  fundedCount: number;
  releasedCents: number;
  payoutCount: number;
  pendingPayoutCount: number;
  refundedCents: number;
  refundCount: number;
  feeRevenueCents: number;
  processingCollectedCents: number;
  processingExpenseCents: number;
  payoutFeesCents: number;
  netProcessingCents: number;
  verdictCount: number;
  avgLatencyMs: number;
  injectionCount: number;
  openDisputes: number;
  escalatedDisputes: number;
}

export interface OpsConsole {
  scope: OpsScope;
  generatedAt: number;
  kpis: OpsKpis;
  books: BooksCheck;
  balances: { account: LedgerAccount; label: string; balanceCents: number }[];
  escrow: EscrowRow[];
  ledger: LedgerRow[];
  movements: MovementRow[];
  verdicts: VerdictRow[];
  disputes: DisputeRow[];
  webhooks: WebhookRow[];
}

/* ------------------------------------------------------------------ */
/* Query                                                               */
/* ------------------------------------------------------------------ */

export async function getOpsConsole(scope: OpsScope): Promise<OpsConsole> {
  await ensureMigrated();
  const ws = scope.kind === "demo" ? scope.workspace : undefined;
  /** Pact-scoped filter (undefined = everything for admins). */
  const pactScope: SQL | undefined = ws === undefined ? undefined : eq(pacts.demoWorkspace, ws);
  const ledgerScope: SQL | undefined = ws === undefined ? undefined : eq(ledgerEntries.demoWorkspace, ws);

  const clientU = alias(users, "client_u");
  const freelancerU = alias(users, "freelancer_u");
  const openerU = alias(users, "opener_u");

  const [milestoneRows, paymentRows, payoutRows, refundRows, verdictRows, disputeRows, ledgerRows, balancesRaw, unbalanced, txnCountRow] =
    await Promise.all([
      db
        .select({
          m: {
            id: milestones.id,
            pactId: milestones.pactId,
            title: milestones.title,
            position: milestones.position,
            status: milestones.status,
            amountCents: milestones.amountCents,
            fundedAt: milestones.fundedAt,
            resolvedAt: milestones.resolvedAt,
            releasedPct: milestones.releasedPct,
            createdAt: milestones.createdAt,
          },
          pactTitle: pacts.title,
          currency: pacts.currency,
          workspace: pacts.demoWorkspace,
          client: clientU.name,
          freelancer: freelancerU.name,
          counterpartyName: pacts.counterpartyName,
          creatorRole: pacts.creatorRole,
        })
        .from(milestones)
        .innerJoin(pacts, eq(pacts.id, milestones.pactId))
        .leftJoin(clientU, eq(clientU.id, pacts.clientId))
        .leftJoin(freelancerU, eq(freelancerU.id, pacts.freelancerId))
        .where(pactScope)
        .orderBy(desc(milestones.updatedAt))
        .limit(ROW_CAP),
      db
        .select({ p: payments, pactId: pacts.id, pactTitle: pacts.title, milestoneTitle: milestones.title })
        .from(payments)
        .innerJoin(milestones, eq(milestones.id, payments.milestoneId))
        .innerJoin(pacts, eq(pacts.id, milestones.pactId))
        .where(pactScope)
        .orderBy(desc(payments.createdAt))
        .limit(ROW_CAP),
      db
        .select({ p: payouts, pactId: pacts.id, pactTitle: pacts.title, milestoneTitle: milestones.title })
        .from(payouts)
        .innerJoin(milestones, eq(milestones.id, payouts.milestoneId))
        .innerJoin(pacts, eq(pacts.id, milestones.pactId))
        .where(pactScope)
        .orderBy(desc(payouts.createdAt))
        .limit(ROW_CAP),
      db
        .select({ r: refunds, pactId: pacts.id, pactTitle: pacts.title, milestoneTitle: milestones.title, payerEmail: payments.payerEmail, captureId: payments.paypalCaptureId })
        .from(refunds)
        .innerJoin(payments, eq(payments.id, refunds.paymentId))
        .innerJoin(milestones, eq(milestones.id, refunds.milestoneId))
        .innerJoin(pacts, eq(pacts.id, milestones.pactId))
        .where(pactScope)
        .orderBy(desc(refunds.createdAt))
        .limit(ROW_CAP),
      db
        .select({
          v: {
            id: verdicts.id,
            milestoneId: verdicts.milestoneId,
            createdAt: verdicts.createdAt,
            provider: verdicts.provider,
            model: verdicts.model,
            overall: verdicts.overall,
            score: verdicts.score,
            recommendedReleasePct: verdicts.recommendedReleasePct,
            criteriaResults: verdicts.criteriaResults,
            evidence: verdicts.evidence,
            submissionId: verdicts.submissionId,
            injectionDetected: verdicts.injectionDetected,
            latencyMs: verdicts.latencyMs,
            summary: verdicts.summary,
          },
          pactId: pacts.id,
          pactTitle: pacts.title,
          milestoneTitle: milestones.title,
        })
        .from(verdicts)
        .innerJoin(milestones, eq(milestones.id, verdicts.milestoneId))
        .innerJoin(pacts, eq(pacts.id, milestones.pactId))
        .where(pactScope)
        .orderBy(desc(verdicts.createdAt))
        .limit(ROW_CAP),
      db
        .select({
          d: disputes,
          pactId: pacts.id,
          pactTitle: pacts.title,
          currency: pacts.currency,
          milestoneTitle: milestones.title,
          amountCents: milestones.amountCents,
          client: clientU.name,
          freelancer: freelancerU.name,
          openedBy: openerU.name,
        })
        .from(disputes)
        .innerJoin(milestones, eq(milestones.id, disputes.milestoneId))
        .innerJoin(pacts, eq(pacts.id, milestones.pactId))
        .leftJoin(clientU, eq(clientU.id, pacts.clientId))
        .leftJoin(freelancerU, eq(freelancerU.id, pacts.freelancerId))
        .leftJoin(openerU, eq(openerU.id, disputes.openedById))
        .where(pactScope)
        .orderBy(desc(disputes.createdAt))
        .limit(ROW_CAP),
      db
        .select({ l: ledgerEntries, pactTitle: pacts.title })
        .from(ledgerEntries)
        .leftJoin(pacts, eq(pacts.id, ledgerEntries.pactId))
        .where(ledgerScope)
        .orderBy(desc(ledgerEntries.createdAt), ledgerEntries.txnId, desc(ledgerEntries.amountCents))
        .limit(ROW_CAP),
      accountBalances(db, ws),
      db
        .select({ txnId: ledgerEntries.txnId, offBy: sql<number>`sum(${ledgerEntries.amountCents})` })
        .from(ledgerEntries)
        .where(ledgerScope)
        .groupBy(ledgerEntries.txnId)
        .having(sql`sum(${ledgerEntries.amountCents}) != 0`),
      db
        .select({ n: sql<number>`count(distinct ${ledgerEntries.txnId})`, total: sql<number>`coalesce(sum(${ledgerEntries.amountCents}), 0)` })
        .from(ledgerEntries)
        .where(ledgerScope),
    ]);

  /* Latest payment + verdict per milestone, for the escrow book. */
  const paymentByMilestone = new Map<string, (typeof paymentRows)[number]["p"]>();
  for (const { p } of paymentRows) {
    const prev = paymentByMilestone.get(p.milestoneId);
    // Prefer a captured payment over abandoned orders.
    if (!prev || (!prev.paypalCaptureId && p.paypalCaptureId)) paymentByMilestone.set(p.milestoneId, p);
  }
  const verdictByMilestone = new Map<string, (typeof verdictRows)[number]["v"]>();
  for (const { v } of verdictRows) if (!verdictByMilestone.has(v.milestoneId)) verdictByMilestone.set(v.milestoneId, v);

  const escrow: EscrowRow[] = milestoneRows.map((r) => {
    const pay = paymentByMilestone.get(r.m.id);
    const v = verdictByMilestone.get(r.m.id);
    return {
      id: r.m.id,
      pactId: r.m.pactId,
      pactTitle: r.pactTitle,
      milestoneTitle: r.m.title,
      position: r.m.position,
      status: r.m.status,
      amountCents: r.m.amountCents,
      currency: r.currency,
      client: r.client ?? (r.creatorRole === "freelancer" ? r.counterpartyName : null),
      freelancer: r.freelancer ?? (r.creatorRole === "client" ? r.counterpartyName : null),
      fundedAt: ms(r.m.fundedAt),
      resolvedAt: ms(r.m.resolvedAt),
      releasedPct: r.m.releasedPct,
      captureId: pay?.paypalCaptureId ?? null,
      orderId: pay?.paypalOrderId ?? null,
      simulated: pay ? pay.simulated : null,
      verdictScore: v?.score ?? null,
      verdictOverall: v?.overall ?? null,
      workspace: r.workspace,
    };
  });

  const ledger: LedgerRow[] = ledgerRows.map(({ l, pactTitle }) => ({
    id: l.id,
    txnId: l.txnId,
    createdAt: l.createdAt.getTime(),
    account: l.account,
    accountLabel: ACCOUNT_LABELS[l.account] ?? l.account,
    amountCents: l.amountCents,
    memo: l.memo,
    reference: l.reference,
    pactId: l.pactId,
    pactTitle,
    workspace: l.demoWorkspace,
  }));

  const movements: MovementRow[] = [
    ...paymentRows
      .filter(({ p }) => p.status !== "created")
      .map(({ p, pactId, pactTitle, milestoneTitle }) => ({
        id: p.id,
        type: "capture" as const,
        at: (p.capturedAt ?? p.createdAt).getTime(),
        amountCents: p.capturedAt ? p.totalCents : 0,
        paypalFeeCents: p.paypalFeeCents,
        netCents: p.capturedAt ? p.totalCents - (p.paypalFeeCents ?? 0) : 0,
        status: p.status.toUpperCase(),
        primaryId: p.paypalCaptureId,
        secondaryId: p.paypalOrderId,
        counterparty: p.payerEmail,
        pactId,
        pactTitle,
        milestoneTitle,
        simulated: p.simulated,
        paypalDispute: p.paypalDispute
          ? {
              id: p.paypalDispute.id,
              status: p.paypalDispute.status,
              reason: p.paypalDispute.reason,
              stage: p.paypalDispute.stage,
              outcome: p.paypalDispute.outcome ?? null,
              amountCents: p.paypalDispute.amountCents,
            }
          : null,
        detail: `Milestone ${(p.milestoneCents / 100).toFixed(2)} + Kept fee ${(p.platformFeeCents / 100).toFixed(2)} + processing ${(p.processingFeeCents / 100).toFixed(2)}${p.refundedCents ? ` · refunded ${(p.refundedCents / 100).toFixed(2)}` : ""}`,
      })),
    ...payoutRows.map(({ p, pactId, pactTitle, milestoneTitle }) => ({
      id: p.id,
      type: "payout" as const,
      at: p.updatedAt.getTime(),
      amountCents: -p.amountCents,
      paypalFeeCents: p.feeCents,
      netCents: -(p.amountCents + (p.feeCents ?? 0)),
      status: p.status,
      primaryId: p.paypalItemId ?? p.paypalBatchId,
      secondaryId: p.paypalBatchId ?? p.senderBatchId,
      counterparty: p.receiverEmail || null,
      pactId,
      pactTitle,
      milestoneTitle,
      simulated: p.simulated,
      detail: errorOf(p.raw),
      paypalDispute: null,
    })),
    ...refundRows.map(({ r, pactId, pactTitle, milestoneTitle, payerEmail, captureId }) => ({
      id: r.id,
      type: "refund" as const,
      at: r.createdAt.getTime(),
      amountCents: -r.amountCents,
      paypalFeeCents: null,
      netCents: -r.amountCents,
      status: r.status,
      primaryId: r.paypalRefundId,
      secondaryId: captureId,
      counterparty: payerEmail,
      pactId,
      pactTitle,
      milestoneTitle,
      simulated: r.simulated,
      detail: errorOf(r.raw) ?? (r.reason || null),
      paypalDispute: null,
    })),
  ].sort((a, b) => b.at - a.at);

  /* Criterion texts + injection snippets for the verdict audit rows. */
  const criteriaRows = verdictRows.length
    ? await db
        .select({ id: criteriaTable.id, text: criteriaTable.text, kind: criteriaTable.kind, position: criteriaTable.position })
        .from(criteriaTable)
        .innerJoin(milestones, eq(milestones.id, criteriaTable.milestoneId))
        .innerJoin(pacts, eq(pacts.id, milestones.pactId))
        .where(and(pactScope, inArray(criteriaTable.milestoneId, [...new Set(verdictRows.map(({ v }) => v.milestoneId))].slice(0, 2000))))
    : [];
  const criterionById = new Map(criteriaRows.map((c) => [c.id, c]));
  const flaggedSubmissions = [...new Set(verdictRows.filter(({ v }) => v.injectionDetected).map(({ v }) => v.submissionId))].slice(0, 500);
  const findingsBySubmission = new Map<string, { source: string; snippet: string }[]>();
  if (flaggedSubmissions.length) {
    const texts = await db
      .select({ submissionId: artifacts.submissionId, name: artifacts.name, content: artifacts.content })
      .from(artifacts)
      .where(and(inArray(artifacts.submissionId, flaggedSubmissions), eq(artifacts.kind, "text")));
    for (const a of texts) {
      if (!a.content) continue;
      const hidden = /<[a-z][\s\S]*>/i.test(a.content) ? extractHiddenHtmlText(a.content) : "";
      const found = [...(hidden ? scanForInjection(`${a.name} (hidden HTML)`, hidden) : []), ...scanForInjection(a.name, a.content)];
      if (!found.length) continue;
      const list = findingsBySubmission.get(a.submissionId) ?? [];
      for (const f of found) if (!list.some((x) => x.snippet === f.snippet)) list.push(f);
      findingsBySubmission.set(a.submissionId, list.slice(0, 5));
    }
  }

  const verdictOut: VerdictRow[] = verdictRows.map(({ v, pactId, pactTitle, milestoneTitle }) => ({
    id: v.id,
    createdAt: v.createdAt.getTime(),
    pactId,
    pactTitle,
    milestoneTitle,
    provider: v.provider,
    model: v.model,
    overall: v.overall,
    score: v.score,
    recommendedReleasePct: v.recommendedReleasePct,
    criteriaMet: v.criteriaResults.filter((c) => c.result === "met").length,
    criteriaTotal: v.criteriaResults.length,
    injectionDetected: v.injectionDetected,
    latencyMs: v.latencyMs,
    summary: v.summary,
    criteria: v.criteriaResults.map((c, i) => {
      const def = criterionById.get(c.criterionId);
      return {
        id: c.criterionId,
        position: def?.position ?? i,
        text: def?.text ?? `Criterion ${i + 1}`,
        kind: def?.kind ?? null,
        result: c.result,
        confidence: c.confidence,
        evidence: c.evidence,
        reasoning: c.reasoning,
        machineCheck: c.machineCheck ? { type: c.machineCheck.type, passed: c.machineCheck.passed, detail: c.machineCheck.detail } : null,
      };
    }),
    evidence: (v.evidence ?? []).map((f) => ({ probe: f.probe, label: f.label, detail: f.detail, ok: f.ok ?? null })),
    injectionFindings: findingsBySubmission.get(v.submissionId) ?? [],
  }));

  const disputeOut: DisputeRow[] = disputeRows.map((r) => ({
    id: r.d.id,
    createdAt: r.d.createdAt.getTime(),
    resolvedAt: ms(r.d.resolvedAt),
    pactId: r.pactId,
    pactTitle: r.pactTitle,
    milestoneTitle: r.milestoneTitle,
    amountCents: r.amountCents,
    currency: r.currency,
    status: r.d.status,
    reason: r.d.reason,
    openedBy: r.openedBy,
    clientStatement: r.d.clientStatement,
    freelancerStatement: r.d.freelancerStatement,
    client: r.client,
    freelancer: r.freelancer,
    proposedPct: r.d.ruling?.releasePct ?? null,
    finalPct: r.d.finalReleasePct,
    rationale: r.d.ruling?.rationale ?? null,
    mediator: r.d.ruling ? `${r.d.ruling.provider}/${r.d.ruling.model}` : null,
    clientAccepted: Boolean(r.d.clientAcceptedAt),
    freelancerAccepted: Boolean(r.d.freelancerAcceptedAt),
  }));

  /* Webhooks have no workspace; a demo world sees the ones touching its own PayPal resources. */
  let webhookWhere: SQL | undefined;
  if (ws !== undefined) {
    const ids = new Set<string>();
    for (const { p } of paymentRows) [p.paypalOrderId, p.paypalCaptureId].forEach((x) => x && ids.add(x));
    for (const { p } of payoutRows) [p.paypalBatchId, p.paypalItemId].forEach((x) => x && ids.add(x));
    for (const { r } of refundRows) if (r.paypalRefundId) ids.add(r.paypalRefundId);
    webhookWhere = ids.size ? inArray(webhookEvents.resourceId, [...ids]) : sql`0`;
  }
  const webhookRows = await db
    .select({
      id: webhookEvents.id,
      createdAt: webhookEvents.createdAt,
      paypalEventId: webhookEvents.paypalEventId,
      eventType: webhookEvents.eventType,
      resourceId: webhookEvents.resourceId,
      verified: webhookEvents.verified,
      processedAt: webhookEvents.processedAt,
      error: webhookEvents.error,
    })
    .from(webhookEvents)
    .where(webhookWhere)
    .orderBy(desc(webhookEvents.createdAt))
    .limit(ROW_CAP);
  const webhooks: WebhookRow[] = webhookRows.map((w) => ({ ...w, createdAt: w.createdAt.getTime(), processedAt: ms(w.processedAt) }));

  /* ---------------- Books & KPIs ---------------- */
  const [pendingPayoutRow] = await db
    .select({ cents: sql<number>`coalesce(sum(${payouts.amountCents}), 0)` })
    .from(payouts)
    .innerJoin(milestones, eq(milestones.id, payouts.milestoneId))
    .innerJoin(pacts, eq(pacts.id, milestones.pactId))
    .where(and(pactScope, isNull(payouts.paypalBatchId)));
  const [pendingRefundRow] = await db
    .select({ cents: sql<number>`coalesce(sum(${refunds.amountCents}), 0)` })
    .from(refunds)
    .innerJoin(milestones, eq(milestones.id, refunds.milestoneId))
    .innerJoin(pacts, eq(pacts.id, milestones.pactId))
    .where(and(pactScope, isNull(refunds.paypalRefundId)));
  const [heldRow] = await db
    .select({ cents: sql<number>`coalesce(sum(${milestones.amountCents}), 0)`, n: sql<number>`count(*)` })
    .from(milestones)
    .innerJoin(pacts, eq(pacts.id, milestones.pactId))
    .where(and(pactScope, inArray(milestones.status, HOLDING_FUNDS)));

  const escrowLiabilityCents = -balancesRaw.escrow_liability;
  const heldMilestonesCents = Number(heldRow?.cents ?? 0);
  const pendingPayoutsCents = Number(pendingPayoutRow?.cents ?? 0);
  const pendingRefundsCents = Number(pendingRefundRow?.cents ?? 0);
  const expectedEscrowCents = heldMilestonesCents + pendingPayoutsCents + pendingRefundsCents;
  const totalCents = Number(txnCountRow[0]?.total ?? 0);
  const unbalancedTxns = unbalanced.map((u) => ({ txnId: u.txnId, offBy: Number(u.offBy) }));
  const checks = [
    { label: "Debits equal credits", ok: totalCents === 0, detail: totalCents === 0 ? "Every ledger line nets to $0.00" : `Ledger is off by ${totalCents} cents` },
    {
      label: "Every transaction balances",
      ok: unbalancedTxns.length === 0,
      detail: unbalancedTxns.length === 0 ? `${Number(txnCountRow[0]?.n ?? 0)} journals, each sums to zero` : `${unbalancedTxns.length} unbalanced journal(s)`,
    },
    {
      label: "Escrow liability matches milestones",
      ok: escrowLiabilityCents === expectedEscrowCents,
      detail: `Liability ${cents(escrowLiabilityCents)} vs ${cents(heldMilestonesCents)} in ${Number(heldRow?.n ?? 0)} held milestone(s)${
        pendingPayoutsCents ? ` + ${cents(pendingPayoutsCents)} payouts awaiting PayPal` : ""
      }${pendingRefundsCents ? ` + ${cents(pendingRefundsCents)} refunds awaiting PayPal` : ""}`,
    },
  ];

  const captured = paymentRows.filter(({ p }) => p.capturedAt);
  const postedPayouts = payoutRows.filter(({ p }) => p.paypalBatchId);
  const postedRefunds = refundRows.filter(({ r }) => r.paypalRefundId);
  const processingCollectedCents = -balancesRaw.processing_collected;
  const processingExpenseCents = balancesRaw.processing_expense;
  const payoutFeesCents = balancesRaw.payout_expense;

  const kpis: OpsKpis = {
    escrowHeldCents: escrowLiabilityCents,
    awaitingPayPalCents: pendingPayoutsCents + pendingRefundsCents,
    gmvFundedCents: captured.reduce((s, { p }) => s + p.milestoneCents, 0),
    grossChargedCents: captured.reduce((s, { p }) => s + p.totalCents, 0),
    fundedCount: captured.length,
    releasedCents: postedPayouts.reduce((s, { p }) => s + p.amountCents, 0),
    payoutCount: postedPayouts.length,
    pendingPayoutCount: payoutRows.length - postedPayouts.length,
    refundedCents: postedRefunds.reduce((s, { r }) => s + r.amountCents, 0),
    refundCount: postedRefunds.length,
    feeRevenueCents: -balancesRaw.fee_revenue,
    processingCollectedCents,
    processingExpenseCents,
    payoutFeesCents,
    netProcessingCents: processingCollectedCents - processingExpenseCents - payoutFeesCents,
    verdictCount: verdictOut.length,
    avgLatencyMs: verdictOut.length ? Math.round(verdictOut.reduce((s, v) => s + v.latencyMs, 0) / verdictOut.length) : 0,
    injectionCount: verdictOut.filter((v) => v.injectionDetected).length,
    openDisputes: disputeOut.filter((d) => d.status !== "resolved").length,
    escalatedDisputes: disputeOut.filter((d) => d.status === "escalated").length,
  };

  return {
    scope,
    generatedAt: Date.now(),
    kpis,
    books: {
      balanced: checks.every((c) => c.ok),
      totalCents,
      txnCount: Number(txnCountRow[0]?.n ?? 0),
      unbalancedTxns,
      escrowLiabilityCents,
      heldMilestonesCents,
      heldMilestoneCount: Number(heldRow?.n ?? 0),
      pendingPayoutsCents,
      pendingRefundsCents,
      expectedEscrowCents,
      checks,
    },
    balances: (Object.keys(ACCOUNT_LABELS) as LedgerAccount[]).map((account) => ({ account, label: ACCOUNT_LABELS[account], balanceCents: balancesRaw[account] })),
    escrow,
    ledger,
    movements,
    verdicts: verdictOut,
    disputes: disputeOut,
    webhooks,
  };
}

function cents(n: number) {
  const sign = n < 0 ? "−" : "";
  return `${sign}$${(Math.abs(n) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function errorOf(raw: unknown): string | null {
  if (raw && typeof raw === "object" && "error" in raw && typeof (raw as { error: unknown }).error === "string") return (raw as { error: string }).error;
  return null;
}
