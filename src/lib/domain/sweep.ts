import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { hasOpenPayPalDispute } from "./chargebacks";
import { milestones, type User, type Verdict } from "@/lib/db/schema";
import { forbidden, invalidState } from "@/lib/errors";
import { latestVerdict, loadMilestone } from "./context";
import { openDispute } from "./disputes";
import { recordEvent } from "./events";
import { reconcileMoneyMovement, settleMilestone } from "./settlement";
import { runReview } from "./work";

/**
 * Silence may only release money on a clean, model-backed PASS: every criterion met, no
 * manipulation attempt, and a real AI provider (never the offline keyword heuristic).
 */
export function canAutoRelease(v: Verdict): boolean {
  return (
    v.overall === "pass" &&
    !v.injectionDetected &&
    v.provider !== "offline" &&
    v.criteriaResults.length > 0 &&
    v.criteriaResults.every((r) => r.result === "met" && r.confidence >= 0.8 && Boolean(r.evidence.trim()))
  );
}

export interface SweepReport {
  autoReleased: string[];
  autoDisputed: string[];
  reviewsRetried: string[];
  errors: { id: string; error: string }[];
}

/**
 * The anti-ghosting engine. Runs on a schedule (Render cron → /api/cron/sweep)
 * and opportunistically in-process.
 *
 * - Review window elapsed + passing verdict + no manipulation → release.
 *   A client who goes silent can no longer hold a freelancer's money hostage.
 * - Review window elapsed + failing/partial verdict → open AI mediation
 *   instead of paying out. Silence defaults to the evidence, not to either side.
 * - Submissions stuck without a verdict (crashed review) → re-run the referee.
 * - Failed or in-flight PayPal payouts/refunds → retry / refresh status.
 */
export async function sweep(now = new Date()): Promise<SweepReport> {
  const report: SweepReport = { autoReleased: [], autoDisputed: [], reviewsRetried: [], errors: [] };

  const expired = await db
    .select()
    .from(milestones)
    .where(and(eq(milestones.status, "in_review"), lt(milestones.reviewDeadlineAt, now)));
  for (const m of expired) {
    try {
      if (await hasOpenPayPalDispute(m.id)) continue; // frozen while PayPal reviews a payer dispute
      const verdict = await latestVerdict(m.id);
      if (verdict && canAutoRelease(verdict)) {
        await settleMilestone(m.id, 100, {
          from: ["in_review"],
          actorKind: "system",
          reason: `review window elapsed with no response; AI referee verdict PASS (${verdict.score}/100)`,
        });
        report.autoReleased.push(m.id);
      } else {
        await openDispute(null, m.id, "Review window elapsed without client action and the referee did not verify every criterion.");
        report.autoDisputed.push(m.id);
      }
    } catch (err) {
      report.errors.push({ id: m.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const stuckBefore = new Date(now.getTime() - 3 * 60_000);
  const stuck = await db
    .select()
    .from(milestones)
    .where(and(eq(milestones.status, "submitted"), lt(milestones.submittedAt, stuckBefore)));
  for (const m of stuck) {
    try {
      await runReview(m.id);
      report.reviewsRetried.push(m.id);
    } catch (err) {
      report.errors.push({ id: m.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  try {
    await reconcileMoneyMovement();
  } catch (err) {
    report.errors.push({ id: "reconcile", error: err instanceof Error ? err.message : String(err) });
  }
  return report;
}

/**
 * Demo/admin control: end a milestone's review window now so judges can watch
 * auto-release happen without waiting 72 hours. Restricted to demo
 * workspaces and admins.
 */
export async function fastForwardReview(user: User, milestoneId: string) {
  const { milestone, pact } = await loadMilestone(milestoneId);
  const allowed = user.role === "admin" || (pact.demoWorkspace && pact.demoWorkspace === user.demoWorkspace);
  if (!allowed) throw forbidden("Time travel is only available in demo workspaces");
  if (milestone.status !== "in_review") throw invalidState("Only milestones in client review can be fast-forwarded");
  await db.update(milestones).set({ reviewDeadlineAt: new Date(Date.now() - 1000) }).where(eq(milestones.id, milestoneId));
  await recordEvent(db, {
    pactId: pact.id,
    milestoneId,
    actorId: user.id,
    actorKind: "system",
    type: "demo.fast_forward",
    message: `⏩ Demo: skipped ahead ${pact.terms.reviewWindowHours} hours; the client never responded`,
  });
  return sweep();
}
