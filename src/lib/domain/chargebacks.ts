import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { events, payments, submissions, type PayPalDisputeInfo } from "@/lib/db/schema";
import { toCents, formatMoney } from "@/lib/money";
import { gatewayFor } from "@/lib/paypal";
import { latestVerdict, loadMilestone, loadUser } from "./context";
import { notify, recordEvent } from "./events";

/**
 * Chargeback shield. If a client bypasses Kept and files a dispute with
 * PayPal directly, Kept (1) freezes any automatic release on that milestone,
 * (2) assembles a factual dossier from the signed pact, the delivery record,
 * the referee's verdict and the audit trail, and (3) submits it to PayPal's
 * Disputes API as seller evidence.
 */
export interface PayPalDisputeResource {
  dispute_id: string;
  reason?: string;
  status?: string;
  dispute_life_cycle_stage?: string;
  dispute_amount?: { value: string; currency_code: string };
  dispute_outcome?: { outcome_code?: string };
  disputed_transactions?: { seller_transaction_id?: string }[];
}

export const OPEN_PAYPAL_DISPUTE = (d: PayPalDisputeInfo | null | undefined) => Boolean(d && d.status !== "RESOLVED");

export async function buildEvidenceDossier(milestoneId: string): Promise<string> {
  const { milestone, pact, criteria } = await loadMilestone(milestoneId);
  const [client, freelancer] = await Promise.all([loadUser(pact.clientId), loadUser(pact.freelancerId)]);
  const verdict = await latestVerdict(milestoneId);
  const subs = await db.select().from(submissions).where(eq(submissions.milestoneId, milestoneId)).orderBy(desc(submissions.version));
  const trail = await db
    .select()
    .from(events)
    .where(and(eq(events.pactId, pact.id), inArray(events.type, ["pact.signed", "pact.activated", "milestone.funded", "work.submitted", "review.completed", "milestone.released", "milestone.settled", "dispute.accepted"])))
    .orderBy(events.createdAt);
  const met = verdict?.criteriaResults.filter((r) => r.result === "met").length ?? 0;
  const lines = [
    `Escrowed service agreement on Kept (${pact.id}): "${pact.title}" between ${client?.name ?? "client"} (payer) and ${freelancer?.name ?? "freelancer"}.`,
    `Both parties signed the written acceptance criteria before payment (client ${pact.clientSignedAt?.toISOString().slice(0, 10) ?? "?"}, freelancer ${pact.freelancerSignedAt?.toISOString().slice(0, 10) ?? "?"}).`,
    `Milestone "${milestone.title}" (${formatMoney(milestone.amountCents, pact.currency)}). Criteria: ${criteria.map((c, i) => `${i + 1}) ${c.text}`).join(" ")}`,
    subs.length ? `Work delivered ${subs.length} time(s); latest on ${subs[0].createdAt.toISOString().slice(0, 10)}.` : "No delivery recorded.",
    verdict ? `Independent AI referee verdict: ${verdict.overall.toUpperCase()} ${verdict.score}/100, ${met}/${verdict.criteriaResults.length} criteria met. ${verdict.summary}` : "",
    `Audit trail: ${trail.map((e) => `${e.createdAt.toISOString().slice(0, 16).replace("T", " ")} ${e.message}`).join(" | ")}`,
  ];
  return lines.filter(Boolean).join("\n").slice(0, 2000);
}

export async function onPayPalDispute(resource: PayPalDisputeResource, eventType: string, opts: { simulated?: boolean } = {}) {
  const captureIds = (resource.disputed_transactions ?? []).map((t) => t.seller_transaction_id).filter((x): x is string => Boolean(x));
  if (!captureIds.length) return { matched: false };
  const [payment] = await db.select().from(payments).where(inArray(payments.paypalCaptureId, captureIds)).limit(1);
  if (!payment) return { matched: false };
  const { milestone, pact } = await loadMilestone(payment.milestoneId);

  const prev = payment.paypalDispute;
  const info: PayPalDisputeInfo = {
    id: resource.dispute_id,
    reason: resource.reason ?? prev?.reason ?? "OTHER",
    status: eventType.endsWith("RESOLVED") ? "RESOLVED" : (resource.status ?? prev?.status ?? "OPEN"),
    stage: resource.dispute_life_cycle_stage ?? prev?.stage ?? null,
    amountCents: resource.dispute_amount ? toCents(resource.dispute_amount.value) : (prev?.amountCents ?? null),
    openedAt: prev?.openedAt ?? new Date().toISOString(),
    evidenceSubmittedAt: prev?.evidenceSubmittedAt ?? null,
    outcome: resource.dispute_outcome?.outcome_code ?? prev?.outcome ?? null,
    simulated: opts.simulated ?? prev?.simulated ?? false,
  };

  if (!prev) {
    await recordEvent(db, {
      pactId: pact.id,
      milestoneId: milestone.id,
      actorKind: "paypal",
      type: "paypal.dispute_opened",
      message: `The payer opened a PayPal dispute (${info.reason.replace(/_/g, " ").toLowerCase()}). Automatic release is frozen and Kept is preparing evidence from the signed pact.`,
      data: { disputeId: info.id },
    });
    await notify(db, [pact.clientId, pact.freelancerId], {
      pactId: pact.id,
      title: "PayPal dispute opened",
      body: `A dispute was filed with PayPal on “${milestone.title}”. Kept froze automatic release and is submitting the pact as evidence.`,
    });
  }

  // Submit evidence once, as soon as PayPal is waiting on the seller (or immediately for new disputes).
  const shouldSubmit = !info.evidenceSubmittedAt && info.status !== "RESOLVED" && info.status !== "WAITING_FOR_BUYER_RESPONSE";
  if (shouldSubmit) {
    try {
      const notes = await buildEvidenceDossier(milestone.id);
      await gatewayFor({ simulated: payment.simulated || Boolean(opts.simulated) }).provideDisputeEvidence(info.id, notes);
      info.evidenceSubmittedAt = new Date().toISOString();
      info.evidenceError = null;
      await recordEvent(db, {
        pactId: pact.id,
        milestoneId: milestone.id,
        actorKind: "system",
        type: "paypal.evidence_submitted",
        message: "Kept submitted the signed criteria, delivery record, referee verdict and audit trail to PayPal as seller evidence",
        data: { disputeId: info.id },
      });
    } catch (err) {
      info.evidenceError = err instanceof Error ? err.message : String(err);
    }
  }

  if (info.status === "RESOLVED" && prev?.status !== "RESOLVED") {
    await recordEvent(db, {
      pactId: pact.id,
      milestoneId: milestone.id,
      actorKind: "paypal",
      type: "paypal.dispute_resolved",
      message: `PayPal resolved the dispute${info.outcome ? `: ${info.outcome.replace(/_/g, " ").toLowerCase()}` : ""}`,
    });
  }

  await db.update(payments).set({ paypalDispute: info }).where(eq(payments.id, payment.id));
  return { matched: true, info };
}

/** Demo-only: feed a realistic PayPal dispute for this milestone through the real handler. */
export async function simulatePayPalDispute(milestoneId: string) {
  const [payment] = await db.select().from(payments).where(and(eq(payments.milestoneId, milestoneId), inArray(payments.status, ["completed", "partially_refunded"]))).limit(1);
  if (!payment?.paypalCaptureId) throw new Error("This milestone has no captured PayPal payment to dispute");
  return onPayPalDispute(
    {
      dispute_id: `PP-D-SIM-${Date.now().toString(36).toUpperCase()}`,
      reason: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED",
      status: "WAITING_FOR_SELLER_RESPONSE",
      dispute_life_cycle_stage: "INQUIRY",
      dispute_amount: { value: (payment.totalCents / 100).toFixed(2), currency_code: "USD" },
      disputed_transactions: [{ seller_transaction_id: payment.paypalCaptureId }],
    },
    "CUSTOMER.DISPUTE.CREATED",
    { simulated: true },
  );
}
