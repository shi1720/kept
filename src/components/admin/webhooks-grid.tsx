"use client";

import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { AlertTriangle, BadgeCheck, CircleDashed, ShieldX } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { WebhookRow } from "@/lib/domain/ops";
import { centered, FilterChips, fmtDateTime, OpsGrid } from "./grid-kit";

function EventCell(p: ICellRendererParams<WebhookRow>) {
  if (!p.data) return null;
  return centered(<span className="rounded-md border border-line bg-paper px-1.5 py-0.5 font-mono text-[11.5px] text-ink">{p.data.eventType}</span>);
}

function VerifiedCell(p: ICellRendererParams<WebhookRow>) {
  if (!p.data) return null;
  return centered(
    p.data.verified ? (
      <Badge tone="jade">
        <BadgeCheck /> Signature verified
      </Badge>
    ) : (
      <Badge tone="rose">
        <ShieldX /> Unverified
      </Badge>
    ),
  );
}

function ProcessedCell(p: ICellRendererParams<WebhookRow>) {
  if (!p.data) return null;
  if (p.data.error)
    return centered(
      <Badge tone="rose">
        <AlertTriangle /> Error
      </Badge>,
    );
  if (p.data.processedAt) return <span className="num text-ink-2">{fmtDateTime(p.data.processedAt)}</span>;
  return centered(
    <Badge tone="amber">
      <CircleDashed /> Pending
    </Badge>,
  );
}

const ROW_RULES = {
  "bg-rose-50/70!": (p: { data?: WebhookRow }) => Boolean(p.data?.error),
  "bg-amber-50/60!": (p: { data?: WebhookRow }) => Boolean(p.data && !p.data.error && !p.data.verified),
};

type View = "all" | "issues";

export function WebhooksGrid({ rows, scoped }: { rows: WebhookRow[]; scoped: boolean }) {
  const [view, setView] = useState<View>("all");
  const issues = rows.filter((r) => r.error || !r.verified).length;
  const columns = useMemo<ColDef<WebhookRow>[]>(
    () => [
      { field: "createdAt", headerName: "Received", type: "timestamp", sort: "desc", pinned: "left" },
      { field: "eventType", headerName: "Event", cellRenderer: EventCell, width: 260 },
      { field: "resourceId", headerName: "Resource id", type: "paypalId" },
      { field: "verified", headerName: "Verification", cellRenderer: VerifiedCell, width: 180, filterValueGetter: (p) => (p.data?.verified ? "verified" : "unverified") },
      { field: "processedAt", headerName: "Processed", cellRenderer: ProcessedCell, width: 140, type: "timestamp" },
      { field: "error", headerName: "Error", flex: 1, minWidth: 200, cellClass: "text-rose-700", tooltip: (p) => p.value ?? undefined, valueFormatter: (p) => p.value ?? "" },
      { field: "paypalEventId", headerName: "PayPal event id", type: "paypalId", width: 220 },
    ],
    [],
  );

  return (
    <OpsGrid<WebhookRow>
      id="webhooks"
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      externalFilter={view === "issues" ? (r) => Boolean(r.error || !r.verified) : null}
      externalFilterKey={view}
      toolbar={
        <FilterChips<View>
          chips={[
            { key: "all", label: "All events", count: rows.length },
            { key: "issues", label: "Unverified or failed", count: issues },
          ]}
          value={view}
          onChange={setView}
        />
      }
      rowClassRules={ROW_RULES}
      floatingFilters
      searchPlaceholder="Search event types, resource ids…"
      emptyText={
        scoped
          ? "No PayPal webhooks reference your demo world yet. The seeded history ran on the in-process simulator — fund a milestone through the PayPal sandbox and its CHECKOUT.ORDER.APPROVED / PAYMENT.CAPTURE.COMPLETED events will land here."
          : "No PayPal webhooks received yet. Point your PayPal app's webhook at /api/webhooks/paypal."
      }
      height={460}
    />
  );
}
