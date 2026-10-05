"use client";

import { Terminal } from "lucide-react";
import { useSyncExternalStore } from "react";
import { CopyButton } from "./copy-button";

const noopSubscribe = () => () => {};

/**
 * The "connect from Claude Code" snippet. The landing page is prerendered, so the URL is read from
 * the browser (the deployment the visitor is actually on), falling back to the configured APP_URL.
 */
export function McpConnect({ fallbackUrl }: { fallbackUrl: string }) {
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => fallbackUrl);
  const cmd = `claude mcp add --transport http kept ${origin}/api/mcp --header "Authorization: Bearer kept_sk_…"`;
  return (
    <div className="mt-10 overflow-hidden rounded-2xl border border-paper/10 bg-black/30">
      <div className="flex items-center justify-between gap-3 border-b border-paper/10 px-4 py-2.5">
        <span className="flex items-center gap-2 font-mono text-[11px] text-paper/70">
          <Terminal className="size-3.5" aria-hidden /> Connect from Claude Code
        </span>
        <CopyButton text={cmd} />
      </div>
      <pre className="whitespace-pre-wrap break-all px-4 py-4 font-mono text-[12.5px] leading-relaxed text-paper/90 sm:break-normal">
        <code>
          <span className="text-paper/40">$ </span>claude mcp add --transport http kept {"\\"}
          {"\n"}
          {"    "}
          <span className="text-jade-300">{origin}/api/mcp</span> {"\\"}
          {"\n"}
          {"    "}--header <span className="text-amber-100">&quot;Authorization: Bearer kept_sk_…&quot;</span>
        </code>
      </pre>
    </div>
  );
}
