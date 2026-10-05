"use client";

import { Bot, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Refreshes server data while something is happening asynchronously (e.g. the AI review). */
export function AutoRefresh({ active, intervalMs = 2500 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [active, intervalMs, router]);
  return null;
}

const STEPS = [
  "Fetching links, files and repositories",
  "Measuring: word counts, formats, image sizes",
  "Scanning for prompt-injection attempts",
  "Judging each criterion against the evidence",
  "Reconciling the verdict with machine checks",
];

export function RefereeWorking({ since }: { since: string | null }) {
  const [tick, setTick] = useState(() => (since ? Math.floor((Date.now() - new Date(since).getTime()) / 4000) : 0));
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 4000);
    return () => clearInterval(t);
  }, []);
  const current = Math.min(tick, STEPS.length - 1);
  return (
    <div className="rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50/80 to-card p-5">
      <AutoRefresh active />
      <div className="flex items-center gap-3">
        <span className="relative flex size-9 items-center justify-center rounded-full bg-sky-100 text-sky-600 animate-pulse-ring">
          <Bot className="size-4.5" />
        </span>
        <div>
          <p className="text-[14px] font-semibold">The AI referee is reviewing this delivery</p>
          <p className="text-xs text-ink-3">Usually under a minute. This page updates by itself.</p>
        </div>
      </div>
      <ol className="mt-4 space-y-2">
        {STEPS.map((s, i) => (
          <li key={s} className={cn("flex items-center gap-2.5 text-[13px] transition-opacity", i > current ? "opacity-40" : "opacity-100")}>
            {i < current ? <Check className="size-4 text-jade-600" /> : i === current ? <Loader2 className="size-4 animate-spin text-sky-600" /> : <span className="size-4 rounded-full border border-line-2" />}
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Countdown({ to, prefix }: { to: string; prefix: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const ms = new Date(to).getTime() - now;
  if (ms <= 0) return <span>{prefix} any moment now</span>;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return (
    <span>
      {prefix} <b className="num">{h > 0 ? `${h}h ${m}m` : `${m}m`}</b>
    </span>
  );
}
