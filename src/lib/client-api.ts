"use client";

import { toast } from "sonner";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Typed fetch for our JSON API. Errors surface as toasts unless `quiet`. */
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; quiet?: boolean } = {}): Promise<T> {
  const pendingKey = `kept:ai-job:${path}:${JSON.stringify(opts.body ?? null)}`;
  const pending = readPending(pendingKey);
  if(pending) return waitForJob<T>(pending,pendingKey,opts.quiet);
  const res = await fetch(path, {
    method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
    headers: opts.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const json = await res.json().catch(() => ({}));
  if(res.status === 202 && json.jobId) {
    savePending(pendingKey,json.jobId);
    return waitForJob<T>(json.jobId,pendingKey,opts.quiet);
  }
  if (!res.ok) {
    const err = new ApiClientError(json?.error?.message ?? `Request failed (${res.status})`, json?.error?.code ?? "error", res.status);
    if (!opts.quiet) toast.error(err.message);
    throw err;
  }
  return json as T;
}

async function waitForJob<T>(id:string,key:string,quiet?:boolean):Promise<T> {
  for(let i=0;i<360;i++) {
    await new Promise(resolve=>setTimeout(resolve,2000));
    const res=await fetch(`/api/ai/jobs/${encodeURIComponent(id)}`,{cache:"no-store"});
    if(!res.ok) {if(res.status===401||res.status===404)savePending(key,null);throw new ApiClientError("Could not check the AI request. Sign in again or retry to resume.","ai_unavailable",res.status);}
    const job=await res.json();
    if(job.status==="succeeded"||job.status==="failed") {
      savePending(key,null);
      if(job.status==="failed") {const err=new ApiClientError(job.result?.error?.message??"AI request failed",job.result?.error?.code??"ai_unavailable",503);if(!quiet)toast.error(err.message);throw err;}
      return job.result as T;
    }
  }
  throw new ApiClientError("Your AI request is still saved. Retry to resume checking its result.","ai_unavailable",503);
}

function readPending(key:string){try{return typeof window!=="undefined"?sessionStorage.getItem(key):null;}catch{return null;}}
function savePending(key:string,value:string|null){try{if(typeof window!=="undefined"){if(value)sessionStorage.setItem(key,value);else sessionStorage.removeItem(key);}}catch{/* Polling still works when browser storage is unavailable. */}}
