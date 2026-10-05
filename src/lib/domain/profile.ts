import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ensureMigrated } from "@/lib/db/migrate";
import { disputes, milestones, pacts, payouts, users, verdicts, type Milestone, type MilestoneStatus } from "@/lib/db/schema";

/**
 * Public track record ("/u/<handle>"). Everything here is safe to show
 * logged-out: pact titles, amounts, outcomes, dates and counterpart *first
 * names* only. No emails, deliverables, statements or chat sources.
 */

export type ProfileRole = "client" | "freelancer";

export type RecordOutcome = "paid_in_full" | "settled" | "refunded" | "in_progress";

export interface TrackRecordItem {
  id: string;
  title: string;
  role: ProfileRole;
  counterpart: string | null;
  currency: string;
  amountCents: number;
  releasedCents: number;
  outcome: RecordOutcome;
  /** Weighted share released to the freelancer across resolved milestones. */
  releasedPct: number | null;
  milestonesKept: number;
  milestonesTotal: number;
  score: number | null;
  date: Date;
}

export interface DisputeSummary {
  pactTitle: string;
  status: "open" | "ruling_proposed" | "escalated" | "resolved";
  resolution: string;
  date: Date;
}

export interface PublicProfile {
  user: {
    name: string;
    handle: string;
    headline: string | null;
    avatarHue: number;
    paypalVerified: boolean;
    memberSince: Date;
  };
  primaryRole: ProfileRole;
  stats: {
    pactsCompleted: number;
    pactsActive: number;
    milestonesKept: number;
    /** Paid out to this person as freelancer. */
    releasedCents: number;
    /** Paid out by this person, as client, to freelancers. */
    paidCents: number;
    milestonesFunded: number;
    onTimeRate: number | null;
    onTimeSample: number;
    avgScore: number | null;
    scoredCount: number;
    disputes: { total: number; resolved: number; open: number };
  };
  disputes: DisputeSummary[];
  record: TrackRecordItem[];
}

const DELIVERED: MilestoneStatus[] = ["released", "settled"];
const RESOLVED: MilestoneStatus[] = ["released", "settled", "refunded"];
const FUNDED_EVER: MilestoneStatus[] = ["funded", "submitted", "in_review", "disputed", "released", "settled", "refunded"];

const firstName = (name: string | null | undefined) => (name ? name.trim().split(/\s+/)[0] || null : null);

function releasedShare(m: Milestone): number {
  if (m.status === "released") return 100;
  if (m.status === "refunded") return 0;
  return m.releasedPct ?? 0;
}

export async function getPublicProfile(handle: string): Promise<PublicProfile | null> {
  await ensureMigrated();
  const [user] = await db.select().from(users).where(eq(users.handle, handle.toLowerCase())).limit(1);
  if (!user) return null;

  const pactRows = await db
    .select()
    .from(pacts)
    .where(and(or(eq(pacts.clientId, user.id), eq(pacts.freelancerId, user.id)), inArray(pacts.status, ["active", "completed"])))
    .orderBy(desc(pacts.updatedAt));

  const pactIds = pactRows.map((p) => p.id);
  const ms = pactIds.length ? await db.select().from(milestones).where(inArray(milestones.pactId, pactIds)) : [];
  const msIds = ms.map((m) => m.id);
  const counterpartIds = [...new Set(pactRows.map((p) => (p.clientId === user.id ? p.freelancerId : p.clientId)).filter((x): x is string => Boolean(x)))];

  const [pyos, verds, disps, others] = await Promise.all([
    msIds.length ? db.select({ milestoneId: payouts.milestoneId, amountCents: payouts.amountCents }).from(payouts).where(inArray(payouts.milestoneId, msIds)) : [],
    msIds.length
      ? db
          .select({ milestoneId: verdicts.milestoneId, score: verdicts.score, createdAt: verdicts.createdAt })
          .from(verdicts)
          .where(inArray(verdicts.milestoneId, msIds))
          .orderBy(desc(verdicts.createdAt))
      : [],
    msIds.length
      ? db
          .select({
            milestoneId: disputes.milestoneId,
            status: disputes.status,
            finalReleasePct: disputes.finalReleasePct,
            clientAcceptedAt: disputes.clientAcceptedAt,
            freelancerAcceptedAt: disputes.freelancerAcceptedAt,
            resolvedAt: disputes.resolvedAt,
            createdAt: disputes.createdAt,
          })
          .from(disputes)
          .where(inArray(disputes.milestoneId, msIds))
          .orderBy(desc(disputes.createdAt))
      : [],
    counterpartIds.length ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, counterpartIds)) : [],
  ]);

  const nameOf = new Map(others.map((o) => [o.id, o.name]));
  const pactOf = new Map(ms.map((m) => [m.id, pactRows.find((p) => p.id === m.pactId)!]));
  const roleIn = (pactId: string): ProfileRole => (pactRows.find((p) => p.id === pactId)?.freelancerId === user.id ? "freelancer" : "client");

  // Latest verdict per milestone.
  const latestScore = new Map<string, number>();
  for (const v of verds) if (!latestScore.has(v.milestoneId)) latestScore.set(v.milestoneId, v.score);

  const asFreelancer = ms.filter((m) => roleIn(m.pactId) === "freelancer");
  const asClient = ms.filter((m) => roleIn(m.pactId) === "client");
  const freelancerIds = new Set(asFreelancer.map((m) => m.id));
  const clientIds = new Set(asClient.map((m) => m.id));

  // On time ≈ delivered (or, failing that, resolved) no later than the due date.
  const timed = asFreelancer.filter((m) => DELIVERED.includes(m.status) && m.dueAt);
  const onTime = timed.filter((m) => (m.submittedAt ?? m.resolvedAt ?? m.updatedAt).getTime() <= m.dueAt!.getTime()).length;

  const scores = asFreelancer.map((m) => latestScore.get(m.id)).filter((s): s is number => typeof s === "number");

  const disputeItems: DisputeSummary[] = disps.map((d) => {
    const pact = pactOf.get(d.milestoneId);
    let resolution: string;
    if (d.status === "resolved") {
      const pct = d.finalReleasePct ?? 0;
      const how = d.clientAcceptedAt && d.freelancerAcceptedAt ? "AI mediation, accepted by both sides" : "Kept arbitration";
      resolution =
        pct >= 100 ? `Paid in full after ${how}` : pct <= 0 ? `Refunded after ${how}` : `Settled ${pct}% / ${100 - pct}% via ${how}`;
    } else if (d.status === "escalated") resolution = "With Kept arbitration";
    else if (d.status === "ruling_proposed") resolution = "AI mediator has proposed a split";
    else resolution = "In mediation";
    return { pactTitle: pact?.title ?? "Pact", status: d.status, resolution, date: d.resolvedAt ?? d.createdAt };
  });

  const record: TrackRecordItem[] = pactRows
    .map((p) => {
      const pms = ms.filter((m) => m.pactId === p.id);
      const resolved = pms.filter((m) => RESOLVED.includes(m.status));
      if (p.status !== "completed" && resolved.length === 0) return null;
      const role = roleIn(p.id);
      const counterpartId = role === "freelancer" ? p.clientId : p.freelancerId;
      const amountCents = pms.filter((m) => m.status !== "cancelled").reduce((s, m) => s + m.amountCents, 0);
      const releasedCents = pyos.filter((y) => pms.some((m) => m.id === y.milestoneId)).reduce((s, y) => s + y.amountCents, 0);
      const weight = resolved.reduce((s, m) => s + m.amountCents, 0);
      const releasedPct = weight ? Math.round(resolved.reduce((s, m) => s + m.amountCents * releasedShare(m), 0) / weight) : null;
      const outcome: RecordOutcome =
        p.status !== "completed" ? "in_progress" : releasedPct === 100 ? "paid_in_full" : releasedPct === 0 ? "refunded" : "settled";
      const pScores = pms.map((m) => latestScore.get(m.id)).filter((s): s is number => typeof s === "number");
      const dates = resolved.map((m) => m.resolvedAt?.getTime() ?? 0).filter(Boolean);
      return {
        id: p.id,
        title: p.title,
        role,
        counterpart: firstName((counterpartId && nameOf.get(counterpartId)) || p.counterpartyName),
        currency: p.currency,
        amountCents,
        releasedCents,
        outcome,
        releasedPct,
        milestonesKept: resolved.filter((m) => m.status !== "refunded").length,
        milestonesTotal: pms.filter((m) => m.status !== "cancelled").length,
        score: pScores.length ? Math.round(pScores.reduce((a, b) => a + b, 0) / pScores.length) : null,
        date: new Date(dates.length ? Math.max(...dates) : p.updatedAt.getTime()),
      } satisfies TrackRecordItem;
    })
    .filter((x): x is TrackRecordItem => x !== null)
    .sort((a, b) => Number(a.outcome === "in_progress") - Number(b.outcome === "in_progress") || b.date.getTime() - a.date.getTime());

  return {
    user: {
      name: user.name,
      handle: user.handle,
      headline: user.headline,
      avatarHue: user.avatarHue,
      paypalVerified: user.paypalVerified,
      memberSince: user.createdAt,
    },
    primaryRole: asFreelancer.length >= asClient.length ? "freelancer" : "client",
    stats: {
      pactsCompleted: pactRows.filter((p) => p.status === "completed").length,
      pactsActive: pactRows.filter((p) => p.status === "active").length,
      milestonesKept: ms.filter((m) => DELIVERED.includes(m.status)).length,
      releasedCents: pyos.filter((y) => freelancerIds.has(y.milestoneId)).reduce((s, y) => s + y.amountCents, 0),
      paidCents: pyos.filter((y) => clientIds.has(y.milestoneId)).reduce((s, y) => s + y.amountCents, 0),
      milestonesFunded: asClient.filter((m) => FUNDED_EVER.includes(m.status)).length,
      onTimeRate: timed.length ? Math.round((onTime / timed.length) * 100) : null,
      onTimeSample: timed.length,
      avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      scoredCount: scores.length,
      disputes: {
        total: disps.length,
        resolved: disps.filter((d) => d.status === "resolved").length,
        open: disps.filter((d) => d.status !== "resolved").length,
      },
    },
    disputes: disputeItems,
    record,
  };
}
