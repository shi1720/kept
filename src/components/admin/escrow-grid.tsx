"use client";

import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useMemo, useState } from "react";
import { MilestoneStatusBadge } from "@/components/app/status";
import type { MilestoneStatus } from "@/lib/db/schema";
import type { EscrowRow } from "@/lib/domain/ops";
import { MILESTONE_STATUS_LABEL } from "@/lib/domain/state";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { ChartCard, EscrowStatusChart } from "./chart-card";
import { byId, centered, FilterChips, OpsGrid, pactColumn, ScoreBar, type Chip } from "./grid-kit";

type Bucket = "all" | "holding" | "awaiting" | "released" | "settled" | "closed";

const BUCKETS: Record<Exclude<Bucket, "all">, { label: string; statuses: MilestoneStatus[] }> = {
  holding: { label: "Holding", statuses: ["funded", "submitted", "in_review", "disputed"] },
  awaiting: { label: "Unfunded", statuses: ["draft", "awaiting_funding"] },
  released: { label: "Released", statuses: ["released"] },
  settled: { label: "Settled · refunded", statuses: ["settled", "refunded"] },
  closed: { label: "Cancelled", statuses: ["cancelled"] },
};
const HOLDING = new Set<MilestoneStatus>(BUCKETS.holding.statuses);
const DAY = 86_400_000;

function daysHeld(r: EscrowRow): number | null {
  if (!r.fundedAt) return null;
  const end = HOLDING.has(r.status) ? Date.now() : (r.resolvedAt ?? r.fundedAt);
  return Math.max(0, Math.round(((end - r.fundedAt) / DAY) * 10) / 10);
}

function StatusCell(p: ICellRendererParams<EscrowRow>) {
  if (p.node.rowPinned || !p.data) return null;
  return centered(<MilestoneStatusBadge status={p.data.status} />);
}

function PartiesCell(p: ICellRendererParams<EscrowRow>) {
  if (p.node.rowPinned || !p.data) return null;
  return (
    <div className="flex h-full flex-col justify-center text-[12.5px] leading-tight">
      <span className="truncate text-ink">{p.data.client ?? "N/A"}</span>
      <span className="truncate text-ink-3">→ {p.data.freelancer ?? "not joined"}</span>
    </div>
  );
}

function VerdictCell(p: ICellRendererParams<EscrowRow>) {
  if (p.node.rowPinned || !p.data) return null;
  if (p.data.verdictScore == null) return <span className="text-ink-3">N/A</span>;
  return <ScoreBar value={p.data.verdictScore} />;
}

function DaysCell(p: ICellRendererParams<EscrowRow>) {
  if (p.node.rowPinned || !p.data || p.value == null) return p.node.rowPinned ? null : <span className="text-ink-3">N/A</span>;
  const live = HOLDING.has(p.data.status);
  return (
    <span className={cn("num", live ? (p.value > 7 ? "font-medium text-rose-700" : "font-medium text-amber-700") : "text-ink-3")}>
      {p.value}d{live && <span className="ml-1 inline-block size-1.5 animate-pulse rounded-full bg-amber-500 align-middle" />}
    </span>
  );
}

/** Chart categories: fixed order and colour per entity, so filtering never repaints a bar. */
const CHART_BUCKETS: { key: string; label: string; color: string; statuses: MilestoneStatus[] }[] = [
  { key: "holding", label: "Holding", color: "#c98a1c", statuses: ["funded", "submitted", "in_review"] },
  { key: "disputed", label: "Disputed", color: "#c2410c", statuses: ["disputed"] },
  { key: "released", label: "Released", color: "#148a6f", statuses: ["released"] },
  { key: "settled", label: "Settled", color: "#3266e3", statuses: ["settled", "refunded"] },
  { key: "unfunded", label: "Unfunded", color: "#b9b1a2", statuses: ["draft", "awaiting_funding"] },
];

function EscrowChartCard({ visible, total }: { visible: EscrowRow[]; total: number }) {
  const data = useMemo(
    () =>
      CHART_BUCKETS.map((b) => {
        const rs = visible.filter((r) => b.statuses.includes(r.status));
        return { key: b.key, label: b.label, color: b.color, cents: rs.reduce((s, r) => s + r.amountCents, 0), count: rs.length };
      }),
    [visible],
  );
  const inView = visible.reduce((s, r) => s + r.amountCents, 0);
  const held = data.filter((d) => d.key === "holding" || d.key === "disputed").reduce((s, d) => s + d.cents, 0);
  return (
    <ChartCard
      title="Escrow by milestone status"
      shown={visible.length}
      total={total}
      noun="milestones"
      stats={[
        { label: "Value in view", value: formatMoney(inView) },
        { label: "Held right now", value: formatMoney(held), swatch: "#c98a1c" },
      ]}
    >
      <EscrowStatusChart data={data} />
    </ChartCard>
  );
}

const ROW_RULES = { "bg-rose-50/60!": (p: { data?: EscrowRow }) => p.data?.status === "disputed" };

export function EscrowGrid({ rows, showWorkspace }: { rows: EscrowRow[]; showWorkspace: boolean }) {
  const [bucket, setBucket] = useState<Bucket>("holding");
  const chips = useMemo<Chip<Bucket>[]>(() => {
    const count = (b: Exclude<Bucket, "all">) => rows.filter((r) => BUCKETS[b].statuses.includes(r.status)).length;
    return [
      { key: "all", label: "All", count: rows.length },
      ...(Object.keys(BUCKETS) as Exclude<Bucket, "all">[]).map((k) => ({ key: k, label: BUCKETS[k].label, count: count(k) })),
    ];
  }, [rows]);

  const columns = useMemo<ColDef<EscrowRow>[]>(
    () => [
      pactColumn<EscrowRow>({ lockPinned: true }),
      {
        field: "status",
        headerName: "Status",
        width: 175,
        minWidth: 170,
        cellRenderer: StatusCell,
        enableCellChangeFlash: true,
        filterValueGetter: (p) => (p.data ? MILESTONE_STATUS_LABEL[p.data.status] : ""),
        getQuickFilterText: (p) => MILESTONE_STATUS_LABEL[p.data.status as MilestoneStatus],
      },
      { field: "amountCents", headerName: "Amount", type: "money", sort: "desc" },
      {
        colId: "parties",
        headerName: "Client → freelancer",
        valueGetter: (p) => (p.data ? `${p.data.client ?? ""} → ${p.data.freelancer ?? ""}` : null),
        cellRenderer: PartiesCell,
        flex: 1,
        minWidth: 170,
      },
      { field: "fundedAt", headerName: "Funded", type: "timestamp" },
      {
        colId: "days",
        headerName: "Days held",
        valueGetter: (p) => (p.data ? daysHeld(p.data) : null),
        cellRenderer: DaysCell,
        width: 110,
        minWidth: 105,
        filter: "agNumberColumnFilter",
        headerTooltip: "Days between capture and release (live for milestones still holding funds)",
      },
      { field: "captureId", headerName: "PayPal capture", type: "paypalId" },
      { field: "verdictScore", headerName: "Referee", width: 140, minWidth: 130, cellRenderer: VerdictCell, filter: "agNumberColumnFilter" },
      { field: "releasedPct", headerName: "Released", type: "pct", width: 105, headerTooltip: "Final share released to the freelancer" },
      { field: "workspace", headerName: "Workspace", width: 150, hide: !showWorkspace, cellClass: "font-mono text-[11.5px] text-ink-3", valueFormatter: (p) => p.value ?? "live" },
      { field: "id", headerName: "Milestone id", type: "paypalId", width: 160, hide: true },
    ],
    [showWorkspace],
  );

  const statuses = bucket === "all" ? null : new Set(BUCKETS[bucket].statuses);
  const filter = statuses ? (r: EscrowRow) => statuses.has(r.status) : null;
  const [visible, setVisible] = useState<EscrowRow[] | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <EscrowChartCard visible={visible ?? (filter ? rows.filter(filter) : rows)} total={rows.length} />
      <OpsGrid<EscrowRow>
        id="escrow"
        rows={rows}
        columns={columns}
        getRowId={byId}
        onDisplayedRowsChange={setVisible}
        noun={["milestone", "milestones"]}
        externalFilter={filter}
        externalFilterKey={bucket}
        toolbar={<FilterChips chips={chips} value={bucket} onChange={setBucket} />}
        searchPlaceholder="Search milestones…"
        emptyText="No milestones in this view."
        floatingFilters
        totals={(visible) => ({
          pactTitle: `Total · ${visible.length} milestone${visible.length === 1 ? "" : "s"}`,
          amountCents: visible.reduce((s, r) => s + r.amountCents, 0),
          currency: "USD",
        })}
        rowClassRules={ROW_RULES}
      />
    </div>
  );
}
