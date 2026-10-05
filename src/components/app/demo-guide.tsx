"use client";

import { ChevronDown, Compass, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export interface GuideStep {
  title: string;
  detail: string;
  href: string;
  as: "Maya" | "Ade" | "either";
}

/** Demo-only guided tour so a first-time visitor (or judge) sees every key flow in minutes. */
export function DemoGuide({ steps, currentPersona }: { steps: GuideStep[]; currentPersona: "Maya" | "Ade" }) {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read a per-browser preference after hydration
      if (localStorage.getItem("kept.demoGuide") === "hidden") setHidden(true);
    } catch {
      /* storage unavailable */
    }
  }, []);
  if (hidden) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-ember-100 bg-gradient-to-br from-ember-50 via-card to-card">
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="rounded-xl bg-ember-600 p-2 text-white"><Compass className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">Your 3-minute tour of Kept</p>
          <p className="text-xs text-ink-3">A private demo world with real PayPal sandbox checkout. Use “Switch to …” in the header to play both sides.</p>
        </div>
        <button onClick={() => setOpen(!open)} className="rounded-full p-1.5 text-ink-3 hover:bg-paper-2" aria-label={open ? "Collapse tour" : "Expand tour"}>
          <ChevronDown className={cn("size-4 transition-transform", open ? "rotate-180" : "")} />
        </button>
        <button
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem("kept.demoGuide", "hidden");
            } catch {
              /* ignore */
            }
          }}
          className="rounded-full p-1.5 text-ink-3 hover:bg-paper-2"
          aria-label="Hide tour"
        >
          <X className="size-4" />
        </button>
      </div>
      {open && (
        <ol className="grid gap-px border-t border-ember-100 bg-ember-100/60 sm:grid-cols-2 xl:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="bg-card/90">
              <Link href={s.href} className="group flex h-full gap-3 px-5 py-4 transition-colors hover:bg-paper">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-paper">{i + 1}</span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-medium">
                    {s.title}
                    {s.as !== "either" && (
                      <span className={cn("rounded-full px-1.5 py-px text-[10px] font-semibold", s.as === currentPersona ? "bg-jade-50 text-jade-700" : "bg-paper-2 text-ink-3")}>
                        as {s.as}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-3">{s.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
