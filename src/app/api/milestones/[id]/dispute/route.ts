import {NextResponse} from "next/server";
import {jobsEnabled,queueJob} from "@/lib/ai/jobs";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { openDispute } from "@/lib/domain/disputes";
import { handler, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;
const body = z.object({ reason: z.string().max(4000) });

export const POST = handler<{ id: string }>(async (req, { id }) => {
  rateLimit(`mediate:${(await requireUser()).id}`, 30, 3_600_000);
  const { reason } = body.parse(await readJson(req));
  const user=await requireUser();
  const dispute=await openDispute(user,id,reason,jobsEnabled());
  if(jobsEnabled())return NextResponse.json({jobId:await queueJob(user.id,{kind:"mediate",input:{disputeId:dispute.id,revision:dispute.revision}})},{status:202});
  return {dispute};
});
