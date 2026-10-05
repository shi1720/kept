"use client";

import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Bot, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MilestoneStatusBadge, PactStatusBadge } from "@/components/app/status";
import { Input } from "@/components/ui/input";
import type { Dashboard } from "@/lib/domain/queries";
import { formatMoney } from "@/lib/money";
import { keptGridTheme } from "./theme";

type Row = Dashboard["pacts"][number];

function TitleCell({ data }: ICellRendererParams<Row>) {
  if (!data) return null;
  return (
    <div className="flex h-full flex-col justify-center leading-tight">
      <span className="flex items-center gap-1.5 truncate font-medium text-ink">
        {data.title}
        {data.createdVia === "mcp" && <Bot className="size-3.5 text-sky-600" aria-label="Created by an AI agent" />}
      </span>
      <span className="truncate text-xs text-ink-3">with {data.counterparty}</span>
    </div>
  );
}

function ProgressCell({ data }: ICellRendererParams<Row>) {
  if (!data) return null;
  const pct = data.total ? (data.done / data.total) * 100 : 0;
  return (
    <div className="flex h-full items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-paper-2">
        <div className="h-full rounded-full bg-jade-600" style={{ width: `${pct}%` }} />
      </div>
      <span className="num text-xs text-ink-3">
        {data.done}/{data.total}
      </span>
    </div>
  );
}

export function PactsGrid({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [quick, setQuick] = useState("");
  const columns = useMemo<ColDef<Row>[]>(
    () => [
      { field: "title", headerName: "Pact", flex: 2.4, minWidth: 260, cellRenderer: TitleCell, filter: "agTextColumnFilter" },
      {
        field: "role",
        headerName: "You are",
        width: 110,
        filter: true,
        cellRenderer: ({ value }: ICellRendererParams<Row>) => <span className="capitalize text-ink-2">{value}</span>,
      },
      { field: "status", headerName: "Status", width: 170, filter: true, cellRenderer: ({ value }: ICellRendererParams<Row>) => <div className="flex h-full items-center"><PactStatusBadge status={value} /></div> },
      {
        field: "next",
        headerName: "Current milestone",
        width: 200,
        cellRenderer: ({ value }: ICellRendererParams<Row>) => (value ? <div className="flex h-full items-center"><MilestoneStatusBadge status={value} /></div> : <span className="text-ink-3">—</span>),
      },
      { headerName: "Progress", width: 140, cellRenderer: ProgressCell, sortable: false },
      { field: "amountCents", headerName: "Value", width: 120, type: "rightAligned", valueFormatter: (p) => formatMoney(p.value), cellClass: "num font-medium" },
      {
        field: "heldCents",
        headerName: "In escrow",
        width: 120,
        type: "rightAligned",
        cellClass: "num",
        cellRenderer: ({ value }: ICellRendererParams<Row>) => (value > 0 ? <span className="font-medium text-amber-700">{formatMoney(value)}</span> : <span className="text-ink-3">—</span>),
      },
      {
        field: "updatedAt",
        headerName: "Updated",
        width: 130,
        sort: "desc",
        valueFormatter: (p) => new Date(p.value).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        cellClass: "text-ink-3",
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <Input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Search pacts…" className="h-9 pl-9" />
      </div>
      <div style={{ height: Math.min(520, 46 + Math.max(rows.length, 3) * 56 + 2) }}>
        <AgGridReact<Row>
          theme={keptGridTheme}
          rowData={rows}
          columnDefs={columns}
          quickFilterText={quick}
          defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
          onRowClicked={(e) => e.data && router.push(`/app/pacts/${e.data.id}`)}
          rowClass="cursor-pointer"
          animateRows
          overlayNoRowsTemplate='<span class="text-sm text-ink-3">No pacts yet — start one from a chat or description.</span>'
        />
      </div>
    </div>
  );
}
