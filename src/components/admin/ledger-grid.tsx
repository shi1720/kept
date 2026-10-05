"use client";

import type { ColDef, GridApi, ICellRendererParams, SpanRowsParams, ValueGetterParams } from "ag-grid-community";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { LedgerAccount } from "@/lib/db/schema";
import type { LedgerRow, OpsConsole } from "@/lib/domain/ops";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { fmtDateTime, OpsGrid, pactValue } from "./grid-kit";

export const ACCOUNT_META: Record<LedgerAccount, { dot: string; normal: "debit" | "credit"; kind: string }> = {
  paypal_cash: { dot: "bg-sky-500", normal: "debit", kind: "Asset" },
  escrow_liability: { dot: "bg-amber-500", normal: "credit", kind: "Liability" },
  fee_revenue: { dot: "bg-jade-500", normal: "credit", kind: "Revenue" },
  processing_collected: { dot: "bg-jade-300", normal: "credit", kind: "Revenue" },
  processing_expense: { dot: "bg-rose-500", normal: "debit", kind: "Expense" },
  payout_expense: { dot: "bg-ember-500", normal: "debit", kind: "Expense" },
};

type Pinned = { debit: number; credit: number };
const sameTxn = (p: SpanRowsParams<LedgerRow>) => Boolean(p.nodeA?.data && p.nodeB?.data && p.nodeA.data.txnId === p.nodeB.data.txnId);
const side = (which: "debit" | "credit") => (p: ValueGetterParams<LedgerRow>) => {
  if (p.node?.rowPinned) return (p.data as unknown as Pinned | undefined)?.[which] ?? null;
  const a = p.data?.amountCents ?? 0;
  return which === "debit" ? (a > 0 ? a : null) : a < 0 ? -a : null;
};
const blankIfNull = (p: { value: unknown }) => (typeof p.value === "number" ? formatMoney(p.value) : "");

function AccountCell(p: ICellRendererParams<LedgerRow>) {
  if (p.node.rowPinned) return <span className="text-ink-3">{p.value}</span>;
  if (!p.data) return null;
  return (
    <span className="flex h-full items-center gap-2">
      <span className={cn("size-2 shrink-0 rounded-full", ACCOUNT_META[p.data.account]?.dot)} />
      <span className="truncate">{p.data.accountLabel}</span>
    </span>
  );
}

/** Spanned cells cover a whole journal; content sits at the top, aligned with its first line. */
function JournalCell(p: ICellRendererParams<LedgerRow>) {
  if (p.node.rowPinned || !p.data) return null;
  return (
    <div className="flex flex-col gap-1 py-[13px] leading-none">
      <span className="num text-ink-2">{fmtDateTime(p.data.createdAt)}</span>
      <span className="font-mono text-[11px] text-ink-3">{p.data.txnId}</span>
    </div>
  );
}

function MemoCell(p: ICellRendererParams<LedgerRow>) {
  if (p.node.rowPinned) {
    const d = p.data as unknown as Pinned & { memo: string };
    const ok = d.debit === d.credit;
    return <span className={cn("font-semibold", ok ? "text-jade-700" : "text-rose-700")}>{d.memo}</span>;
  }
  if (!p.data) return null;
  return (
    <div className="flex min-w-0 flex-col gap-1 py-[13px] leading-none">
      <span className="truncate text-ink">{p.data.memo}</span>
      {p.data.reference && <span className="truncate font-mono text-[11px] text-ink-3">{p.data.reference}</span>}
    </div>
  );
}

function LedgerPactCell(p: ICellRendererParams<LedgerRow>) {
  if (p.node.rowPinned || !p.data?.pactId) return null;
  return (
    <div className="py-[13px] leading-none">
      <Link href={`/app/pacts/${p.data.pactId}`} className="block truncate font-medium text-ink hover:text-jade-700 hover:underline">
        {p.data.pactTitle}
      </Link>
    </div>
  );
}

export function LedgerPanel({ rows, balances, showWorkspace }: { rows: LedgerRow[]; balances: OpsConsole["balances"]; showWorkspace: boolean }) {
  const [api, setApi] = useState<GridApi<LedgerRow> | null>(null);
  const [active, setActive] = useState<LedgerAccount | null>(null);

  const focusAccount = useCallback(
    async (account: LedgerAccount, label: string) => {
      if (!api) return;
      const next = active === account ? null : account;
      setActive(next);
      await api.setColumnFilterModel("accountLabel", next ? { filterType: "text", type: "equals", filter: label } : null);
      api.onFilterChanged();
    },
    [api, active],
  );

  const columns = useMemo<ColDef<LedgerRow>[]>(
    () => [
      {
        field: "createdAt",
        headerName: "Journal",
        type: "timestamp",
        sort: "desc",
        spanRows: sameTxn,
        cellRenderer: JournalCell,
        width: 160,
        minWidth: 150,
        getQuickFilterText: (p) => `${p.data.txnId} ${fmtDateTime(p.data.createdAt)}`,
      },
      { field: "accountLabel", headerName: "Account", cellRenderer: AccountCell, width: 220, minWidth: 200 },
      { colId: "debit", headerName: "Debit", type: "money", valueGetter: side("debit"), valueFormatter: blankIfNull, width: 115 },
      { colId: "credit", headerName: "Credit", type: "money", valueGetter: side("credit"), valueFormatter: blankIfNull, width: 115 },
      {
        field: "memo",
        headerName: "Memo · PayPal reference",
        cellRenderer: MemoCell,
        flex: 1,
        minWidth: 240,
        spanRows: sameTxn,
        tooltip: (p) => (p.node?.rowPinned || !p.data ? undefined : [p.data.memo, p.data.reference].filter(Boolean).join(" · ")),
        getQuickFilterText: (p) => `${p.data.memo} ${p.data.reference ?? ""}`,
      },
      { colId: "pact", headerName: "Pact", valueGetter: pactValue, cellRenderer: LedgerPactCell, width: 210, minWidth: 150, spanRows: sameTxn },
      // Hidden from the table (shown inside the spanned cells) but kept in CSV exports.
      { field: "txnId", headerName: "Journal id", hide: true, context: { alwaysExport: true } },
      { field: "reference", headerName: "PayPal reference", hide: true, context: { alwaysExport: true } },
      { field: "workspace", headerName: "Workspace", width: 150, hide: !showWorkspace, cellClass: "font-mono text-[11.5px] text-ink-3", valueFormatter: (p) => p.value ?? "live" },
    ],
    [showWorkspace],
  );

  const totalDr = balances.reduce((s, b) => s + Math.max(0, b.balanceCents), 0);
  const totalCr = balances.reduce((s, b) => s + Math.max(0, -b.balanceCents), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {balances.map((b) => {
          const meta = ACCOUNT_META[b.account];
          const natural = meta.normal === "debit" ? b.balanceCents : -b.balanceCents;
          const isActive = active === b.account;
          return (
            <button
              key={b.account}
              onClick={() => focusAccount(b.account, b.label)}
              className={cn(
                "group rounded-2xl border bg-card p-4 text-left shadow-card transition-all hover:-translate-y-px hover:shadow-lift",
                isActive ? "border-ink ring-2 ring-ink/10" : "border-line",
              )}
              title={isActive ? "Show all accounts" : `Filter the ledger to ${b.label}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  <span className={cn("size-2 rounded-full", meta.dot)} />
                  {meta.kind}
                </span>
                <span className="rounded-md bg-paper-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">{meta.normal === "debit" ? "Dr" : "Cr"}</span>
              </div>
              <div className="mt-2 line-clamp-2 min-h-[34px] text-[12.5px] font-medium leading-snug text-ink-2">{b.label}</div>
              <div className={cn("num mt-0.5 text-[20px] font-semibold tracking-tight", natural < 0 && "text-rose-700")}>{formatMoney(natural)}</div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-dashed border-line-2 bg-paper/60 px-4 py-2.5 text-[12.5px] text-ink-3">
        <span className="font-medium text-ink-2">Trial balance</span>
        <span className="num">
          Debits <b className="font-semibold text-ink">{formatMoney(totalDr)}</b>
        </span>
        <span>=</span>
        <span className="num">
          Credits <b className="font-semibold text-ink">{formatMoney(totalCr)}</b>
        </span>
        <span className={cn("font-semibold", totalDr === totalCr ? "text-jade-700" : "text-rose-700")}>{totalDr === totalCr ? "✓ in balance" : "✗ out of balance"}</span>
        <span className="ml-auto hidden sm:inline">Positive = debit, negative = credit · lines of one journal are merged with AG Grid row spanning</span>
      </div>
      <OpsGrid<LedgerRow>
        id="ledger"
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        onGridApi={setApi}
        searchPlaceholder="Search memo, journal, reference…"
        emptyText="No ledger lines yet. Fund a milestone and the double-entry journal appears here."
        height={640}
        pagination
        enableCellSpan
        totals={(visible) => {
          const debit = visible.reduce((s, r) => s + Math.max(0, r.amountCents), 0);
          const credit = visible.reduce((s, r) => s + Math.max(0, -r.amountCents), 0);
          return {
            accountLabel: `${visible.length} lines`,
            debit,
            credit,
            memo: debit === credit ? "Debits = credits ✓" : `Off by ${formatMoney(debit - credit)}`,
          };
        }}
      />
    </div>
  );
}
