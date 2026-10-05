"use client";

import type { CellKeyDownEvent, ColDef, FullWidthCellKeyDownEvent, GridApi, GridReadyEvent, ICellRendererParams, RowClickedEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Bot, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GridSkeleton, opsColumnTypes, plural } from "@/components/admin/grid-kit";
import { MilestoneStatusBadge, PactStatusBadge } from "@/components/app/status";
import { Input } from "@/components/ui/input";
import type { Dashboard } from "@/lib/domain/queries";
import { PACT_STATUS_LABEL } from "@/lib/domain/state";
import { formatMoney } from "@/lib/money";
import { keptGridTheme } from "./theme";

type Row = Dashboard["pacts"][number];
type Ctx = { compact: boolean };

const ROW_H = 56;
const HEADER_H = 42;

/** Lower-value columns drop out as the grid narrows (grid width, not viewport). */
const BREAKPOINTS: { colId: string; minWidth: number }[] = [
  { colId: "role", minWidth: 1180 },
  { colId: "progress", minWidth: 940 },
  { colId: "next", minWidth: 780 },
  { colId: "heldCents", minWidth: 690 },
  { colId: "updatedAt", minWidth: 600 },
  { colId: "status", minWidth: 500 },
];
const COMPACT_BELOW = 500;

function TitleCell({ data, context }: ICellRendererParams<Row, unknown, Ctx>) {
  if (!data) return null;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center leading-tight">
      {/* The ellipsis lives on the inner span; the flex row only lays out title + icon. */}
      <span className="flex min-w-0 items-center gap-1.5 font-medium text-ink">
        <span className="min-w-0 truncate">{data.title}</span>
        {data.createdVia === "mcp" && <Bot className="size-3.5 shrink-0 text-sky-600" aria-label="Created by an AI agent" />}
      </span>
      <span className="min-w-0 truncate text-xs text-ink-3">
        {context?.compact ? `${PACT_STATUS_LABEL[data.status]} · ` : ""}
        {data.invited ? (
          <>
            Invited by {data.counterparty} · as <span className="lowercase">{data.role}</span>
          </>
        ) : (
          <>
            <span className="capitalize">{data.role}</span> with {data.counterparty}
          </>
        )}
      </span>
    </div>
  );
}

function ProgressCell({ data }: ICellRendererParams<Row>) {
  if (!data) return null;
  const pct = data.total ? (data.done / data.total) * 100 : 0;
  return (
    <div className="flex h-full items-center gap-2" aria-label={`${data.done} of ${data.total} milestones done`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-paper-2">
        <div className="h-full rounded-full bg-jade-600" style={{ width: `${pct}%` }} />
      </div>
      <span className="num text-xs text-ink-3">
        {data.done}/{data.total}
      </span>
    </div>
  );
}

const rowId = (p: { data: Row }) => p.data.id;
const centered = (node: React.ReactNode) => <div className="flex h-full items-center">{node}</div>;
const SHORT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function PactsGrid({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [quick, setQuick] = useState("");
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(rows.length);
  const [compact, setCompact] = useState(false);
  const apiRef = useRef<GridApi<Row> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // The title cell shows the status inline in compact mode; redraw it when that flips.
  useEffect(() => {
    apiRef.current?.refreshCells({ columns: ["title"], force: true });
  }, [compact]);

  const columns = useMemo<ColDef<Row>[]>(
    () => [
      {
        colId: "title",
        field: "title",
        headerName: "Pact",
        flex: 1,
        minWidth: 200,
        cellRenderer: TitleCell,
        filter: "agTextColumnFilter",
        tooltipValueGetter: (p) => (p.data ? `${p.data.title} — ${p.data.invited ? "invited by" : "with"} ${p.data.counterparty}` : undefined),
        getQuickFilterText: (p) => `${p.data.title} ${p.data.counterparty} ${p.data.role} ${PACT_STATUS_LABEL[p.data.status]}`,
      },
      {
        colId: "role",
        field: "role",
        headerName: "You are",
        width: 96,
        minWidth: 90,
        filter: true,
        cellRenderer: ({ value }: ICellRendererParams<Row>) => <span className="capitalize text-ink-2">{value}</span>,
      },
      {
        colId: "status",
        field: "status",
        headerName: "Status",
        width: 156,
        minWidth: 140,
        filter: true,
        filterValueGetter: (p) => (p.data ? PACT_STATUS_LABEL[p.data.status] : ""),
        cellRenderer: ({ value }: ICellRendererParams<Row>) => centered(<PactStatusBadge status={value} />),
      },
      {
        colId: "next",
        field: "next",
        headerName: "Current milestone",
        width: 176,
        minWidth: 150,
        cellRenderer: ({ value }: ICellRendererParams<Row>) => (value ? centered(<MilestoneStatusBadge status={value} />) : <span className="text-ink-3">—</span>),
      },
      { colId: "progress", headerName: "Progress", width: 116, minWidth: 110, cellRenderer: ProgressCell, sortable: false, valueGetter: (p) => (p.data && p.data.total ? p.data.done / p.data.total : 0) },
      // `type: "money"` brings the right-aligned header + cell classes; extra classes keep `ag-right-aligned-cell`.
      { colId: "amountCents", field: "amountCents", headerName: "Value", type: "money", filter: false, width: 112, minWidth: 100, cellClass: ["ag-right-aligned-cell", "num", "font-medium"] },
      {
        colId: "heldCents",
        field: "heldCents",
        headerName: "In escrow",
        type: "money",
        filter: false,
        width: 112,
        minWidth: 100,
        cellRenderer: ({ value }: ICellRendererParams<Row>) => (value > 0 ? <span className="font-medium text-amber-700">{formatMoney(value)}</span> : <span className="text-ink-3">—</span>),
      },
      {
        colId: "updatedAt",
        headerName: "Updated",
        type: "timestamp",
        filter: false,
        // Room for the label plus the sort arrow (it read "Updat…").
        width: 124,
        minWidth: 118,
        sort: "desc",
        valueGetter: (p) => (p.data ? Date.parse(p.data.updatedAt) : null),
        valueFormatter: (p) => (typeof p.value === "number" ? SHORT_DATE.format(p.value) : "—"),
        tooltipValueGetter: (p) => (typeof p.value === "number" ? new Date(p.value).toLocaleString("en-US") : undefined),
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<Row>>(() => ({ sortable: true, resizable: true, suppressHeaderMenuButton: true, filterParams: { buttons: ["reset"], maxNumConditions: 1 } }), []);
  const context = useMemo<Ctx>(() => ({ compact }), [compact]);

  const layoutFor = useCallback((api: GridApi<Row>, width: number) => {
    if (width <= 0) return;
    for (const b of BREAKPOINTS) api.setColumnsVisible([b.colId], width >= b.minWidth);
    setCompact(width < COMPACT_BELOW);
  }, []);

  const open = useCallback(
    (row: Row | undefined, newTab: boolean) => {
      if (!row) return;
      if (newTab) window.open(row.href, "_blank", "noopener");
      else router.push(row.href);
    },
    [router],
  );

  const onGridReady = useCallback(
    (e: GridReadyEvent<Row>) => {
      apiRef.current = e.api;
      layoutFor(e.api, boxRef.current?.clientWidth ?? 0);
      requestAnimationFrame(() => setReady(true));
    },
    [layoutFor],
  );

  const onRowClicked = useCallback(
    (e: RowClickedEvent<Row>) => {
      const ev = e.event as MouseEvent | null | undefined;
      if (typeof window !== "undefined" && window.getSelection()?.toString()) return;
      open(e.data, Boolean(ev && (ev.metaKey || ev.ctrlKey)));
    },
    [open],
  );

  // Keyboard: arrow keys move the focused cell (AG Grid), Enter opens the pact, ⌘/Ctrl+Enter in a new tab.
  const onCellKeyDown = useCallback(
    (e: CellKeyDownEvent<Row> | FullWidthCellKeyDownEvent<Row>) => {
      const ev = e.event as KeyboardEvent | null | undefined;
      if (!ev || ev.key !== "Enter" || e.node.rowPinned) return;
      ev.preventDefault();
      open(e.data, ev.metaKey || ev.ctrlKey);
    },
    [open],
  );

  const autoHeight = rows.length > 0 && rows.length <= 8;
  const fixedHeight = rows.length === 0 ? 200 : Math.min(560, HEADER_H + rows.length * ROW_H + 18);
  const placeholder = HEADER_H + Math.max(2, Math.min(rows.length, 8)) * ROW_H + 2;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Search pacts…" aria-label="Search pacts" className="h-9 pl-9 pr-8" />
          {quick && (
            <button onClick={() => setQuick("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-3 hover:bg-paper-2 hover:text-ink" aria-label="Clear search">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <span className="num ml-auto text-[12px] text-ink-3" aria-live="polite">
          {shown !== rows.length ? `${shown} of ${plural(rows.length, "pact")}` : plural(rows.length, "pact")}
          <span className="hidden md:inline"> · ↑↓ to move, Enter to open</span>
        </span>
      </div>
      <div
        ref={boxRef}
        role="region"
        aria-label="Your pacts. Use the arrow keys to move between rows and press Enter to open a pact."
        className="relative min-w-0 [&_.ag-cell-value]:h-full! [&_.ag-cell-wrapper]:h-full! [&_.ag-scrollbar-invisible_.ag-body-horizontal-scroll-viewport]:bg-transparent!"
        style={ready ? (autoHeight ? undefined : { height: fixedHeight }) : { height: placeholder }}
      >
        <AgGridReact<Row>
          theme={keptGridTheme}
          rowData={rows}
          columnDefs={columns}
          columnTypes={opsColumnTypes}
          defaultColDef={defaultColDef}
          getRowId={rowId}
          context={context}
          quickFilterText={quick}
          domLayout={ready && autoHeight ? "autoHeight" : "normal"}
          onGridReady={onGridReady}
          onGridSizeChanged={(e) => layoutFor(e.api, e.clientWidth)}
          onModelUpdated={(e) => setShown(e.api.getDisplayedRowCount())}
          onRowClicked={onRowClicked}
          onCellKeyDown={onCellKeyDown}
          rowClass="cursor-pointer"
          tooltipShowDelay={400}
          animateRows
          overlayNoRowsTemplate='<span style="font-size:13px;color:#6f6a60">No pacts yet — start one from a chat or a description.</span>'
        />
        {!ready && <GridSkeleton rows={Math.max(2, Math.min(rows.length, 8))} rowHeight={ROW_H} />}
      </div>
    </div>
  );
}
