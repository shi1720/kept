import { feedbackInput, assessFeedback } from "@/lib/ai/feedback";
import { jobsEnabled, queueJob } from "@/lib/ai/jobs";
import { requireUser } from "@/lib/auth/session";
import { assertParty, loadMilestone } from "@/lib/domain/context";
import { handler, readJson } from "@/lib/http";
import { invalidState } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
export const maxDuration = 300;
export const POST = handler<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  const { pact, milestone } = await loadMilestone(id);
  assertParty(user, pact, "client");
  if (
    milestone.status !== "in_review" ||
    milestone.revisionsUsed >= pact.terms.revisionsIncluded
  )
    throw invalidState("This delivery has no revision available.");
  rateLimit(`feedback:${user.id}`, 40, 3600000);
  const input = feedbackInput.parse({
    ...((await readJson(req)) as object),
    milestoneId: id,
  });
  if (jobsEnabled() && !input.manual)
    return Response.json(
      { jobId: await queueJob(user.id, { kind: "feedback", input }) },
      { status: 202 },
    );
  return assessFeedback(user, input);
});
