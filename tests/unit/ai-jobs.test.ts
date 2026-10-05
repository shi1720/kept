import {beforeAll,expect,it,vi} from "vitest";
import {ensureMigrated} from "@/lib/db/migrate";
import {createUser} from "@/lib/auth/users";
import {queueJob,readJob,runJob,validWorkerToken,workerToken} from "@/lib/ai/jobs";
let owner:string;
beforeAll(async()=>{await ensureMigrated();owner=(await createUser({name:"Job owner",email:"jobs@example.com",password:"password123"})).id;});
const input={kind:"draft" as const,input:{sourceText:"Please write a clear $3500 packaging agreement for two concepts",creatorRole:"client" as const}};
it("deduplicates an active request and a redelivered task without repeating the executor",async()=>{
 const [a,b]=await Promise.all([queueJob(owner,input),queueJob(owner,input)]);expect(a).toBe(b);
 const execute=vi.fn(async()=>({draft:{title:"Saved result"}}));
 await Promise.all([runJob(a,execute),runJob(a,execute)]);await runJob(a,execute);
 expect(execute).toHaveBeenCalledTimes(1);expect((await readJob(a,owner)).result.draft.title).toBe("Saved result");
 await expect(readJob(a,"another-user")).rejects.toThrow("not found");
});
it("persists failure and does not repeat a failed task",async()=>{
 const id=await queueJob(owner,input);const execute=vi.fn(async()=>{throw Error("private provider details");});
 await runJob(id,execute);await runJob(id,execute);expect(execute).toHaveBeenCalledTimes(1);
 const job=await readJob(id,owner);expect(job.status).toBe("failed");expect(JSON.stringify(job)).not.toContain("private provider details");
});
it("authenticates workers with a separate derived credential",()=>{expect(validWorkerToken(`Bearer ${workerToken()}`)).toBe(true);expect(validWorkerToken(null)).toBe(false);expect(validWorkerToken("Bearer dev-cron-secret")).toBe(false);});
