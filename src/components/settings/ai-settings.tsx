"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
const defaults = { gemini: "gemini-3.1-pro-preview", anthropic: "claude-opus-5-5", openai: "gpt-6-astra" };
export function AISettings({ initial }: { initial: {provider: keyof typeof defaults; model: string; used: number; hasKey: boolean} }) {
 const [provider,setProvider] = useState(initial.provider);
 const [model,setModel] = useState(initial.model);
 const [apiKey,setKey] = useState("");
 const [hasKey,setHasKey] = useState(initial.hasKey);
 const [busy,setBusy] = useState(false);
 async function save(remove = false) {
  setBusy(true);
  try {
   const response = await fetch("/api/ai/settings", {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider,model,apiKey:apiKey || undefined,remove})});
   const data=await response.json(); if(!response.ok) throw new Error(data.error?.message || "Could not save settings");
   setHasKey(remove ? false : Boolean(apiKey) || hasKey); setKey(""); toast.success(remove ? "API key removed" : "AI settings saved");
  } catch(error) {toast.error(error instanceof Error ? error.message : "Could not save settings");} finally {setBusy(false);}
 }
 return <Card id="ai"><CardHeader><CardTitle>Your AI, your choice</CardTitle><CardDescription>Draft clear agreements, review evidence, and explore a fair resolution.</CardDescription></CardHeader><CardContent className="space-y-4">
  <div className="rounded-xl bg-jade-50 p-4"><p className="font-medium">{Math.max(0,5-initial.used)} of 5 included AI credits remaining</p><p className="mt-1 text-sm text-ink-2">One successful draft, delivery review, feedback check, or mediation uses one request. After five, add your own provider key. Failed provider requests are refunded.</p></div>
  <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Provider<select aria-label="AI provider" className="mt-2 block w-full rounded-lg border border-line bg-card p-2.5" value={provider} onChange={e=>{const p=e.target.value as keyof typeof defaults;setProvider(p);setModel(defaults[p]);setKey("");}}><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option></select></label>
  <label className="text-sm">Model ID<Input className="mt-2" value={model} onChange={e=>setModel(e.target.value)} /></label></div>
  <p className="text-xs text-ink-3">Enter a model available in your provider account. Free requests use the hosted Gemini model. Your selected model applies when you supply a key.</p>
  <label className="block text-sm">Provider API key<Input className="mt-2" type="password" autoComplete="off" placeholder={hasKey ? "Key saved securely. Enter a replacement." : "Paste your API key"} value={apiKey} onChange={e=>setKey(e.target.value)} /></label>
  <p className="text-xs text-ink-3">Keys are encrypted on the server and never returned to your browser. Your provider bills your account. AI suggestions do not change signed terms.</p>
  <div className="flex flex-wrap gap-2"><Button disabled={busy || !model.trim()} onClick={()=>save()}>Save AI settings</Button>{hasKey && <Button variant="outline" disabled={busy} onClick={()=>save(true)}>Remove key</Button>}</div>
 </CardContent></Card>;
}
