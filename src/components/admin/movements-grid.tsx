"use client";

import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ArrowDownLeft, ArrowUpRight, RotateCcw, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { MovementRow, MovementType } from "@/lib/domain/ops";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { centered, FilterChips, OpsGrid, pactColumn, type Chip } from "./grid-kit";

const TYPE_META: Record<MovementType, { label: string; tone: "sky" | "jade" | "ember"; icon: React.ElementType; ids: [string, string] }> = {
  capture: { label: "Capture", tone: "sky", icon: ArrowDownLeft, ids: ["Capture id", "Order id"] },
  payout: { label: "Payout", tone: "jade", icon: ArrowUpRight, ids: ["Payout item", "Batch id"] },
  refund: { label: "Refund", tone: "ember", icon: RotateCcw, ids: ["Refund id", "Capture id"] },
};

const FAILED = new Set(["FAILED", "RETURNED", "BLOCKED", "DENIED", "REFUSED", "CANCELED", "REVERSED"]);
const DONE = new Set(["COMPLETED", "SUCCESS"]);
const WAITING = new Set(["NEEDS_PAYOUT_EMAIL", "UNCLAIMED", "ONHOLD"]);

export function statusTone(status: string): "jade" | "amber" | "rose" | "sky" | "neutral" {
  if (DONE.has(status)) return "jade";
  if (FAILED.has(status)) return "rose";
  if (WAITING.has(status)) return "amber";
  if (["PENDING", "PROCESSING", "QUEUED", "APPROVED", "CREATED"].includes(status)) return "sky";
  return "neutral";
}
const statusLabel = (s: string) => (s === "NEEDS_PAYOUT_EMAIL" ? "Needs payout email" : s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " "));

function TypeCell(p: ICellRendererParams<MovementRow>) {
  if (p.node.rowPinned) return <span className="font-semibold">{p.value}</span>;
  if (!p.data) return null;
  const m = TYPE_META[p.data.type];
  return centered(
    <Badge tone={m.tone}>
      <m.icon />
      {m.label}
    </Badge>,
  );
}

function StatusCell(p: ICellRendererParams<MovementRow>) {
  if (p.node.rowPinned || !p.data) return null;
  return centered(
    <Badge tone={statusTone(p.data.status)} dot>
      {statusLabel(p.data.status)}
    </Badge>,
  );
}

function AmountCell(p: ICellRendererParams<MovementRow>) {
  const v = p.value as number | null;
  if (v == null) return null;
  return (
    <span className={cn("num font-medium", v > 0 ? "text-jade-700" : v < 0 ? "text-ink" : "text-ink-3")}>
      {v > 0 ? "+" : v < 0 ? "−" : ""}
      {formatMoney(Math.abs(v))}
    </span>
  );
}

function IdsCell(p: ICellRendererParams<MovementRow>) {
  if (p.node.rowPinned || !p.data) return null;
  const [a, b] = TYPE_META[p.data.type].ids;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center gap-0.5 font-mono text-[11px] leading-tight">
      <span className="truncate text-ink" title={`${a}: ${p.data.primaryId ?? "—"}`}>{p.data.primaryId ?? "—"}</span>
      <span className="truncate text-ink-3" title={`${b}: ${p.data.secondaryId ?? "—"}`}>{p.data.secondaryId ?? "—"}</span>
    </div>
  );
}

const humanize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

function ChargebackCell(p: ICellRendererParams<MovementRow>) {
  const d = p.data?.paypalDispute;
  if (p.node.rowPinned || !p.data) return null;
  if (!d) return p.data.type === "capture" ? <span className="text-[12px] text-ink-3">None</span> : null;
  const open = d.status !== "RESOLVED";
  return centered(
    <Badge tone={open ? "rose" : "neutral"} title={`${d.id} · ${humanize(d.reason)}${d.stage ? ` · ${humanize(d.stage)}` : ""}${d.outcome ? ` · outcome: ${humanize(d.outcome)}` : ""}`}>
      <ShieldAlert /> {open ? humanize(d.status) : `Resolved${d.outcome ? ` · ${humanize(d.outcome)}` : ""}`}
    </Badge>,
  );
}

function ModeCell(p: ICellRendererParams<MovementRow, unknown, { paypalEnv: string }>) {
  if (p.node.rowPinned || !p.data) return null;
  if (p.data.simulated) return centered(<Badge>Simulator</Badge>);
  return centered(<Badge tone={p.context.paypalEnv === "live" ? "jade" : "sky"}>{p.context.paypalEnv === "live" ? "Live" : "Sandbox"}</Badge>);
}

const movementId = (r: MovementRow) => `${r.type}:${r.id}`;

const ROW_RULES = {
  "bg-rose-50/50!": (p: { data?: MovementRow }) => Boolean(p.data?.paypalDispute && p.data.paypalDispute.status !== "RESOLVED"),
  "bg-rose-50/70!": (p: { data?: MovementRow }) => Boolean(p.data && FAILED.has(p.data.status)),
  "bg-amber-50/70!": (p: { data?: MovementRow }) => Boolean(p.data && WAITING.has(p.data.status)),
};

export function MovementsGrid({ rows, paypalEnv }: { rows: MovementRow[]; paypalEnv: string }) {
  const [type, setType] = useState<MovementType | "all">("all");
  const chips = useMemo<Chip<MovementType | "all">[]>(
    () => [
      { key: "all", label: "All movements", count: rows.length },
      { key: "capture", label: "Captures", count: rows.filter((r) => r.type === "capture").length },
      { key: "payout", label: "Payouts", count: rows.filter((r) => r.type === "payout").length },
      { key: "refund", label: "Refunds", count: rows.filter((r) => r.type === "refund").length },
    ],
    [rows],
  );

  const columns = useMemo<ColDef<MovementRow>[]>(
    () => [
      {
        field: "type",
        headerName: "Type",
        cellRenderer: TypeCell,
        width: 120,
        pinned: "left",
        filterValueGetter: (p) => (p.data ? TYPE_META[p.data.type].label : ""),
      },
      { field: "at", headerName: "When", type: "timestamp", sort: "desc" },
      pactColumn<MovementRow>({ pinned: null }),
      { field: "status", headerName: "Status", cellRenderer: StatusCell, width: 170, enableCellChangeFlash: true, filterValueGetter: (p) => (p.data ? statusLabel(p.data.status) : "") },
      { field: "amountCents", headerName: "Gross", type: "money", cellRenderer: AmountCell, headerTooltip: "Signed from Kept's books: + into PayPal balance, − out" },
      { field: "paypalFeeCents", headerName: "PayPal fee", type: "money", width: 115 },
      { field: "netCents", headerName: "Net", type: "money", cellRenderer: AmountCell },
      {
        colId: "ids",
        headerName: "PayPal ids",
        valueGetter: (p) => (p.data ? [p.data.primaryId, p.data.secondaryId].filter(Boolean).join(" ") : null),
        cellRenderer: IdsCell,
        width: 220,
        headerTooltip: "Capture + order for captures · item + batch for payouts · refund + original capture for refunds",
        context: { noExport: true },
      },
      // Exported separately; shown together in the "PayPal ids" cell.
      { field: "primaryId", headerName: "PayPal id", hide: true, context: { alwaysExport: true } },
      { field: "secondaryId", headerName: "Order / batch id", hide: true, context: { alwaysExport: true } },
      {
        colId: "chargeback",
        headerName: "PayPal dispute",
        valueGetter: (p) => (p.data?.paypalDispute ? `${p.data.paypalDispute.status} ${p.data.paypalDispute.reason}` : ""),
        cellRenderer: ChargebackCell,
        width: 170,
        headerTooltip: "Chargeback shield: disputes the payer opened with PayPal. Kept answers them with the pact, the evidence and the referee's verdict.",
      },
      { field: "counterparty", headerName: "Payer / receiver", width: 210, cellClass: "text-ink-2", valueFormatter: (p) => (p.value ? String(p.value) : p.node?.rowPinned ? "" : "—") },
      { colId: "mode", headerName: "Rail", width: 110, valueGetter: (p) => (p.data?.simulated ? "Simulator" : paypalEnv), cellRenderer: ModeCell },
      { field: "detail", headerName: "Detail", flex: 1, minWidth: 220, cellClass: "text-ink-3", tooltip: (p) => p.value ?? undefined },
    ],
    [paypalEnv],
  );

  return (
    <OpsGrid<MovementRow>
      id="paypal"
      rows={rows}
      columns={columns}
      getRowId={movementId}
      noun={["movement", "movements"]}
      context={{ paypalEnv }}
      externalFilter={type === "all" ? null : (r) => r.type === type}
      externalFilterKey={type}
      toolbar={<FilterChips chips={chips} value={type} onChange={setType} />}
      searchPlaceholder="Search ids, emails, pacts…"
      emptyText="No PayPal money movement yet. Fund a milestone to see the Orders v2 capture land here."
      rowClassRules={ROW_RULES}
      totals={(visible) => {
        const inflow = visible.reduce((s, r) => s + Math.max(0, r.amountCents), 0);
        const outflow = visible.reduce((s, r) => s + Math.min(0, r.amountCents), 0);
        return {
          type: "Net",
          pactTitle: `In ${formatMoney(inflow)} · out ${formatMoney(-outflow)}`,
          amountCents: inflow + outflow,
          paypalFeeCents: visible.reduce((s, r) => s + (r.paypalFeeCents ?? 0), 0),
          netCents: visible.reduce((s, r) => s + r.netCents, 0),
        };
      }}
    />
  );
}
