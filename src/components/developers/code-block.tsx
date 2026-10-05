"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

export async function copyText(text: string, label = "Copied to clipboard") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
    return true;
  } catch {
    toast.error("Couldn't access the clipboard; select and copy manually");
    return false;
  }
}

export function CopyButton({ text, label, className, dark }: { text: string; label?: string; className?: string; dark?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text, label)) {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium transition-colors [&_svg]:size-3.5",
        dark ? "text-paper/70 hover:bg-white/10 hover:text-paper" : "text-ink-3 hover:bg-paper-2 hover:text-ink",
        className,
      )}
      aria-label="Copy"
    >
      {done ? <Check /> : <Copy />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

/** Dark, copyable code block; `highlight` substrings (e.g. the API key) are emphasised. */
export function CodeBlock({ code, title, highlight }: { code: string; title?: string; highlight?: string[] }) {
  const parts = splitHighlights(code, highlight ?? []);
  return (
    <div className="overflow-hidden rounded-xl border border-ink/90 bg-[#1b1914] shadow-card">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="flex items-center gap-2 font-mono text-[11px] text-paper/50">
          <span className="flex gap-1">
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/15" />
          </span>
          {title}
        </span>
        <CopyButton text={code} dark />
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-paper/90">
        <code>
          {parts.map((p, i) =>
            p.hit ? (
              <span key={i} className="rounded bg-ember-500/20 px-0.5 text-[#ffb38a]">
                {p.text}
              </span>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </code>
      </pre>
    </div>
  );
}

function splitHighlights(code: string, needles: string[]): { text: string; hit: boolean }[] {
  const active = needles.filter(Boolean);
  if (!active.length) return [{ text: code, hit: false }];
  const re = new RegExp(`(${active.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return code
    .split(re)
    .filter((t) => t !== "")
    .map((text) => ({ text, hit: active.includes(text) }));
}
