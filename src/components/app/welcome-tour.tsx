"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
const steps = [
 ["Welcome to Kept", "A clear agreement. A visible review. A payment both sides understand.", "Start with a conversation or explore the demo as Maya, the client, and Ana, the freelancer."],
 ["Agree on what good looks like", "Turn a chat into a pact", "Review the price, milestones, revision limit, and every acceptance criterion. For creative work, add examples, audience, and style references before both sides sign."],
 ["Fund before work starts", "See the payment state", "The client approves each milestone payment through PayPal. This test app uses sandbox payments or a clearly marked simulator. No real money moves."],
 ["Review the evidence together", "AI explains each finding", "The freelancer submits work. The referee checks each signed criterion and shows its evidence. Uncertain creative judgments need a person. A machine check alone does not prove quality."],
 ["Resolve, then release", "Both sides stay involved", "The client can approve, request an included revision, or raise an issue. Mediation proposes a split that both sides must accept. Uncertain work never releases automatically."],
 ["Make it yours", "Five AI requests to get started", "Your account includes five successful AI requests. Add a Gemini, OpenAI, or Anthropic API key in Settings for more. Reopen this guide with the Guide button anytime."],
];
export function WelcomeTour({userId}: {userId:string}) {
 const [open,setOpen]=useState(false); const [step,setStep]=useState(0);
 const storageKey=`kept:welcome:v2:${userId}`;
 useEffect(()=>{let seen=false;try{seen=Boolean(localStorage.getItem(storageKey));}catch{} if(!seen){const timer=setTimeout(()=>setOpen(true),400);return()=>clearTimeout(timer);}},[storageKey]);
 function close(){try{localStorage.setItem(storageKey,"seen");}catch{}setOpen(false);}
 return <><Button size="sm" variant="ghost" onClick={()=>{setStep(0);setOpen(true);}}>Guide</Button><Dialog open={open} onOpenChange={value=>value?setOpen(true):close()}><DialogContent><div className="mb-5 flex gap-1">{steps.map((_,i)=><span key={i} className={`h-1 flex-1 rounded-full ${i<=step?"bg-jade-600":"bg-paper-2"}`}/>)}</div><p className="mb-2 text-xs uppercase tracking-widest text-jade-700">{step+1} / {steps.length}</p><DialogHeader title={steps[step][0]} description={steps[step][1]}/><p className="mb-8 text-sm leading-7 text-ink-2">{steps[step][2]}</p><div className="flex justify-between"><Button variant="ghost" onClick={close}>Skip guide</Button><div className="flex gap-2">{step>0&&<Button variant="outline" onClick={()=>setStep(step-1)}>Back</Button>}<Button onClick={()=>step===steps.length-1?close():setStep(step+1)}>{step===steps.length-1?"Start exploring":"Next"}</Button></div></div></DialogContent></Dialog></>;
}
