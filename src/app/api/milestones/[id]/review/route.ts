import {NextResponse} from "next/server";
import {jobsEnabled,queueJob} from "@/lib/ai/jobs";
import { requireUser } from "@/lib/auth/session";
import { assertParty, loadMilestone } from "@/lib/domain/context";
import { runReview } from "@/lib/domain/work";
import { handler } from "@/lib/http";

export const maxDuration = 300;

/** Run (or re-run, if stuck) the referee synchronously. Used by agents and as a UI fallback. */
export const POST = handler<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  const { pact } = await loadMilestone(id);
  assertParty(user, pact);
  if(jobsEnabled())return NextResponse.json({jobId:await queueJob(user.id,{kind:"review",input:{milestoneId:id}})},{status:202});
  const verdictId = await runReview(id);
  return { verdictId };
});
