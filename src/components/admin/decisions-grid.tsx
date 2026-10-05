"use client";

import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Gavel, ShieldAlert, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { DisputeRow, VerdictRow } from "@/lib/domain/ops";
import { cn } from "@/lib/cn";
import { byId, centered, OpsGrid, pactColumn, ScoreBar } from "./grid-kit";
import { VERDICT_DETAIL } from "./verdict-detail";

const PROVIDER: Record<string, string> = { anthropic: "Claude", gemini: "Gemini", offline: "Offline engine" };
export const providerLabel = (p: string) => PROVIDER[p] ?? p;

function ModelCell(p: ICellRendererParams<VerdictRow>) {
  if (!p.data) return null;
  return (
    <div className="flex h-full flex-col justify-center leading-tight">
      <span className="text-[12.5px] font-medium text-ink">{providerLabel(p.data.provider)}</span>
      <span className="truncate font-mono text-[11px] text-ink-3">{p.data.model}</span>
    </div>
  );
}

const OVERALL_TONE = { pass: "jade", partial: "amber", fail: "rose" } as const;
function OverallCell(p: ICellRendererParams<VerdictRow>) {
  if (!p.data) return null;
  return centered(<Badge tone={OVERALL_TONE[p.data.overall]}>{p.data.overall.toUpperCase()}</Badge>);
}

function ScoreCell(p: ICellRendererParams<VerdictRow>) {
  return p.data ? <ScoreBar value={p.data.score} /> : null;
}

function CriteriaCell(p: ICellRendererParams<VerdictRow>) {
  if (!p.data) return null;
  const { criteriaMet: met, criteriaTotal: total } = p.data;
  return (
    <div className="flex h-full items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: Math.min(total, 10) }, (_, i) => (
          <span key={i} className={cn("h-3 w-1.5 rounded-sm", i < met ? "bg-jade-500" : "bg-line-2")} />
        ))}
      </div>
      <span className="num text-[12.5px] text-ink-2">
        {met}/{total}
      </span>
    </div>
  );
}

function InjectionCell(p: ICellRendererParams<VerdictRow>) {
  if (!p.data) return null;
  return centered(
    p.data.injectionDetected ? (
      <Badge tone="rose" className="border-rose-500 bg-rose-600 text-white">
        <ShieldAlert /> Injection caught
      </Badge>
    ) : (
      <span className="text-[12px] text-ink-3">Clean</span>
    ),
  );
}

const fmtLatency = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v} ms`);

function LatencyCell(p: ICellRendererParams<VerdictRow>) {
  if (!p.data) return null;
  const v = p.data.latencyMs;
  return <span className={cn("num", v > 30_000 ? "text-amber-700" : "text-ink-2")}>{fmtLatency(v)}</span>;
}

/* ---------------- Rulings ---------------- */

function SplitCell(p: ICellRendererParams<DisputeRow>) {
  const v = p.value as number | null;
  if (v == null) return <span className="text-ink-3">—</span>;
  return (
    <div className="flex h-full items-center gap-2" title={`${v}% to freelancer · ${100 - v}% back to client`}>
      <div className="flex h-1.5 w-16 overflow-hidden rounded-full bg-sky-100">
        <div className="h-full bg-jade-500" style={{ width: `${v}%` }} />
      </div>
      <span className="num text-[12.5px] font-medium">{v}%</span>
    </div>
  );
}

export const DISPUTE_STATUS: Record<DisputeRow["status"], { label: string; tone: "rose" | "amber" | "ember" | "jade" }> = {
  open: { label: "Open", tone: "rose" },
  ruling_proposed: { label: "Ruling proposed", tone: "amber" },
  escalated: { label: "Escalated to human", tone: "ember" },
  resolved: { label: "Resolved", tone: "jade" },
};

export function DisputeStatusCell(p: ICellRendererParams<DisputeRow>) {
  if (!p.data) return null;
  const s = DISPUTE_STATUS[p.data.status];
  return centered(
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>,
  );
}

const VERDICT_RULES = { "bg-rose-50/80!": (p: { data?: VerdictRow }) => Boolean(p.data?.injectionDetected) };

export function DecisionsPanel({ verdicts, rulings }: { verdicts: VerdictRow[]; rulings: DisputeRow[] }) {
  const verdictCols = useMemo<ColDef<VerdictRow>[]>(
    () => [
      { field: "createdAt", headerName: "When", type: "timestamp", sort: "desc" },
      pactColumn(),
      { field: "overall", headerName: "Overall", cellRenderer: OverallCell, width: 105, enableCellChangeFlash: true },
      { field: "score", headerName: "Score", cellRenderer: ScoreCell, width: 130, filter: "agNumberColumnFilter", enableCellChangeFlash: true },
      {
        field: "injectionDetected",
        headerName: "Prompt injection",
        cellRenderer: InjectionCell,
        width: 165,
        filterValueGetter: (p) => (p.data?.injectionDetected ? "injection caught" : "clean"),
        headerTooltip: "Flagged by Kept's deterministic scanner, independently of the model",
      },
      { colId: "criteria", headerName: "Criteria met", valueGetter: (p) => (p.data ? p.data.criteriaMet / Math.max(1, p.data.criteriaTotal) : null), cellRenderer: CriteriaCell, width: 150, filter: "agNumberColumnFilter" },
      { field: "recommendedReleasePct", headerName: "Recommends", type: "pct", width: 120, headerTooltip: "Share the referee recommends releasing to the freelancer" },
      { colId: "model", headerName: "Referee", valueGetter: (p) => (p.data ? `${providerLabel(p.data.provider)} ${p.data.model}` : null), cellRenderer: ModelCell, width: 180 },
      { field: "latencyMs", headerName: "Latency", cellRenderer: LatencyCell, width: 100, filter: "agNumberColumnFilter", cellClass: "ag-right-aligned-cell", headerClass: "ag-right-aligned-header" },
      { field: "summary", headerName: "Summary", flex: 1, minWidth: 240, cellClass: "text-ink-2", tooltip: (p) => p.value ?? undefined },
    ],
    [],
  );

  const rulingCols = useMemo<ColDef<DisputeRow>[]>(
    () => [
      { field: "createdAt", headerName: "Opened", type: "timestamp", sort: "desc" },
      pactColumn(),
      { field: "mediator", headerName: "Mediator", width: 200, cellClass: "font-mono text-[11.5px] text-ink-2" },
      { field: "proposedPct", headerName: "AI proposal", cellRenderer: SplitCell, width: 140, filter: "agNumberColumnFilter", headerTooltip: "Share the AI mediator proposed releasing to the freelancer" },
      { field: "finalPct", headerName: "Final", cellRenderer: SplitCell, width: 130, filter: "agNumberColumnFilter" },
      { field: "status", headerName: "Status", cellRenderer: DisputeStatusCell, width: 170, enableCellChangeFlash: true, filterValueGetter: (p) => (p.data ? DISPUTE_STATUS[p.data.status].label : "") },
      { field: "rationale", headerName: "Rationale", flex: 1, minWidth: 260, cellClass: "text-ink-2", tooltip: (p) => p.value ?? undefined },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <SectionTitle icon={<Sparkles />} title="Referee verdicts" hint="Every evidence-backed review and the model that made it. Click a verdict (or press Enter) for its per-criterion audit. Text in a deliverable that tries to instruct the referee is flagged by a deterministic scanner, independently of the model." />
        <OpsGrid<VerdictRow>
          id="verdicts"
          rows={verdicts}
          columns={verdictCols}
          getRowId={byId}
          rowClassRules={VERDICT_RULES}
          detail={VERDICT_DETAIL}
          noun={["verdict", "verdicts"]}
          searchPlaceholder="Search verdicts…"
          emptyText="The referee hasn't reviewed any work yet."
          height={420}
        />
      </section>
      <section className="flex flex-col gap-3">
        <SectionTitle icon={<Gavel />} title="Mediator rulings" hint="AI-proposed splits on disputed milestones, and what the parties (or an arbitrator) finally settled on." />
        <OpsGrid<DisputeRow>
          id="rulings"
          rows={rulings}
          columns={rulingCols}
          getRowId={byId}
          noun={["ruling", "rulings"]}
          searchPlaceholder="Search rulings…"
          emptyText="No disputes have been mediated yet."
          height={300}
        />
      </section>
    </div>
  );
}

export function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 rounded-lg bg-paper-2 p-1.5 text-ink-2 [&_svg]:size-4">{icon}</span>
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {hint && <p className="text-[13px] text-ink-3">{hint}</p>}
      </div>
    </div>
  );
}
