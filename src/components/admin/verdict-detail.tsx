"use client";

import { CircleCheck, CircleHelp, CircleMinus, CircleX, Cpu, FileSearch, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VerdictCriterion, VerdictRow } from "@/lib/domain/ops";
import { cn } from "@/lib/cn";
import type { DetailConfig } from "./grid-kit";

const RESULT: Record<VerdictCriterion["result"], { label: string; tone: "jade" | "amber" | "rose" | "neutral"; icon: React.ElementType; bar: string }> = {
  met: { label: "Met", tone: "jade", icon: CircleCheck, bar: "bg-jade-500" },
  partially_met: { label: "Partially met", tone: "amber", icon: CircleMinus, bar: "bg-amber-500" },
  not_met: { label: "Not met", tone: "rose", icon: CircleX, bar: "bg-rose-500" },
  cannot_verify: { label: "Can't verify", tone: "neutral", icon: CircleHelp, bar: "bg-line-2" },
};

function Criterion({ c, n }: { c: VerdictCriterion; n: number }) {
  const r = RESULT[c.result];
  const pct = Math.round(c.confidence * 100);
  return (
    <li className="grid gap-x-4 gap-y-2 rounded-xl border border-line bg-card p-3.5 sm:grid-cols-[132px_1fr]">
      <div className="flex items-center gap-2 sm:flex-col sm:items-start">
        <Badge tone={r.tone}>
          <r.icon /> {r.label}
        </Badge>
        <div className="flex items-center gap-1.5" title={`Referee confidence ${pct}%`}>
          <div className="h-1 w-14 overflow-hidden rounded-full bg-paper-2">
            <div className={cn("h-full rounded-full", r.bar)} style={{ width: `${Math.max(4, pct)}%` }} />
          </div>
          <span className="num text-[11px] text-ink-3">{pct}% sure</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-[13px] font-medium leading-snug text-ink">
          <span className="num mr-1.5 text-ink-3">{n}.</span>
          {c.text}
          {c.kind === "subjective" && <span className="ml-1.5 align-middle text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">subjective</span>}
        </p>
        {c.machineCheck && (
          <p className={cn("flex items-start gap-1.5 text-[12px] leading-snug", c.machineCheck.passed ? "text-jade-700" : "text-rose-700")}>
            <Cpu className="mt-0.5 size-3.5 shrink-0" />
            <span>
              <b className="font-semibold">Machine check {c.machineCheck.passed ? "passed" : "failed"}</b>
              <span className="font-mono text-[11px] opacity-80"> · {c.machineCheck.type}</span>; {c.machineCheck.detail}
            </span>
          </p>
        )}
        {c.evidence && <p className="border-l-2 border-line-2 pl-2.5 text-[12px] italic leading-relaxed text-ink-2">{c.evidence}</p>}
        {c.reasoning && <p className="text-[12px] leading-relaxed text-ink-3">{c.reasoning}</p>}
      </div>
    </li>
  );
}

export function VerdictDetail({ v }: { v: VerdictRow }) {
  const facts = v.evidence.filter((f) => f.probe !== "security");
  return (
    <div className="border-y border-line bg-paper px-3 py-4 sm:px-5" role="region" aria-label={`Referee audit for ${v.pactTitle}; ${v.milestoneTitle}`}>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="flex min-w-0 flex-col gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Referee audit</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{v.summary}</p>
          </div>

          {v.injectionDetected ? (
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-[12.5px] text-rose-700">
              <p className="flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="size-4" /> Prompt injection caught
              </p>
              <p className="mt-1 leading-snug">
                The deliverable contained text aimed at the referee. It was quarantined by Kept&rsquo;s deterministic scanner and ignored; this milestone will never auto-release.
              </p>
              {v.injectionFindings.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {v.injectionFindings.map((f, i) => (
                    <li key={i} className="rounded-lg border border-rose-100 bg-card px-2.5 py-1.5">
                      <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-rose-600">{f.source}</span>
                      <code className="block break-words font-mono text-[11.5px] leading-snug text-ink">“…{f.snippet}…”</code>
                    </li>
                  ))}
                </ul>
              ) : (
                v.evidence
                  .filter((f) => f.probe === "security")
                  .map((f, i) => (
                    <p key={i} className="mt-2 rounded-lg border border-rose-100 bg-card px-2.5 py-1.5 text-[12px] text-ink-2">
                      {f.detail} (in a linked page; the raw text isn&rsquo;t stored).
                    </p>
                  ))
              )}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 rounded-xl border border-jade-100 bg-jade-50 px-3 py-2 text-[12.5px] font-medium text-jade-700">
              <ShieldCheck className="size-4" /> No instructions aimed at the referee
            </p>
          )}

          {facts.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                <FileSearch className="size-3.5" /> Evidence pack · {facts.length} probe{facts.length === 1 ? "" : "s"}
              </p>
              <ul className="flex flex-col gap-1">
                {facts.slice(0, 8).map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[12px] leading-snug">
                    {f.ok === false ? (
                      <CircleX className="mt-0.5 size-3.5 shrink-0 text-rose-600" />
                    ) : (
                      <CircleCheck className={cn("mt-0.5 size-3.5 shrink-0", f.ok ? "text-jade-600" : "text-ink-3")} />
                    )}
                    <span className="min-w-0">
                      <b className="font-medium text-ink">{f.label}</b> <span className="text-ink-3">;  {f.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Acceptance criteria · {v.criteriaMet} of {v.criteriaTotal} met
          </p>
          {v.criteria.length ? (
            <ol className="flex flex-col gap-2">
              {[...v.criteria]
                .sort((a, b) => a.position - b.position)
                .map((c, i) => (
                  <Criterion key={c.id} c={c} n={i + 1} />
                ))}
            </ol>
          ) : (
            <p className="text-[12.5px] text-ink-3">No per-criterion results were recorded for this verdict.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Full-width detail row config for the verdicts grid (module-level so it's stable). */
export const VERDICT_DETAIL: DetailConfig<VerdictRow> = {
  render: (v) => <VerdictDetail v={v} />,
  estimateHeight: (v) => Math.max(280, 72 + v.criteria.length * 118),
  label: (v) => `${v.pactTitle}; ${v.milestoneTitle}`,
};
