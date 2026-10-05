import { createHash } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { runReferee } from "@/lib/ai/referee";
import { db } from "@/lib/db/client";
import { artifacts, submissions, verdicts, type User } from "@/lib/db/schema";
import { badRequest, invalidState } from "@/lib/errors";
import { gatherEvidence } from "@/lib/evidence";
import { newId } from "@/lib/ids";
import { assertParty, casMilestone, latestVerdict, loadMilestone } from "./context";
import { notify, recordEvent } from "./events";
import { refreshPactStatus } from "./pacts";
import { settleMilestone } from "./settlement";
import { assertTransition } from "./state";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

export const submissionInput = z.object({
  note: z.string().max(4000).default(""),
  items: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("text"), name: z.string().max(200).default("Written deliverable"), content: z.string().min(1).max(200_000) }),
        z.object({ kind: z.literal("url"), url: z.url() }),
        z.object({ kind: z.literal("github"), url: z.string().min(3).max(300) }),
        z.object({
          kind: z.literal("file"),
          name: z.string().min(1).max(200),
          mime: z.string().max(120),
          base64: z.string().min(1),
        }),
      ]),
    )
    .min(1, "Add at least one deliverable")
    .max(20),
});
export type SubmissionInput = z.infer<typeof submissionInput>;

/** Freelancer submits work; the referee starts automatically. */
export async function submitWork(user: User, milestoneId: string, raw: unknown) {
  const input = submissionInput.parse(raw);
  const { milestone, pact } = await loadMilestone(milestoneId);
  assertParty(user, pact, "freelancer");
  assertTransition(milestone.status, "submit");

  let total = 0;
  const files = input.items.map((item) => {
    if (item.kind !== "file") return null;
    const buf = Buffer.from(item.base64, "base64");
    if (buf.byteLength > MAX_FILE_BYTES) throw badRequest(`${item.name} is larger than 8 MB`);
    total += buf.byteLength;
    return buf;
  });
  if (total > MAX_TOTAL_BYTES) throw badRequest("Submissions are limited to 20 MB in total");

  const [{ count }] = await db
    .select({ count: submissions.version })
    .from(submissions)
    .where(eq(submissions.milestoneId, milestoneId))
    .orderBy(desc(submissions.version))
    .limit(1)
    .then((r) => (r.length ? r : [{ count: 0 }]));

  const submissionId = newId("sub");
  await db.transaction(async (tx) => {
    await casMilestone(tx, milestoneId, ["funded"], { status: "submitted", submittedAt: new Date() });
    await tx.insert(submissions).values({ id: submissionId, milestoneId, version: count + 1, note: input.note, createdById: user.id });
    await tx.insert(artifacts).values(
      input.items.map((item, i) => {
        const base = { id: newId("art"), submissionId };
        switch (item.kind) {
          case "text":
            return { ...base, kind: "text" as const, name: item.name, mime: "text/plain", content: item.content, sizeBytes: item.content.length };
          case "url":
            return { ...base, kind: "url" as const, name: item.url, content: item.url };
          case "github":
            return { ...base, kind: "github" as const, name: item.url, content: item.url };
          case "file": {
            const buf = files[i]!;
            return {
              ...base,
              kind: "file" as const,
              name: item.name,
              mime: item.mime || "application/octet-stream",
              data: buf,
              sizeBytes: buf.byteLength,
              sha256: createHash("sha256").update(buf).digest("hex"),
            };
          }
        }
      }),
    );
    await recordEvent(tx, {
      pactId: pact.id,
      milestoneId,
      actorId: user.id,
      actorKind: "user",
      type: "work.submitted",
      message: `${user.name} submitted version ${count + 1} with ${input.items.length} deliverable${input.items.length === 1 ? "" : "s"}. The AI referee is reviewing it.`,
    });
  });
  return { submissionId };
}

/**
 * Gather evidence, run the referee and open the client's review window.
 * Safe to call repeatedly: it only acts on milestones still in `submitted`.
 */
export async function runReview(milestoneId: string) {
  const { milestone, pact, criteria } = await loadMilestone(milestoneId);
  if (milestone.status !== "submitted") return null;
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.milestoneId, milestoneId))
    .orderBy(desc(submissions.version))
    .limit(1);
  if (!submission) throw invalidState("Nothing has been submitted yet");
  const arts = await db.select().from(artifacts).where(eq(artifacts.submissionId, submission.id)).orderBy(asc(artifacts.createdAt));

  const started = Date.now();
  const pack = await gatherEvidence(arts, criteria);
  const result = await runReferee({ pact, milestone, criteria, pack, submissionNote: submission.note, userId: submission.createdById });
  const latencyMs = Date.now() - started;

  const verdictId = newId("vrd");
  const reviewDeadlineAt = new Date(Date.now() + pact.terms.reviewWindowHours * 3_600_000);
  await db.transaction(async (tx) => {
    await casMilestone(tx, milestoneId, ["submitted"], { status: "in_review", reviewDeadlineAt });
    await tx.insert(verdicts).values({
      id: verdictId,
      milestoneId,
      submissionId: submission.id,
      provider: result.provider,
      model: result.model,
      overall: result.overall,
      score: result.score,
      recommendedReleasePct: result.recommendedReleasePct,
      summary: result.summary,
      notesForClient: result.notesForClient,
      notesForFreelancer: result.notesForFreelancer,
      criteriaResults: result.criteriaResults,
      evidence: pack.facts,
      injectionDetected: result.injectionDetected,
      latencyMs,
    });
    const met = result.criteriaResults.filter((r) => r.result === "met").length;
    await recordEvent(tx, {
      pactId: pact.id,
      milestoneId,
      actorKind: "ai",
      type: "review.completed",
      message: `AI referee: ${result.overall.toUpperCase()}; ${met}/${result.criteriaResults.length} criteria met, score ${result.score}/100${result.injectionDetected ? " · ⚠ manipulation attempt detected" : ""}`,
      data: { verdictId, provider: result.provider, model: result.model, degraded: result.degraded, latencyMs },
    });
    await notify(tx, [pact.clientId], {
      pactId: pact.id,
      title: "Work ready for your review",
      body: `“${milestone.title}” scored ${result.score}/100 with the AI referee. You have ${pact.terms.reviewWindowHours}h to approve, request a revision or raise an issue; after that, passing work is released automatically.`,
    });
    await notify(tx, [pact.freelancerId], {
      pactId: pact.id,
      title: `Referee verdict: ${result.overall}`,
      body: result.summary,
    });
  });
  return verdictId;
}

/** Client accepts the work: 100% is released via PayPal Payouts. */
export async function approveMilestone(user: User, milestoneId: string) {
  const { milestone, pact } = await loadMilestone(milestoneId);
  assertParty(user, pact, "client");
  assertTransition(milestone.status, "approve");
  await settleMilestone(milestoneId, 100, {
    from: ["in_review", "submitted"],
    actorId: user.id,
    actorKind: "user",
    reason: `approved by ${user.name}`,
  });
}

export async function requestRevision(user: User, milestoneId: string, note: string) {
  const { milestone, pact } = await loadMilestone(milestoneId);
  assertParty(user, pact, "client");
  assertTransition(milestone.status, "request_revision");
  if (milestone.revisionsUsed >= pact.terms.revisionsIncluded) {
    throw invalidState(`All ${pact.terms.revisionsIncluded} included revisions have been used; approve, or raise an issue for mediation`);
  }
  if (note.trim().length < 5) throw badRequest("Tell the freelancer what to change");
  await db.transaction(async (tx) => {
    await casMilestone(tx, milestoneId, ["in_review"], {
      status: "funded",
      revisionsUsed: milestone.revisionsUsed + 1,
      reviewDeadlineAt: null,
    });
    await recordEvent(tx, {
      pactId: pact.id,
      milestoneId,
      actorId: user.id,
      actorKind: "user",
      type: "revision.requested",
      message: `${user.name} requested revision ${milestone.revisionsUsed + 1} of ${pact.terms.revisionsIncluded}: “${note.trim().slice(0, 280)}”`,
      data: { note },
    });
    await notify(tx, [pact.freelancerId], { pactId: pact.id, title: "Revision requested", body: note.trim().slice(0, 280) });
  });
  await refreshPactStatus(pact.id);
}

/** Freelancer voluntarily refunds the client in full (e.g. can't complete the work). */
export async function refundByFreelancer(user: User, milestoneId: string, reason: string) {
  const { milestone, pact } = await loadMilestone(milestoneId);
  assertParty(user, pact, "freelancer");
  assertTransition(milestone.status, "refund");
  await settleMilestone(milestoneId, 0, {
    from: ["funded", "submitted", "in_review", "disputed"],
    actorId: user.id,
    actorKind: "user",
    reason: reason.trim() || `refunded by ${user.name}`,
  });
}

export async function getVerdictForMilestone(milestoneId: string) {
  return latestVerdict(milestoneId);
}
