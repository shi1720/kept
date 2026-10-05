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
  const res = await fetch(path, {
    method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
    headers: opts.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new ApiClientError(json?.error?.message ?? `Request failed (${res.status})`, json?.error?.code ?? "error", res.status);
    if (!opts.quiet) toast.error(err.message);
    throw err;
  }
  return json as T;
}
