import { AlertTriangle, Bot, CheckCircle2, CircleHelp, CircleSlash, Cpu, MinusCircle, ShieldAlert, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { Criterion, CriterionResult, Verdict } from "@/lib/db/schema";

const RESULT: Record<CriterionResult["result"], { icon: React.ElementType; label: string; cls: string }> = {
  met: { icon: CheckCircle2, label: "Met", cls: "text-jade-600" },
  partially_met: { icon: MinusCircle, label: "Partly met", cls: "text-amber-600" },
  not_met: { icon: XCircle, label: "Not met", cls: "text-rose-600" },
  cannot_verify: { icon: CircleHelp, label: "Can’t verify", cls: "text-ink-3" },
};

export function ScoreRing({ score, overall, size = 88 }: { score: number; overall: Verdict["overall"]; size?: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const color = overall === "pass" ? "#0f6b57" : overall === "partial" ? "#c98a1c" : "#be123c";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#efe9de" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-[22px] font-semibold leading-none" style={{ color }}>{score}</span>
        <span className="text-[10px] uppercase tracking-wider text-ink-3">/ 100</span>
      </div>
    </div>
  );
}

export function CriterionRow({ criterion, result, index }: { criterion: Criterion; result?: CriterionResult; index: number }) {
  const r = result ? RESULT[result.result] : null;
  const Icon = r?.icon ?? CircleSlash;
  return (
    <li className="flex gap-3 py-3">
      <Icon className={cn("mt-0.5 size-[18px] shrink-0", r?.cls ?? "text-line-2")} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[13.5px] leading-snug text-ink">
            <span className="mr-1 text-ink-3">{index + 1}.</span>
            {criterion.text}
          </span>
          {criterion.kind === "subjective" && <Badge tone="neutral" className="py-0 text-[10.5px]">subjective</Badge>}
          {criterion.check.type !== "none" && (
            <Badge tone="sky" className="py-0 text-[10.5px]">
              <Cpu /> auto-check
            </Badge>
          )}
        </div>
        {result && (
          <div className="mt-1.5 space-y-1">
            {result.machineCheck && (
              <p className={cn("text-xs", result.machineCheck.passed ? "text-jade-700" : "text-rose-700")}>
                <span className="font-medium">Machine check {result.machineCheck.passed ? "passed" : "failed"}:</span> {result.machineCheck.detail}
              </p>
            )}
            {result.evidence && (
              <p className="border-l-2 border-line-2 pl-2.5 text-xs italic leading-relaxed text-ink-2">{result.evidence}</p>
            )}
            <p className="text-xs leading-relaxed text-ink-3">
              {result.reasoning} <span className="num whitespace-nowrap text-ink-3/80">· confidence {Math.round(result.confidence * 100)}%</span>
            </p>
          </div>
        )}
      </div>
      {r && <span className={cn("hidden shrink-0 text-xs font-medium sm:block", r.cls)}>{r.label}</span>}
    </li>
  );
}

export function VerdictReport({ verdict, criteria, viewerRole }: { verdict: Verdict; criteria: Criterion[]; viewerRole: "client" | "freelancer" | null }) {
  const byId = new Map(verdict.criteriaResults.map((r) => [r.criterionId, r]));
  const met = verdict.criteriaResults.filter((r) => r.result === "met").length;
  const overallTone = verdict.overall === "pass" ? "jade" : verdict.overall === "partial" ? "amber" : "rose";
  const notes = viewerRole === "freelancer" ? verdict.notesForFreelancer : verdict.notesForClient;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex flex-wrap items-center gap-5 border-b border-line bg-gradient-to-r from-sky-50/60 via-card to-card p-5">
        <ScoreRing score={verdict.score} overall={verdict.overall} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold"><Bot className="size-4 text-sky-600" /> AI Referee verdict</span>
            <Badge tone={overallTone}>{verdict.overall.toUpperCase()}</Badge>
            <span className="text-xs text-ink-3">{met}/{verdict.criteriaResults.length} criteria met</span>
          </div>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{verdict.summary}</p>
          <p className="mt-1.5 text-[11px] text-ink-3">
            {verdict.provider === "kept-demo-seed" ? "Seeded example — submit work to run the live referee" : `${verdict.model} via ${verdict.provider}`} · {(verdict.latencyMs / 1000).toFixed(1)}s · recommends releasing {verdict.recommendedReleasePct}%
          </p>
        </div>
      </div>
      {verdict.injectionDetected && (
        <div className="flex gap-3 border-b border-rose-100 bg-rose-50 px-5 py-3 text-[13px] text-rose-700">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span><b>Manipulation attempt detected.</b> The deliverable contains text trying to instruct the referee. It was ignored, and this milestone will not auto-release — the client must decide.</span>
        </div>
      )}
      <ul className="divide-y divide-line px-5">
        {criteria.map((c, i) => (
          <CriterionRow key={c.id} criterion={c} result={byId.get(c.id)} index={i} />
        ))}
      </ul>
      {notes && (
        <div className="mx-5 mb-5 flex gap-2.5 rounded-xl bg-paper px-4 py-3 text-[13px] leading-relaxed text-ink-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span className="whitespace-pre-line"><b className="text-ink">{viewerRole === "freelancer" ? "To get to 100%: " : "Before you approve: "}</b>{notes}</span>
        </div>
      )}
      {verdict.evidence.length > 0 && (
        <details className="group border-t border-line px-5 py-3">
          <summary className="cursor-pointer list-none text-xs font-medium text-ink-3 hover:text-ink">
            Evidence pack · {verdict.evidence.length} probe{verdict.evidence.length === 1 ? "" : "s"} run by Kept <span className="group-open:hidden">▸</span><span className="hidden group-open:inline">▾</span>
          </summary>
          <ul className="mt-2.5 space-y-1.5">
            {verdict.evidence.map((f, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", f.ok === false ? "bg-rose-500" : "bg-jade-500")} />
                <span className="min-w-0"><span className="font-medium text-ink-2">[{f.probe}] {f.label}</span> <span className="text-ink-3">— {f.detail}</span></span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
