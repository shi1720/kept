import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth/session";
import {handler,readJson} from "@/lib/http";
import {rateLimit} from "@/lib/rate-limit";
import {compileDraft,draftRequest} from "@/lib/ai/draft-request";
import {jobsEnabled,queueJob} from "@/lib/ai/jobs";
export const maxDuration=300;
export const POST=handler(async req=>{
 const user=await requireUser();rateLimit(`draft:${user.id}`,30,3600000);
 const input=draftRequest.parse(await readJson(req));
 if(jobsEnabled())return NextResponse.json({jobId:await queueJob(user.id,{kind:"draft",input})},{status:202});
 return compileDraft(user.id,input);
});
