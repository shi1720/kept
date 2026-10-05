import { beforeAll, describe, expect, it } from "vitest";
import { ensureMigrated } from "@/lib/db/migrate";
import { db } from "@/lib/db/client";
import { users, type Criterion, type Verdict } from "@/lib/db/schema";
import { accountAI, decryptKey, encryptKey, refundFreeRequest, reserveFreeRequest, saveAccountAI } from "@/lib/ai/account";
import { offlineVerdict, reconcile } from "@/lib/ai/referee";
import { canAutoRelease } from "@/lib/domain/sweep";
import type { EvidencePack } from "@/lib/evidence";
const criterion: Criterion = {id:"creative",milestoneId:"m",position:0,text:"Warm editorial coffee illustration",kind:"subjective",check:{type:"min_image_resolution",width:1000,height:1000}};
const pack: EvidencePack = {facts:[],documents:[{artifactId:"a",name:"claim",kind:"text",text:criterion.text,words:4}],images:[],repos:[],pages:[],checks:[{criterionId:"creative",type:"min_image_resolution",passed:true,detail:"2000 x 2000 pixels"}],injection:[],totalWords:4,fileCount:1,extensions:["png"]};
const output = {criteria:[{criterionId:"creative",result:"cannot_verify" as const,confidence:0.5,evidence:"Dimensions alone cannot verify style",reasoning:"Missing style reference"}],overall:"partial" as const,score:50,recommendedReleasePct:50,summary:"Needs review",notesForClient:"",notesForFreelancer:"",injectionAttempt:false};
beforeAll(async()=>{await ensureMigrated();await db.insert(users).values({id:"quota",email:"quota@example.test",name:"Quota",handle:"quota"});});
describe("AI account allowance",()=>{
 it("allows exactly five concurrent free requests, persists count, and refunds failure",async()=>{
  const results=await Promise.allSettled(Array.from({length:9},()=>reserveFreeRequest("quota")));
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(5);
  expect((await accountAI("quota")).used).toBe(5);
  await refundFreeRequest("quota"); expect((await accountAI("quota")).used).toBe(4);
  await reserveFreeRequest("quota");
 });
 it("encrypts keys with authenticated encryption and keeps quota when settings change",async()=>{
  const encrypted=encryptKey("test-provider-key"); expect(encrypted).not.toContain("test-provider-key"); expect(decryptKey(encrypted)).toBe("test-provider-key");
  const tampered=Buffer.from(encrypted,"base64");tampered[15]^=1;expect(()=>decryptKey(tampered.toString("base64"))).toThrow();
  await saveAccountAI("quota","gemini","gemini-3.1-pro-preview","test-key");
  expect((await accountAI("quota")).used).toBe(5);
  await expect(saveAccountAI("quota","openai","gpt-6-astra")).rejects.toThrow(/new provider/);
  await saveAccountAI("quota","gemini","gemini-3.1-pro-preview",undefined,true);
  expect((await accountAI("quota")).encryptedKey).toBeNull();
 });
});
describe("creative review safety",()=>{
 it("never treats dimensions or copied keywords as proof of creative quality",()=>{
  expect(offlineVerdict([criterion],pack).criteria[0].result).toBe("cannot_verify");
  expect(reconcile([criterion],pack,output).criteriaResults[0].result).toBe("cannot_verify");
 });
 it("requires confidence and cited evidence before a pass",()=>{
  for(const result of [{...output.criteria[0],result:"met" as const,confidence:0.6},{...output.criteria[0],result:"met" as const,confidence:0.95,evidence:""}]) {
   expect(reconcile([criterion],pack,{...output,criteria:[result]}).overall).not.toBe("pass");
  }
 });
 it("blocks empty, uncertain, offline, or manipulated automatic releases",()=>{
  const v={overall:"pass",provider:"gemini",injectionDetected:false,criteriaResults:[{result:"met",confidence:0.95,evidence:"Cited evidence"}]} as Verdict;
  expect(canAutoRelease(v)).toBe(true);
  expect(canAutoRelease({...v,criteriaResults:[]})).toBe(false);
  expect(canAutoRelease({...v,provider:"offline"})).toBe(false);
  expect(canAutoRelease({...v,injectionDetected:true})).toBe(false);
  expect(canAutoRelease({...v,criteriaResults:[{...v.criteriaResults[0],confidence:0.5}]})).toBe(false);
 });
});
