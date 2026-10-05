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
  autoHeightMinBodyHeight: 44,
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

/* ------------------------------------------------------------------ */
/* Full-width detail rows (Community stand-in for master/detail)       */
/* ------------------------------------------------------------------ */

/**
 * A detail row is a shallow copy of its parent, so every column value (and so
 * every filter and the quick filter) matches the parent exactly. `postSortRows`
 * then pins it directly beneath the parent whatever the sort.
 */
const DETAIL_INFO = new WeakMap<object, { parentId: string; parent: unknown }>();
const DETAIL_OF = new WeakMap<object, object>();

function detailFor<T>(parent: T, parentId: string): T {
  const key = parent as object;
  const cached = DETAIL_OF.get(key);
  if (cached) return cached as T;
  const d = { ...(parent as object) };
  DETAIL_INFO.set(d, { parentId, parent });
  DETAIL_OF.set(key, d);
  return d as T;
}

const detailInfo = (d: unknown) => (typeof d === "object" && d !== null ? DETAIL_INFO.get(d) : undefined);
export const isDetailRow = (d: unknown) => detailInfo(d) !== undefined;

export interface DetailConfig<T> {
  /** Content of the full-width row shown under an expanded row. */
  render: (row: T) => React.ReactNode;
  /** First-guess height; the row is re-measured once rendered. */
  estimateHeight: (row: T) => number;
  /** Accessible name for the expand toggle. */
  label?: (row: T) => string;
}

interface OpsInternals {
  renderDetail: (row: unknown) => React.ReactNode;
  toggle: (id: string) => void;
  isExpanded: (id: string) => boolean;
  rememberHeight: (id: string, h: number) => void;
  label: (row: unknown) => string;
}
type InternalCtx = { __ops?: OpsInternals };

function DetailRow(p: ICellRendererParams) {
  const info = detailInfo(p.data);
  const ref = useRef<HTMLDivElement>(null);
  const ops = (p.context as InternalCtx).__ops;
  const { node, api } = p;
  useEffect(() => {
    const el = ref.current;
    if (!el || !info || !ops) return;
    const sync = () => {
      const h = Math.ceil(el.offsetHeight);
      if (h <= 0) return;
      ops.rememberHeight(info.parentId, h);
      if (Math.abs((node.rowHeight ?? 0) - h) > 1) {
        node.setRowHeight(h);
        api.onRowHeightChanged();
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [info, ops, node, api]);
  if (!info || !ops) return null;
  return (
    <div ref={ref} className="whitespace-normal">
      {ops.renderDetail(info.parent)}
    </div>
  );
}

function ExpandCell(p: ICellRendererParams) {
  const ops = (p.context as InternalCtx).__ops;
  if (p.node.rowPinned || !p.node.id || !ops) return null;
  const id = p.node.id;
  const open = ops.isExpanded(id);
  return (
    <div className="flex h-full items-center justify-center">
      <button
        type="button"
        tabIndex={-1}
        aria-expanded={open}
        aria-label={`${open ? "Hide" : "Show"} details: ${ops.label(p.data)}`}
        onClick={(e) => {
          e.stopPropagation();
          ops.toggle(id);
        }}
        className={cn(
          "flex size-6 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink",
          open && "bg-ink text-paper hover:bg-ink hover:text-paper",
        )}
      >
        <ChevronRight className={cn("size-3.5 transition-transform duration-200", open && "rotate-90")} />
      </button>
    </div>
  );
}

const EXPAND_COL: ColDef = {
  colId: "__expand",
  headerName: "",
  width: 46,
  minWidth: 46,
  maxWidth: 46,
  pinned: "left",
  lockPosition: "left",
  lockPinned: true,
  sortable: false,
  filter: false,
  resizable: false,
  suppressMovable: true,
  suppressNavigable: false,
  floatingFilter: false,
  cellRenderer: ExpandCell,
  cellClass: "px-0!",
  context: { noExport: true },
  headerTooltip: "Click a row (or press Enter) to expand its details",
};

/* ------------------------------------------------------------------ */
/* OpsGrid: one consistent wrapper for every console table             */
/* ------------------------------------------------------------------ */

const STATE_VERSION = 1;
const storageKey = (id: string) => `kept.ops.grid.${id}.v${STATE_VERSION}`;

function loadState(id: string): GridState | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(storageKey(id));
    if (!raw) return undefined;
    // Pinning follows the viewport (see the responsive effect below), so it is never restored.
    const { columnPinning: _ignored, ...rest } = JSON.parse(raw) as GridState;
    void _ignored;
    return rest;
  } catch {
    return undefined;
  }
}

function saveState(id: string, state: GridState) {
  try {
    // Persist the user's layout only — not selection, focus, scroll or pinning.
    const { columnOrder, columnSizing, columnVisibility, sort, filter } = state;
    window.localStorage.setItem(storageKey(id), JSON.stringify({ columnOrder, columnSizing, columnVisibility, sort, filter }));
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

const ROW_H = 44;

export interface OpsGridProps<T> {
  /** Stable id: storage key for column state and CSV file name. */
  id: string;
  rows: T[];
  columns: ColDef<T>[];
  /** Keep this stable (module-level), e.g. `byId`. */
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
  /** Maximum height; shorter tables shrink-wrap their rows. */
  height?: number;
  floatingFilters?: boolean;
  pagination?: boolean;
  enableCellSpan?: boolean;
  context?: Record<string, unknown>;
  onGridApi?: (api: GridApi<T>) => void;
  /** Called with the rows passing every filter, in display order, whenever the grid's model changes. */
  onDisplayedRowsChange?: (rows: T[]) => void;
  /** Expandable full-width detail rows. Memoise the object. */
  detail?: DetailConfig<T>;
  /** Singular / plural noun for the row counter. */
  noun?: [string, string];
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
  onDisplayedRowsChange,
  detail,
  noun = ["row", "rows"],
  className,
}: OpsGridProps<T>) {
  const [api, setApi] = useState<GridApi<T> | null>(null);
  const [ready, setReady] = useState(false);
  const [quick, setQuick] = useState("");
  const [shown, setShown] = useState(rows.length);
  const [displayed, setDisplayed] = useState(rows.length);
  const [pinned, setPinned] = useState<Record<string, unknown>[] | undefined>(undefined);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [initialState] = useState(() => loadState(id));
  const [heights] = useState(() => new Map<string, number>());
  const wide = useMediaQuery("(min-width: 768px)");
  // Latest callbacks live in refs so the grid gets stable function props.
  const filterRef = useRef(externalFilter);
  const totalsRef = useRef(totals);
  const rowIdRef = useRef(getRowId);
  const detailRef = useRef(detail);
  const displayedCbRef = useRef(onDisplayedRowsChange);
  const expandedRef = useRef(expanded);
  const prevIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    filterRef.current = externalFilter;
    totalsRef.current = totals;
    rowIdRef.current = getRowId;
    detailRef.current = detail;
    displayedCbRef.current = onDisplayedRowsChange;
    expandedRef.current = expanded;
  });

  useEffect(() => {
    api?.onFilterChanged();
  }, [api, externalFilterKey]);

  // Phones: unpin the wide "Pact" column so the scrolling area isn't a 40px sliver.
  useEffect(() => {
    if (!api) return;
    const state = columns.filter((c) => c.pinned && c.colId === "pact").map((c) => ({ colId: "pact", pinned: wide ? c.pinned : null }));
    if (state.length) api.applyColumnState({ state });
  }, [api, wide, columns]);

  // Expanded set changed: redraw the toggle icons.
  useEffect(() => {
    api?.refreshCells({ columns: ["__expand"], force: true });
  }, [api, expanded]);

  const toggle = useCallback((rowId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

  const displayRows = useMemo(() => {
    if (!detail || expanded.size === 0) return rows;
    const out: T[] = [];
    for (const r of rows) {
      out.push(r);
      const rid = getRowId(r);
      if (expanded.has(rid)) out.push(detailFor(r, rid));
    }
    return out;
  }, [rows, expanded, detail, getRowId]);

  const allColumns = useMemo<ColDef<T>[]>(() => (detail ? [EXPAND_COL as ColDef<T>, ...columns] : columns), [columns, detail]);
  const hasDetail = Boolean(detail);

  const internals = useMemo<OpsInternals>(
    () => ({
      renderDetail: (row) => detailRef.current?.render(row as T) ?? null,
      toggle,
      isExpanded: (rid) => expandedRef.current.has(rid),
      rememberHeight: (rid, h) => heights.set(rid, h),
      label: (row) => detailRef.current?.label?.(row as T) ?? "row",
    }),
    [toggle, heights],
  );
  const gridContext = useMemo(() => ({ ...context, __ops: internals }), [context, internals]);

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

  // Date floating filters need room for "mm/dd/yyyy" plus the filter button.
  const columnTypes = useMemo(
    () => (floatingFilters ? { ...opsColumnTypes, timestamp: { ...opsColumnTypes.timestamp, width: 186, minWidth: 186 } } : opsColumnTypes),
    [floatingFilters],
  );

  // Stable callbacks so AG Grid never sees "new" options on re-render.
  const gridRowId = useCallback((p: GetRowIdParams<T>) => {
    if (p.rowPinned) return `pinned-${p.rowPinned}`;
    const info = detailInfo(p.data);
    return info ? `${info.parentId}::detail` : rowIdRef.current(p.data);
  }, []);
  const isExternalFilterPresent = useCallback(() => Boolean(filterRef.current), []);
  const doesExternalFilterPass = useCallback((node: IRowNode<T>) => (node.data && filterRef.current ? filterRef.current(node.data) : true), []);
  const getRowStyle = useCallback((p: RowClassParams<T>) => (p.node.rowPinned === "bottom" ? { fontWeight: 600, background: "#faf8f3" } : undefined), []);
  const onStateUpdated = useCallback((e: StateUpdatedEvent<T>) => saveState(id, e.state), [id]);
  const isFullWidthRow = useCallback((p: IsFullWidthRowParams<T>) => isDetailRow(p.rowNode.data), []);
  const getRowHeight = useCallback(
    (p: RowHeightParams<T>) => {
      const info = detailInfo(p.data);
      if (!info) return undefined;
      return heights.get(info.parentId) ?? detailRef.current?.estimateHeight(info.parent as T) ?? 240;
    },
    [heights],
  );
  const postSortRows = useCallback((p: PostSortRowsParams<T>) => {
    const nodes = p.nodes;
    const details = new Map<string, IRowNode<T>>();
    const rest: IRowNode<T>[] = [];
    for (const n of nodes) {
      const info = detailInfo(n.data);
      if (info) details.set(info.parentId, n);
      else rest.push(n);
    }
    if (!details.size) return;
    nodes.length = 0;
    for (const n of rest) {
      nodes.push(n);
      const d = n.id ? details.get(n.id) : undefined;
      if (d) nodes.push(d);
    }
  }, []);
  const onCellClicked = useCallback(
    (e: CellClickedEvent<T>) => {
      if (!hasDetail || !e.node.id || e.node.rowPinned || isDetailRow(e.data)) return;
      const target = (e.event?.target ?? null) as HTMLElement | null;
      if (target?.closest("a,button,input")) return;
      // Don't hijack text selection.
      if (typeof window !== "undefined" && window.getSelection()?.toString()) return;
      toggle(e.node.id);
    },
    [hasDetail, toggle],
  );
  const onCellKeyDown = useCallback(
    (e: CellKeyDownEvent<T> | FullWidthCellKeyDownEvent<T>) => {
      const key = (e.event as KeyboardEvent | null | undefined)?.key;
      if (!hasDetail || key !== "Enter" || !e.node.id || e.node.rowPinned) return;
      const info = detailInfo(e.data);
      toggle(info ? info.parentId : e.node.id);
    },
    [hasDetail, toggle],
  );

  // Size fixed columns to their content once; flex columns soak up the remaining width.
  // Skipped when the viewer has their own saved column widths.
  const autoSizeStrategy = useMemo(() => {
    if (initialState?.columnSizing) return undefined;
    const colIds = columns.filter((c) => !c.flex && !c.hide).map((c) => c.colId ?? String(c.field));
    return { type: "fitCellContents", colIds, defaultMaxWidth: 280 } as const;
  }, [initialState, columns]);
  const noRows = useMemo(
    () => `<span style="font-size:13px;color:#6f6a60;max-width:440px;text-align:center;line-height:1.55;padding:0 16px">${escapeHtml(emptyText)}</span>`,
    [emptyText],
  );

  const recompute = useCallback((gridApi: GridApi<T>) => {
    const visible: T[] = [];
    gridApi.forEachNodeAfterFilterAndSort((n) => {
      if (n.data && !isDetailRow(n.data)) visible.push(n.data);
    });
    setShown(visible.length);
    setDisplayed(gridApi.getDisplayedRowCount());
    displayedCbRef.current?.(visible);
    const make = totalsRef.current;
    if (!make) return;
    const next = [make(visible)];
    setPinned((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, []);

  const onModelUpdated = useCallback((e: ModelUpdatedEvent<T>) => recompute(e.api), [recompute]);

  // Live refresh: rows that weren't there a moment ago flash once.
  const onRowDataUpdated = useCallback((e: RowDataUpdatedEvent<T>) => {
    const ids = new Set<string>();
    const added: IRowNode<T>[] = [];
    const prev = prevIds.current;
    e.api.forEachNode((n) => {
      if (!n.id || isDetailRow(n.data)) return;
      ids.add(n.id);
      if (prev && !prev.has(n.id)) added.push(n);
    });
    prevIds.current = ids;
    if (added.length && added.length <= 50) e.api.flashCells({ rowNodes: added });
  }, []);

  const onGridReady = useCallback(
    (e: GridReadyEvent<T>) => {
      setApi(e.api);
      onGridApi?.(e.api);
      prevIds.current = null;
      requestAnimationFrame(() => setReady(true));
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
    api.exportDataAsCsv({
      fileName: `kept-${id}-${new Date().toISOString().slice(0, 10)}.csv`,
      columnKeys,
      shouldRowBeSkipped: (p) => isDetailRow(p.node.data),
    });
  };

  const resetLayout = () => {
    if (!api) return;
    clearState(id);
    api.resetColumnState();
    api.setFilterModel(null);
    setQuick("");
    setExpanded(new Set());
    api.sizeColumnsToFit();
  };

  const filtered = shown !== rows.length;
  // Shrink-wrap short tables to their rows (no blank padding); cap long ones and let
  // AG Grid's row virtualisation take over. (+16 leaves room for a horizontal scrollbar.)
  const chrome = 40 + (floatingFilters ? 40 : 0) + (totals ? 44 : 0) + (pagination ? 49 : 0) + 2 + 16;
  const fitRows = Math.floor((height - chrome) / ROW_H);
  const autoHeight = displayed > 0 && displayed <= fitRows;
  const fixedHeight = displayed === 0 ? chrome + 120 : height;
  const placeholderHeight = Math.min(height, chrome + Math.max(2, Math.min(displayed || 3, fitRows)) * ROW_H);

  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-[230px]">
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
          <span className="num mr-1 text-[12px] text-ink-3" aria-live="polite">
            {filtered ? (
              <>
                <b className="font-semibold text-ink-2">{shown.toLocaleString("en-US")}</b> of {plural(rows.length, noun[0], noun[1])}
              </>
            ) : (
              plural(rows.length, noun[0], noun[1])
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
      <div
        style={ready ? (autoHeight ? undefined : { height: fixedHeight }) : { height: placeholderHeight }}
        className="relative min-w-0 [&_.ag-cell-value]:h-full! [&_.ag-cell-wrapper]:h-full! [&_.ag-scrollbar-invisible_.ag-body-horizontal-scroll-viewport]:bg-transparent!"
      >
        <AgGridReact<T>
          theme={opsGridTheme}
          rowData={displayRows}
          columnDefs={allColumns}
          columnTypes={columnTypes}
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
          onRowDataUpdated={onRowDataUpdated}
          context={gridContext}
          domLayout={ready && autoHeight ? "autoHeight" : "normal"}
          tooltipShowDelay={250}
          tooltipShowMode="standard"
          enableCellTextSelection
          ensureDomOrder
          enableCellSpan={enableCellSpan}
          pagination={pagination}
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100, 250]}
          cellFlashDuration={900}
          cellFadeDuration={1600}
          animateRows
          overlayNoRowsTemplate={noRows}
          isFullWidthRow={hasDetail ? isFullWidthRow : undefined}
          fullWidthCellRenderer={hasDetail ? DetailRow : undefined}
          getRowHeight={hasDetail ? getRowHeight : undefined}
          postSortRows={hasDetail ? postSortRows : undefined}
          onCellClicked={hasDetail ? onCellClicked : undefined}
          onCellKeyDown={hasDetail ? onCellKeyDown : undefined}
          rowClass={hasDetail ? "cursor-pointer" : undefined}
        />
        {!ready && <GridSkeleton rows={Math.max(2, Math.min(displayed || 3, fitRows))} floating={floatingFilters} />}
      </div>
    </div>
  );
}

/** Painted (server-side too) until AG Grid has mounted, so tables never pop in from a blank box. */
export function GridSkeleton({ rows, floating = false, rowHeight = ROW_H }: { rows: number; floating?: boolean; rowHeight?: number }) {
  return (
    <div aria-hidden className="absolute inset-0 z-10 overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex h-10 items-center gap-6 border-b border-line bg-paper px-3">
        {[90, 140, 70, 110, 80].map((w, i) => (
          <div key={i} style={{ width: w }}>
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
        ))}
      </div>
      {floating && <div className="h-10 border-b border-line bg-paper/60" />}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-line/70 px-3" style={{ height: rowHeight }}>
          <Skeleton className="h-3 w-40 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="hidden h-3 w-28 rounded-full sm:block" />
          <Skeleton className="hidden h-3 w-20 rounded-full md:block" />
        </div>
      ))}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
