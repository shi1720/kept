"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const STEPS = [
  "Reading the conversation",
  "Extracting deliverables, price and deadlines",
  "Writing criteria a neutral referee can check",
  "Linting vague phrases that cause disputes",
  "Scanning for scam and exploitation signals",
];

export function Compiling() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, STEPS.length - 1)), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <span className="relative flex size-14 items-center justify-center rounded-2xl bg-jade-600 text-white shadow-lift animate-pulse-ring">
        <Sparkles className="size-6" />
      </span>
      <div>
        <p className="display text-[30px]">Compiling your pact…</p>
        <p className="mt-1 text-sm text-ink-3">Turning a conversation into terms both sides can hold each other to.</p>
      </div>
      <ol className="flex w-full max-w-sm flex-col gap-2.5 text-left">
        {STEPS.map((s, j) => (
          <li key={s} className={cn("flex items-center gap-3 text-[13.5px] transition-opacity duration-500", j > i ? "opacity-35" : "opacity-100")}>
            {j < i ? <Check className="size-4 text-jade-600" /> : j === i ? <Loader2 className="size-4 animate-spin text-jade-600" /> : <span className="size-4 rounded-full border border-line-2" />}
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
