import {requireUser} from "@/lib/auth/session";
import {readJob} from "@/lib/ai/jobs";
import {handler} from "@/lib/http";
export const GET=handler<{id:string}>(async(_req,{id})=>readJob(id,(await requireUser()).id));
