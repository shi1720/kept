import {createHmac, timingSafeEqual} from "node:crypto";
import {GoogleAuth} from "google-auth-library";
import {z} from "zod";
import {getClient} from "@/lib/db/client";
import {env} from "@/lib/env";
import {newId} from "@/lib/ids";
import {AppError} from "@/lib/errors";
import {assertParty, loadMilestone, loadUser} from "@/lib/domain/context";
import {draftRequest,compileDraft} from "./draft-request";

import {feedbackInput,assessFeedback} from "./feedback";

export const jobsEnabled=()=>Boolean(process.env.AI_TASK_QUEUE && process.env.AI_WORKER_URL);
export const jobInput=z.discriminatedUnion("kind",[
 z.object({kind:z.literal("feedback"),input:feedbackInput}),
 z.object({kind:z.literal("draft"),input:draftRequest}),
 z.object({kind:z.literal("mediate"),input:z.object({disputeId:z.string(),revision:z.number().int()})}),
 z.object({kind:z.literal("review"),input:z.object({milestoneId:z.string(),submissionId:z.string().optional()})}),
]);
type JobInput=z.infer<typeof jobInput>;
export const workerToken=()=>createHmac("sha256",env.cronSecret).update("kept-ai-worker-v1").digest("hex");
export function validWorkerToken(auth:string|null){const a=Buffer.from(auth??""),b=Buffer.from(`Bearer ${workerToken()}`);return a.length===b.length&&timingSafeEqual(a,b);}
const auth=new GoogleAuth({scopes:["https://www.googleapis.com/auth/cloud-platform"]});
export async function dispatchJob(id:string){
 const client=await auth.getClient();
 try {await client.request({url:`https://cloudtasks.googleapis.com/v2/${process.env.AI_TASK_QUEUE}/tasks`,method:"POST",data:{task:{name:`${process.env.AI_TASK_QUEUE}/tasks/${id}`,dispatchDeadline:"300s",httpRequest:{httpMethod:"POST",url:process.env.AI_WORKER_URL,headers:{"Content-Type":"application/json",Authorization:`Bearer ${workerToken()}`},body:Buffer.from(JSON.stringify({id})).toString("base64")}}}});}
 catch(error){if((error as {response?:{status?:number}}).response?.status!==409)throw error;}
}
export async function queueJob(userId:string,data:JobInput){
 const parsed=jobInput.parse(data),input=JSON.stringify(parsed.input),client=getClient();
 const prior=await client.execute({sql:"SELECT id FROM ai_jobs WHERE user_id=? AND kind=? AND input=? AND status IN ('queued','running') ORDER BY created_at DESC LIMIT 1",args:[userId,parsed.kind,input]});
 if(prior.rows[0])return String(prior.rows[0].id);
 let id=newId("job");
 await client.execute({sql:"INSERT OR IGNORE INTO ai_jobs(id,user_id,kind,input,created_at) VALUES(?,?,?,?,?)",args:[id,userId,parsed.kind,input,Date.now()]});
 const active=await client.execute({sql:"SELECT id FROM ai_jobs WHERE user_id=? AND kind=? AND input=? AND status IN ('queued','running') LIMIT 1",args:[userId,parsed.kind,input]});
 id=String(active.rows[0].id);
 // Persist first. The authenticated sweep re-dispatches queued jobs after temporary queue errors.
 if(jobsEnabled())await dispatchJob(id).catch(()=>console.error("[ai-job] dispatch deferred",id));
 return id;
}
export async function readJob(id:string,userId:string){
 const {rows}=await getClient().execute({sql:"SELECT status,result FROM ai_jobs WHERE id=? AND user_id=?",args:[id,userId]});
 if(!rows[0])throw new AppError("not_found","AI job not found");
 return {id,status:String(rows[0].status),result:rows[0].result?JSON.parse(String(rows[0].result)):null};
}
async function execute(userId:string,data:JobInput){
 const user=await loadUser(userId);if(!user)throw new AppError("unauthorized","Account no longer exists");
 if(data.kind==="feedback")return assessFeedback(user,data.input);
 if(data.kind==="draft")return compileDraft(user.id,data.input);
 if(data.kind==="review"){
  const {pact}=await loadMilestone(data.input.milestoneId);assertParty(user,pact);
  const {runReview}=await import("@/lib/domain/work");return {verdictId:await runReview(data.input.milestoneId,data.input.submissionId)};
 }
 const {loadDispute,mediate}=await import("@/lib/domain/disputes");
 const dispute=await loadDispute(data.input.disputeId);const {pact}=await loadMilestone(dispute.milestoneId);assertParty(user,pact);
 if(dispute.revision!==data.input.revision)throw new AppError("conflict","A newer statement superseded this review. Open the latest proposal.");
 return {dispute:await mediate(dispute.id,user.id)};
}
export async function runJob(id:string,executor:(userId:string,data:JobInput)=>Promise<unknown>=execute){
 const client=getClient();
 const {rows}=await client.execute({sql:"UPDATE ai_jobs SET status='running',started_at=? WHERE id=? AND status='queued' RETURNING *",args:[Date.now(),id]});
 if(!rows[0])return; // Redelivery never repeats a claimed operation or consumes another credit.
 const row=rows[0];
 try{
  const data=jobInput.parse({kind:row.kind,input:JSON.parse(String(row.input))});
  const result=await executor(String(row.user_id),data);
  await client.execute({sql:"UPDATE ai_jobs SET status='succeeded',result=?,finished_at=? WHERE id=? AND status='running'",args:[JSON.stringify(result),Date.now(),id]});
 }catch(error){
  const result={error:{code:error instanceof AppError?error.code:"ai_unavailable",message:error instanceof AppError?error.message:"The AI request could not finish. Your agreement is safe. Please retry."}};
  await client.execute({sql:"UPDATE ai_jobs SET status='failed',result=?,finished_at=? WHERE id=? AND status='running'",args:[JSON.stringify(result),Date.now(),id]});
 }
}
export async function recoverJobs(){
 if(!jobsEnabled())return;
 const client=getClient();
 // A worker lost mid-operation is not automatically replayed: it may already have used a credit.
 await client.execute({sql:"UPDATE ai_jobs SET status='failed',result=?,finished_at=? WHERE status='running' AND started_at<?",args:[JSON.stringify({error:{code:"ai_unavailable",message:"The worker was interrupted. Check the latest project state before retrying."}}),Date.now(),Date.now()-360000]});
 const {rows}=await client.execute("SELECT id FROM ai_jobs WHERE status='queued' ORDER BY created_at LIMIT 30");
 for(const row of rows)await dispatchJob(String(row.id)).catch(()=>console.error("[ai-job] dispatch deferred",row.id));
 await client.execute({sql:"DELETE FROM ai_jobs WHERE status IN ('succeeded','failed') AND finished_at<?",args:[Date.now()-7*86400000]});
}
