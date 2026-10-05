"use client";

import type {
  ColDef,
  ColTypeDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  GridState,
  ICellRendererParams,
  IRowNode,
  ModelUpdatedEvent,
  RowClassParams,
  RowClassRules,
  StateUpdatedEvent,
  ValueFormatterParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { ArrowUpRight, Download, RotateCcw, Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keptGridTheme } from "@/components/grid/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";

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

/* ------------------------------------------------------------------ */
/* OpsGrid: one consistent wrapper for every console table             */
/* ------------------------------------------------------------------ */

const STATE_VERSION = 1;
const storageKey = (id: string) => `kept.ops.grid.${id}.v${STATE_VERSION}`;

function loadState(id: string): GridState | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(storageKey(id));
    return raw ? (JSON.parse(raw) as GridState) : undefined;
  } catch {
    return undefined;
  }
}

function saveState(id: string, state: GridState) {
  try {
    // Persist the user's layout only — not selection, focus or scroll.
    const { columnOrder, columnPinning, columnSizing, columnVisibility, sort, filter } = state;
    window.localStorage.setItem(storageKey(id), JSON.stringify({ columnOrder, columnPinning, columnSizing, columnVisibility, sort, filter }));
  } catch {
    /* storage disabled — layout just won't persist */
  }
}

function clearState(id: string) {
  try {
    window.localStorage.removeItem(storageKey(id));
  } catch {
    /* ignore */
  }
}

export interface OpsGridProps<T> {
  /** Stable id: storage key for column state and CSV file name. */
  id: string;
  rows: T[];
  columns: ColDef<T>[];
  getRowId: (row: T) => string;
  /** Builds the pinned bottom row from the rows currently passing all filters. */
  totals?: (rows: T[]) => Record<string, unknown>;
  rowClassRules?: RowClassRules<T>;
  /** External filter (e.g. chip bar). Change `externalFilterKey` to re-run it. */
  externalFilter?: ((row: T) => boolean) | null;
  externalFilterKey?: string;
  toolbar?: React.ReactNode;
  searchPlaceholder?: string;
  emptyText?: string;
  height?: number;
  floatingFilters?: boolean;
  pagination?: boolean;
  enableCellSpan?: boolean;
  context?: Record<string, unknown>;
  onGridApi?: (api: GridApi<T>) => void;
  className?: string;
}

export function OpsGrid<T>({
  id,
  rows,
  columns,
  getRowId,
  totals,
  rowClassRules,
  externalFilter,
  externalFilterKey,
  toolbar,
  searchPlaceholder = "Search…",
  emptyText = "Nothing here yet.",
  height = 520,
  floatingFilters = false,
  pagination = false,
  enableCellSpan = false,
  context,
  onGridApi,
  className,
}: OpsGridProps<T>) {
  const [api, setApi] = useState<GridApi<T> | null>(null);
  const [quick, setQuick] = useState("");
  const [shown, setShown] = useState(rows.length);
  const [pinned, setPinned] = useState<Record<string, unknown>[] | undefined>(undefined);
  const [initialState] = useState(() => loadState(id));
  // Latest callbacks live in refs so the grid gets stable function props.
  const filterRef = useRef(externalFilter);
  const totalsRef = useRef(totals);
  const rowIdRef = useRef(getRowId);
  useEffect(() => {
    filterRef.current = externalFilter;
    totalsRef.current = totals;
    rowIdRef.current = getRowId;
  });

  useEffect(() => {
    api?.onFilterChanged();
  }, [api, externalFilterKey]);

  const defaultColDef = useMemo<ColDef<T>>(
    () => ({
      sortable: true,
      resizable: true,
      filter: "agTextColumnFilter",
      floatingFilter: floatingFilters,
      // With floating filters the funnel lives in the filter row; keep headers clean.
      suppressHeaderFilterButton: floatingFilters,
      suppressHeaderMenuButton: true,
      minWidth: 80,
      filterParams: { buttons: ["reset"], maxNumConditions: 1 },
    }),
    [floatingFilters],
  );

  // Stable callbacks so AG Grid never sees "new" options on re-render.
  const gridRowId = useCallback((p: GetRowIdParams<T>) => (p.rowPinned ? `pinned-${p.rowPinned}` : rowIdRef.current(p.data)), []);
  const isExternalFilterPresent = useCallback(() => Boolean(filterRef.current), []);
  const doesExternalFilterPass = useCallback((node: IRowNode<T>) => (node.data && filterRef.current ? filterRef.current(node.data) : true), []);
  const getRowStyle = useCallback((p: RowClassParams<T>) => (p.node.rowPinned === "bottom" ? { fontWeight: 600, background: "#faf8f3" } : undefined), []);
  const onStateUpdated = useCallback((e: StateUpdatedEvent<T>) => saveState(id, e.state), [id]);
  // Size fixed columns to their content once; flex columns soak up the remaining width.
  // Skipped when the viewer has their own saved column widths.
  const autoSizeStrategy = useMemo(() => {
    if (initialState?.columnSizing) return undefined;
    const colIds = columns.filter((c) => !c.flex && !c.hide).map((c) => c.colId ?? String(c.field));
    return { type: "fitCellContents", colIds, defaultMaxWidth: 280 } as const;
  }, [initialState, columns]);
  const noRows = useMemo(
    () => `<span style="font-size:13px;color:#8a857a;max-width:440px;text-align:center;line-height:1.55;padding:0 16px">${escapeHtml(emptyText)}</span>`,
    [emptyText],
  );

  const recompute = useCallback((gridApi: GridApi<T>) => {
    setShown(gridApi.getDisplayedRowCount());
    const make = totalsRef.current;
    if (!make) return;
    const visible: T[] = [];
    gridApi.forEachNodeAfterFilterAndSort((n) => n.data && visible.push(n.data));
    const next = [make(visible)];
    setPinned((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, []);

  const onModelUpdated = useCallback((e: ModelUpdatedEvent<T>) => recompute(e.api), [recompute]);

  const onGridReady = useCallback(
    (e: GridReadyEvent<T>) => {
      setApi(e.api);
      onGridApi?.(e.api);
    },
    [onGridApi],
  );

  const exportCsv = () => {
    if (!api) return;
    type ExportCtx = { noExport?: boolean; alwaysExport?: boolean } | undefined;
    const ctx = (c: { getColDef: () => ColDef<T> }) => c.getColDef().context as ExportCtx;
    const columnKeys = [
      ...api.getAllDisplayedColumns().filter((c) => !ctx(c)?.noExport),
      ...(api.getColumns() ?? []).filter((c) => !c.isVisible() && ctx(c)?.alwaysExport),
    ].map((c) => c.getColId());
    api.exportDataAsCsv({ fileName: `kept-${id}-${new Date().toISOString().slice(0, 10)}.csv`, columnKeys });
  };

  const resetLayout = () => {
    if (!api) return;
    clearState(id);
    api.resetColumnState();
    api.setFilterModel(null);
    setQuick("");
    api.sizeColumnsToFit();
  };

  const filtered = shown !== rows.length;
  // Shrink-wrap short tables, cap long ones (virtualised scrolling takes over).
  // (+16 leaves room for a horizontal scrollbar on narrow screens.)
  const chrome = 40 + (floatingFilters ? 40 : 0) + (totals ? 44 : 0) + (pagination ? 49 : 0) + 4 + 16;
  const gridHeight = Math.min(height, chrome + Math.max(4, shown) * 44);

  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-[230px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder={searchPlaceholder} className="h-8 rounded-full pl-9 pr-8 text-[13px]" aria-label={searchPlaceholder} />
          {quick && (
            <button onClick={() => setQuick("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-3 hover:bg-paper-2 hover:text-ink" aria-label="Clear search">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {toolbar}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="num mr-1 text-[12px] text-ink-3">
            {filtered ? (
              <>
                <b className="font-semibold text-ink-2">{shown}</b> of {rows.length}
              </>
            ) : (
              <>{rows.length} rows</>
            )}
          </span>
          <Button variant="ghost" size="sm" onClick={resetLayout} title="Reset columns, sorting and filters">
            <RotateCcw /> Reset
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download /> CSV
          </Button>
        </div>
      </div>
      {/* Let React cell renderers fill the cell so `items-center` really centres them. */}
      <div style={{ height: gridHeight }} className="min-w-0 [&_.ag-cell-value]:h-full! [&_.ag-cell-wrapper]:h-full!">
        <AgGridReact<T>
          theme={opsGridTheme}
          rowData={rows}
          columnDefs={columns}
          columnTypes={opsColumnTypes}
          defaultColDef={defaultColDef}
          getRowId={gridRowId}
          initialState={initialState}
          onStateUpdated={onStateUpdated}
          autoSizeStrategy={autoSizeStrategy}
          quickFilterText={quick}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          pinnedBottomRowData={totals ? pinned : undefined}
          rowClassRules={rowClassRules}
          getRowStyle={getRowStyle}
          onGridReady={onGridReady}
          onModelUpdated={onModelUpdated}
          context={context}
          tooltipShowDelay={250}
          tooltipShowMode="standard"
          enableCellTextSelection
          ensureDomOrder
          enableCellSpan={enableCellSpan}
          pagination={pagination}
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100, 250]}
          animateRows
          overlayNoRowsTemplate={noRows}
        />
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
