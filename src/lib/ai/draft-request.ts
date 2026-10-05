import { z } from "zod";
import { draftPact } from "./drafter";
import { exampleDraft } from "./examples";
import { draftToInput } from "@/lib/domain/pacts";
export const draftRequest = z.object({sourceText:z.string().trim().min(20,"Paste the conversation or describe the job in a few sentences").max(20000),creatorRole:z.enum(["client","freelancer"]),amount:z.number().positive().max(100000).optional()});
export async function compileDraft(userId:string,input:z.infer<typeof draftRequest>) {
  const started=Date.now();
  const result=await draftPact({userId,sourceText:input.sourceText,creatorRole:input.creatorRole,hints:input.amount?{amount:input.amount}:undefined});
  let {output,provider,model}=result;
  const example=provider==="offline"&&!input.amount?exampleDraft(input.sourceText):null;
  if(example)({output,provider,model}={output:example,provider:"example",model:"pre-compiled example"});
  return {draft:draftToInput(output,{creatorRole:input.creatorRole,sourceText:input.sourceText}),ai:{provider,model,degraded:result.degraded,latencyMs:Date.now()-started}};
}
