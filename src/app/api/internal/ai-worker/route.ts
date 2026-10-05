import {NextResponse} from "next/server";
import {ensureMigrated} from "@/lib/db/migrate";
import {runJob,validWorkerToken} from "@/lib/ai/jobs";
import {z} from "zod";
export const maxDuration=300;
export async function POST(req:Request){
 if(!validWorkerToken(req.headers.get("authorization")))return NextResponse.json({error:"unauthorized"},{status:401});
 const parsed=z.object({id:z.string().regex(/^job_[a-z0-9]+$/)}).safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"invalid job"},{status:400});
 await ensureMigrated();await runJob(parsed.data.id);return NextResponse.json({ok:true});
}
