import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  artifacts,
  criteria,
  disputes,
  events,
  milestones,
  pacts,
  payments,
  payouts,
  refunds,
  submissions,
  verdicts,
  type Pact,
  type User,
} from "@/lib/db/schema";
import { forbidden } from "@/lib/errors";
import { loadPact, loadUser, roleOf } from "./context";
import { listPactsForUser } from "./pacts";

export type PublicUser = Pick<User, "id" | "name" | "handle" | "headline" | "avatarHue" | "paypalVerified">;

export const publicUser = (u: User | null): PublicUser | null =>
  u ? { id: u.id, name: u.name, handle: u.handle, headline: u.headline, avatarHue: u.avatarHue, paypalVerified: u.paypalVerified } : null;

/** Everything the pact room needs, in one round trip, scoped to what this viewer may see. */
export async function getPactDetail(viewer: User | null, pactId: string, opts: { inviteToken?: string } = {}) {
  const pact = await loadPact(pactId);
  const role = viewer ? roleOf(viewer, pact) : null;
  const isCreator = viewer?.id === pact.creatorId;
  const viaInvite = opts.inviteToken && opts.inviteToken === pact.inviteToken;
  if (!role && !isCreator && viewer?.role !== "admin" && !viaInvite) throw forbidden();

  const ms = await db.select().from(milestones).where(eq(milestones.pactId, pactId)).orderBy(asc(milestones.position));
  const ids = ms.map((m) => m.id);
  const none = ids.length === 0;
  const [crit, subs, verds, disps, pays, pyos, rfds, evts, client, freelancer] = await Promise.all([
    none ? [] : db.select().from(criteria).where(inArray(criteria.milestoneId, ids)).orderBy(asc(criteria.position)),
    none ? [] : db.select().from(submissions).where(inArray(submissions.milestoneId, ids)).orderBy(desc(submissions.version)),
    none ? [] : db.select().from(verdicts).where(inArray(verdicts.milestoneId, ids)).orderBy(desc(verdicts.createdAt)),
    none ? [] : db.select().from(disputes).where(inArray(disputes.milestoneId, ids)).orderBy(desc(disputes.createdAt)),
    none ? [] : db.select().from(payments).where(inArray(payments.milestoneId, ids)).orderBy(desc(payments.createdAt)),
    none ? [] : db.select().from(payouts).where(inArray(payouts.milestoneId, ids)),
    none ? [] : db.select().from(refunds).where(inArray(refunds.milestoneId, ids)),
    db.select().from(events).where(eq(events.pactId, pactId)).orderBy(desc(events.createdAt)).limit(200),
    loadUser(pact.clientId),
    loadUser(pact.freelancerId),
  ]);
  const subIds = subs.map((s) => s.id);
  const arts = subIds.length
    ? await db
        .select({
          id: artifacts.id,
          submissionId: artifacts.submissionId,
          kind: artifacts.kind,
          name: artifacts.name,
          mime: artifacts.mime,
          sizeBytes: artifacts.sizeBytes,
          content: artifacts.content,
          sha256: artifacts.sha256,
        })
        .from(artifacts)
        .where(inArray(artifacts.submissionId, subIds))
    : [];

  const milestonesOut = ms.map((m) => {
    const mSubs = subs.filter((s) => s.milestoneId === m.id);
    return {
      ...m,
      criteria: crit.filter((c) => c.milestoneId === m.id),
      submissions: mSubs.map((s) => ({
        ...s,
        artifacts: arts
          .filter((a) => a.submissionId === s.id)
          .map((a) => ({ ...a, content: a.kind === "text" ? (a.content ?? "").slice(0, 20_000) : a.content })),
      })),
      verdicts: verds.filter((v) => v.milestoneId === m.id),
      dispute: disps.find((d) => d.milestoneId === m.id) ?? null,
      payment: pays.find((p) => p.milestoneId === m.id && p.status !== "created") ?? null,
      payout: pyos.find((p) => p.milestoneId === m.id) ?? null,
      refund: rfds.find((r) => r.milestoneId === m.id) ?? null,
    };
  });

  return {
    pact: redactPact(pact, Boolean(role || isCreator || viewer?.role === "admin")),
    role: role ?? (isCreator ? pact.creatorRole : null),
    isCreator,
    client: publicUser(client),
    freelancer: publicUser(freelancer),
    milestones: milestonesOut,
    events: evts,
    totals: {
      amountCents: ms.reduce((s, m) => s + m.amountCents, 0),
      heldCents: ms.filter((m) => ["funded", "submitted", "in_review", "disputed"].includes(m.status)).reduce((s, m) => s + m.amountCents, 0),
      releasedCents: pyos.reduce((s, p) => s + p.amountCents, 0),
      refundedCents: rfds.reduce((s, r) => s + r.amountCents, 0),
    },
  };
}

function redactPact(pact: Pact, full: boolean) {
  return full ? pact : { ...pact, inviteToken: "", sourceText: null };
}

export type PactDetail = Awaited<ReturnType<typeof getPactDetail>>;

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export interface ActionItem {
  pactId: string;
  pactTitle: string;
  milestoneId?: string;
  label: string;
  detail: string;
  tone: "jade" | "amber" | "rose" | "sky" | "ember";
  cta: string;
  href: string;
}

export async function getDashboard(user: User) {
  const list = await listPactsForUser(user);
  const invites = await db
    .select()
    .from(pacts)
    .where(and(eq(pacts.status, "pending_acceptance"), eq(pacts.counterpartyEmail, user.email)));

  const allMs = list.flatMap((p) => p.milestones.map((m) => ({ ...m, pact: p })));
  const msIds = allMs.map((m) => m.id);
  const openDisputes = msIds.length ? await db.select().from(disputes).where(inArray(disputes.milestoneId, msIds)) : [];
  const verdictRows = msIds.length
    ? await db.select({ milestoneId: verdicts.milestoneId, score: verdicts.score, overall: verdicts.overall, createdAt: verdicts.createdAt }).from(verdicts).where(inArray(verdicts.milestoneId, msIds)).orderBy(desc(verdicts.createdAt))
    : [];

  const actions: ActionItem[] = [];
  for (const p of invites) {
    actions.push({ pactId: p.id, pactTitle: p.title, label: "Countersign", detail: `You've been invited as ${p.creatorRole === "client" ? "freelancer" : "client"}`, tone: "ember", cta: "Review & sign", href: `/invite/${p.inviteToken}` });
  }
  for (const m of allMs) {
    const role = m.pact.role;
    const base = { pactId: m.pact.id, pactTitle: m.pact.title, milestoneId: m.id, href: `/app/pacts/${m.pact.id}#${m.id}` };
    const d = openDisputes.find((x) => x.milestoneId === m.id && x.status !== "resolved");
    const v = verdictRows.find((x) => x.milestoneId === m.id);
    if (role === "client" && m.status === "awaiting_funding") actions.push({ ...base, label: "Fund milestone", detail: m.title, tone: "amber", cta: "Fund with PayPal" });
    if (role === "client" && m.status === "in_review") actions.push({ ...base, label: "Review delivered work", detail: `${m.title}${v ? ` · referee ${v.score}/100` : ""}`, tone: "sky", cta: "Review" });
    if (role === "freelancer" && m.status === "funded") actions.push({ ...base, label: "Deliver work", detail: `${m.title} · money is secured in escrow`, tone: "jade", cta: "Submit" });
    if (m.status === "disputed" && d) {
      const accepted = role === "client" ? d.clientAcceptedAt : d.freelancerAcceptedAt;
      if (!accepted && d.status === "ruling_proposed") actions.push({ ...base, label: "Settlement proposed", detail: `${m.title} · AI mediator suggests ${d.ruling?.releasePct}% / ${100 - (d.ruling?.releasePct ?? 0)}%`, tone: "rose", cta: "Respond" });
    }
  }
  for (const p of list) {
    if (p.status === "draft" && p.creatorId === user.id) actions.push({ pactId: p.id, pactTitle: p.title, label: "Finish your draft", detail: "Review the terms and send it for signature", tone: "sky", cta: "Open", href: `/app/pacts/${p.id}` });
  }

  const held = allMs.filter((m) => ["funded", "submitted", "in_review", "disputed"].includes(m.status));
  const myPayouts = msIds.length ? await db.select().from(payouts).where(inArray(payouts.milestoneId, msIds)) : [];
  const myRefunds = msIds.length ? await db.select().from(refunds).where(inArray(refunds.milestoneId, msIds)) : [];
  const asFreelancer = new Set(allMs.filter((m) => m.pact.role === "freelancer").map((m) => m.id));
  const asClient = new Set(allMs.filter((m) => m.pact.role === "client").map((m) => m.id));

  const recentEvents = list.length
    ? await db.select().from(events).where(inArray(events.pactId, list.map((p) => p.id))).orderBy(desc(events.createdAt)).limit(14)
    : [];

  return {
    pacts: list.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      role: p.role,
      counterparty: p.counterpartyName ?? p.counterpartyEmail ?? "—",
      creatorId: p.creatorId,
      amountCents: p.milestones.reduce((s, m) => s + m.amountCents, 0),
      heldCents: p.milestones.filter((m) => ["funded", "submitted", "in_review", "disputed"].includes(m.status)).reduce((s, m) => s + m.amountCents, 0),
      done: p.milestones.filter((m) => ["released", "settled", "refunded", "cancelled"].includes(m.status)).length,
      total: p.milestones.length,
      next: p.milestones.find((m) => !["released", "settled", "refunded", "cancelled"].includes(m.status))?.status ?? null,
      updatedAt: p.updatedAt.toISOString(),
      createdVia: p.createdVia,
    })),
    actions,
    stats: {
      heldCents: held.reduce((s, m) => s + m.amountCents, 0),
      earnedCents: myPayouts.filter((p) => asFreelancer.has(p.milestoneId)).reduce((s, p) => s + p.amountCents, 0),
      paidCents: myPayouts.filter((p) => asClient.has(p.milestoneId)).reduce((s, p) => s + p.amountCents, 0),
      refundedCents: myRefunds.filter((r) => asClient.has(r.milestoneId)).reduce((s, r) => s + r.amountCents, 0),
      active: list.filter((p) => p.status === "active").length,
      completed: list.filter((p) => p.status === "completed").length,
    },
    events: recentEvents,
    pactTitles: Object.fromEntries(list.map((p) => [p.id, p.title])),
  };
}

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
