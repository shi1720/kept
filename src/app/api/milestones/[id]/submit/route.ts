import {jobsEnabled,queueJob} from "@/lib/ai/jobs";
import { after } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { runReview, submitWork } from "@/lib/domain/work";
import { handler, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 300;

/** Freelancer submits deliverables; the AI referee runs right after the response is sent. */
export const POST = handler<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  rateLimit(`review:${user.id}`, 40, 3_600_000);
  const res = await submitWork(user, id, await readJson(req));
  if(jobsEnabled())await queueJob(user.id,{kind:"review",input:{milestoneId:id,submissionId:res.submissionId}});
  else after(async () => {
    try {
      await runReview(id);
    } catch (err) {
      console.error("[review] failed, the sweeper will retry", err);
    }
  });
  return res;
});
