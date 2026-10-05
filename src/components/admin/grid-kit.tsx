"use client";

import type {
  CellClickedEvent,
  CellKeyDownEvent,
  ColDef,
  ColTypeDef,
  FullWidthCellKeyDownEvent,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  GridState,
  ICellRendererParams,
  IRowNode,
  IsFullWidthRowParams,
  ModelUpdatedEvent,
  PostSortRowsParams,
  RowClassParams,
  RowClassRules,
  RowDataUpdatedEvent,
  RowHeightParams,
  StateUpdatedEvent,
  ValueFormatterParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { ArrowUpRight, ChevronRight, Download, RotateCcw, Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { keptGridTheme } from "@/components/grid/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";

/* ------------------------------------------------------------------ */
/* Small shared helpers                                                */
/* ------------------------------------------------------------------ */

/** Stable row-id getter for rows keyed by `id` (keep it module-level so grids get a stable prop). */
export const byId = (r: { id: string }) => r.id;

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** `true` while the media query matches. Server render assumes `serverDefault`. */
export function useMediaQuery(query: string, serverDefault = true) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}

/* ------------------------------------------------------------------ */
/* Theme & column types                                                */
/* ------------------------------------------------------------------ */

/** Denser variant of Kept's Quartz theme for back-office tables. */
export const opsGridTheme = keptGridTheme.withParams({
  rowHeight: 44,
  headerHeight: 40,
  fontSize: 13,
  headerFontSize: 12,
  spacing: 6,
  wrapperBorderRadius: 16,
  cellHorizontalPadding: 12,
  pinnedRowBorder: { width: 1, color: "#d9d1c2" },
  pinnedColumnBorder: { width: 1, color: "#e7e1d5" },
  tooltipBackgroundColor: "#16140f",
  tooltipTextColor: "#faf8f3",
  tooltipBorder: false,
  inputFocusBorder: { color: "#148a6f" },
  // Live updates: changed values glow jade, then fade.
  valueChangeValueHighlightBackgroundColor: "#bfe3d5",
});

const DATE_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
export const fmtDateTime = (ms: number | null | undefined) => (ms == null ? "—" : DATE_FMT.format(new Date(ms)));

const centsOf = (v: unknown) => (typeof v === "number" ? v : null);

/** Shared column types: declare `type: "money"` etc. on a column instead of repeating formatters. */
export const opsColumnTypes: Record<string, ColTypeDef> = {
  money: {
    width: 130,
    minWidth: 110,
    headerClass: "ag-right-aligned-header",
    cellClass: "ag-right-aligned-cell num",
    enableCellChangeFlash: true,
    valueFormatter: (p: ValueFormatterParams) => {
      const v = centsOf(p.value);
      if (v == null) return p.node?.rowPinned ? "" : "—";
      return formatMoney(v, (p.data as { currency?: string } | undefined)?.currency ?? "USD");
    },
    filter: "agNumberColumnFilter",
    // People think in dollars, the data is in cents.
    filterValueGetter: (p) => {
      const v = p.api.getCellValue({ rowNode: p.node!, colKey: p.column });
      return typeof v === "number" ? v / 100 : null;
    },
    filterParams: { buttons: ["reset"], maxNumConditions: 1 },
  },
  timestamp: {
    width: 140,
    minWidth: 125,
    cellClass: "num text-ink-2",
    valueFormatter: (p: ValueFormatterParams) => (p.node?.rowPinned && p.value == null ? "" : fmtDateTime(p.value as number | null)),
    filter: "agDateColumnFilter",
    filterParams: {
      buttons: ["reset"],
      maxNumConditions: 1,
      comparator: (filterLocalDateAtMidnight: Date, cellValue: number | null) => {
        if (cellValue == null) return -1;
        const d = new Date(cellValue);
        const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const f = filterLocalDateAtMidnight.getTime();
        return day === f ? 0 : day < f ? -1 : 1;
      },
    },
  },
  paypalId: {
    width: 190,
    minWidth: 140,
    cellClass: "font-mono text-[11.5px] text-ink-2",
    valueFormatter: (p: ValueFormatterParams) => (p.value ? String(p.value) : p.node?.rowPinned ? "" : "—"),
    tooltip: (p) => (p.value ? String(p.value) : undefined),
    filter: "agTextColumnFilter",
  },
  pct: {
    width: 100,
    minWidth: 95,
    headerClass: "ag-right-aligned-header",
    cellClass: "ag-right-aligned-cell num",
    enableCellChangeFlash: true,
    valueFormatter: (p: ValueFormatterParams) => (p.value == null ? (p.node?.rowPinned ? "" : "—") : `${p.value}%`),
    filter: "agNumberColumnFilter",
  },
};

/* ------------------------------------------------------------------ */
/* Shared cell renderers                                               */
/* ------------------------------------------------------------------ */

interface PactLike {
  pactId?: string | null;
  pactTitle?: string | null;
  milestoneTitle?: string | null;
}

/** Value for a pact column: searchable, sortable and exported as "Pact — Milestone". */
export const pactValue = (p: { data?: PactLike }) => {
  const d = p.data;
  if (!d) return null;
  return d.pactId && d.milestoneTitle ? `${d.pactTitle} — ${d.milestoneTitle}` : (d.pactTitle ?? null);
};

/** Standard "Pact · milestone" column, pinned left with a deep link to the pact. */
export function pactColumn<T extends PactLike>(overrides: Partial<ColDef<T>> = {}): ColDef<T> {
  return {
    colId: "pact",
    headerName: "Pact · milestone",
    valueGetter: pactValue,
    cellRenderer: PactCell,
    pinned: "left",
    minWidth: 200,
    maxWidth: 300,
    tooltip: (p) => (p.node?.rowPinned ? undefined : (pactValue({ data: p.data }) ?? undefined)),
    ...overrides,
  };
}

/** Pact title (links to the pact) with the milestone underneath. */
export function PactCell(p: ICellRendererParams<PactLike>) {
  if (p.node.rowPinned) return <span className="font-semibold text-ink">{p.value}</span>;
  const d = p.data;
  if (!d?.pactId) return <span className="text-ink-3">—</span>;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center leading-tight">
      <Link
        href={`/app/pacts/${d.pactId}`}
        className="group/pact flex min-w-0 items-center gap-1 truncate font-medium text-ink hover:text-jade-700"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="truncate">{d.pactTitle}</span>
        <ArrowUpRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover/pact:opacity-100" />
      </Link>
      {d.milestoneTitle && <span className="truncate text-[11.5px] text-ink-3">{d.milestoneTitle}</span>}
    </div>
  );
}

/** Small inline bar for 0–100 scores. */
export function ScoreBar({ value, tone }: { value: number; tone?: "jade" | "amber" | "rose" }) {
  const t = tone ?? (value >= 80 ? "jade" : value >= 50 ? "amber" : "rose");
  return (
    <div className="flex h-full items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-paper-2">
        <div
          className={cn("h-full rounded-full", t === "jade" ? "bg-jade-500" : t === "amber" ? "bg-amber-500" : "bg-rose-500")}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
      <span className="num w-7 text-right text-[12.5px] font-medium text-ink">{value}</span>
    </div>
  );
}

export function centered(children: React.ReactNode) {
  return <div className="flex h-full items-center">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Filter chips (Community stand-in for the Set Filter)                */
/* ------------------------------------------------------------------ */

export interface Chip<K extends string> {
  key: K;
  label: string;
  count?: number;
}

export function FilterChips<K extends string>({ chips, value, onChange }: { chips: Chip<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup">
      {chips.map((c) => (
        <button
          key={c.key}
          role="radio"
          aria-checked={value === c.key}
          onClick={() => onChange(c.key)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors",
            value === c.key ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2 hover:border-line-2 hover:text-ink",
          )}
        >
          {c.label}
          {c.count !== undefined && <span className={cn("num rounded-full px-1.5 text-[11px]", value === c.key ? "bg-paper/15" : "bg-paper-2 text-ink-3")}>{c.count}</span>}
        </button>
      ))}
    </div>
  );
}

