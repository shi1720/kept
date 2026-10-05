"use client";

import type { ColDef, GridApi, ICellRendererParams, SpanRowsParams, ValueGetterParams } from "ag-grid-community";
import { FlaskConical, Zap } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LedgerAccount } from "@/lib/db/schema";
import type { LedgerRow, OpsConsole } from "@/lib/domain/ops";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { ChartCard, LedgerFlowChart } from "./chart-card";
import { byId, fmtDateTime, OpsGrid, pactValue, plural } from "./grid-kit";

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
      <span className="flex min-w-0 items-center gap-1.5">
        {isSynthetic(p.data) && (
          <span className="shrink-0 rounded bg-sky-100 px-1 py-px text-[9.5px] font-bold uppercase tracking-wider text-sky-600">Synthetic</span>
        )}
        <span className="truncate text-ink">{p.data.memo}</span>
      </span>
      {p.data.reference && <span className="truncate font-mono text-[11px] text-ink-3">{p.data.reference}</span>}
    </div>
  );
}

function LedgerPactCell(p: ICellRendererParams<LedgerRow>) {
  if (p.node.rowPinned || !p.data) return null;
  if (isSynthetic(p.data)) return <div className="py-[13px] leading-none text-[12px] italic text-ink-3">Load-test data</div>;
  if (!p.data.pactId) return null;
  return (
    <div className="py-[13px] leading-none">
      <Link href={`/app/pacts/${p.data.pactId}`} className="block truncate font-medium text-ink hover:text-jade-700 hover:underline">
        {p.data.pactTitle}
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stress test: 100k synthetic, balanced ledger lines (client-side)    */
/* ------------------------------------------------------------------ */

const SYNTH_JOURNALS = 50_000;
const SYNTH_WS = "synthetic";
const isSynthetic = (r: LedgerRow) => r.workspace === SYNTH_WS;

/** Deterministic PRNG so every run builds the same book. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYNTH_KINDS: { memo: string; debit: LedgerAccount; credit: LedgerAccount; min: number; max: number }[] = [
  { memo: "Escrow funded via PayPal capture", debit: "paypal_cash", credit: "escrow_liability", min: 5_000, max: 250_000 },
  { memo: "Milestone released to freelancer", debit: "escrow_liability", credit: "paypal_cash", min: 5_000, max: 200_000 },
  { memo: "Kept protection fee collected", debit: "paypal_cash", credit: "fee_revenue", min: 150, max: 7_500 },
  { memo: "PayPal processing fee", debit: "processing_expense", credit: "paypal_cash", min: 30, max: 9_000 },
  { memo: "Refund to client", debit: "escrow_liability", credit: "paypal_cash", min: 2_000, max: 80_000 },
];

function buildSynthetic(labels: Map<LedgerAccount, string>, now: number): LedgerRow[] {
  const rand = mulberry32(20261005);
  const out: LedgerRow[] = new Array(SYNTH_JOURNALS * 2);
  const span = 180 * 86_400_000;
  for (let i = 0; i < SYNTH_JOURNALS; i++) {
    const k = SYNTH_KINDS[Math.floor(rand() * SYNTH_KINDS.length)];
    const amount = Math.round(k.min + rand() * (k.max - k.min));
    const createdAt = Math.round(now - rand() * span);
    const txnId = `synth_${String(i).padStart(6, "0")}`;
    const reference = `SYNTH-${(i * 2654435761 >>> 0).toString(36).toUpperCase().padStart(7, "0")}`;
    const base = { txnId, createdAt, memo: `${k.memo} (synthetic)`, reference, pactId: null, pactTitle: "Synthetic load test", workspace: SYNTH_WS };
    out[i * 2] = { ...base, id: `${txnId}-dr`, account: k.debit, accountLabel: labels.get(k.debit) ?? k.debit, amountCents: amount };
    out[i * 2 + 1] = { ...base, id: `${txnId}-cr`, account: k.credit, accountLabel: labels.get(k.credit) ?? k.credit, amountCents: -amount };
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Chart: money in vs out, from the lines the grid is showing          */
/* ------------------------------------------------------------------ */

const DAY_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" });

function flowSeries(visible: LedgerRow[]) {
  const cash = visible.some((r) => r.account === "paypal_cash");
  const lines = cash ? visible.filter((r) => r.account === "paypal_cash") : visible;
  const accounts = new Set(lines.map((r) => r.accountLabel));
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of lines) {
    if (r.createdAt < lo) lo = r.createdAt;
    if (r.createdAt > hi) hi = r.createdAt;
  }
  const days = lines.length ? (hi - lo) / 86_400_000 : 0;
  const unit: "day" | "week" | "month" = days <= 62 ? "day" : days <= 200 ? "week" : "month";
  const bucketOf = (t: number) => {
    const d = new Date(t);
    if (unit === "month") return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (unit === "week") day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
    return day.getTime();
  };
  const buckets = new Map<number, { inCents: number; outCents: number }>();
  let inTotal = 0;
  let outTotal = 0;
  for (const r of lines) {
    const k = bucketOf(r.createdAt);
    const b = buckets.get(k) ?? { inCents: 0, outCents: 0 };
    if (r.amountCents > 0) {
      b.inCents += r.amountCents;
      inTotal += r.amountCents;
    } else {
      b.outCents += r.amountCents;
      outTotal += r.amountCents;
    }
    buckets.set(k, b);
  }
  const data = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, b]) => ({ label: unit === "month" ? MONTH_FMT.format(t) : `${unit === "week" ? "Wk " : ""}${DAY_FMT.format(t)}`, ...b }));
  const single = accounts.size === 1 ? [...accounts][0] : null;
  return {
    data,
    unit,
    inName: cash ? "Cash in" : single ? `${single} · debits` : "Debits",
    outName: cash ? "Cash out" : single ? `${single} · credits` : "Credits",
    title: cash ? `PayPal cash in vs out · by ${unit}` : `Debits vs credits · by ${unit}`,
    inTotal,
    outTotal,
  };
}

function LedgerChartCard({ visible, total, synthetic }: { visible: LedgerRow[]; total: number; synthetic: boolean }) {
  const f = useMemo(() => flowSeries(visible), [visible]);
  const net = f.inTotal + f.outTotal;
  return (
    <ChartCard
      title={f.title}
      shown={visible.length}
      total={total}
      noun="lines"
      stats={[
        { label: f.inName, value: formatMoney(f.inTotal), swatch: "#148a6f" },
        { label: f.outName, value: formatMoney(-f.outTotal), swatch: "#c2410c" },
        { label: "Net", value: `${net < 0 ? "−" : ""}${formatMoney(Math.abs(net))}`, tone: net < 0 ? "text-rose-700" : undefined },
      ]}
      aside={
        synthetic ? (
          <Badge tone="sky" className="w-fit">
            <FlaskConical /> Includes synthetic lines
          </Badge>
        ) : undefined
      }
    >
      {f.data.length ? (
        <LedgerFlowChart data={f.data} inName={f.inName} outName={f.outName} />
      ) : (
        <div className="flex h-[212px] items-center justify-center text-[13px] text-ink-3">No ledger lines match the grid&rsquo;s filters.</div>
      )}
    </ChartCard>
  );
}

const SYNTH_RULES = {
  "bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgba(50,102,227,0.05)_10px_20px)]!": (p: { data?: LedgerRow }) => Boolean(p.data && isSynthetic(p.data)),
};

export function LedgerPanel({ rows, balances, showWorkspace }: { rows: LedgerRow[]; balances: OpsConsole["balances"]; showWorkspace: boolean }) {
  const [api, setApi] = useState<GridApi<LedgerRow> | null>(null);
  const [active, setActive] = useState<LedgerAccount | null>(null);
  const [synthetic, setSynthetic] = useState<LedgerRow[] | null>(null);
  const [visible, setVisible] = useState<LedgerRow[] | null>(null);
  const [timing, setTiming] = useState<{ build: number; grid: number } | null>(null);
  const pending = useRef<{ t0: number; build: number } | null>(null);

  const allRows = useMemo(() => (synthetic ? [...rows, ...synthetic] : rows), [rows, synthetic]);

  const toggleStress = () => {
    if (synthetic) {
      setSynthetic(null);
      setTiming(null);
      return;
    }
    const t0 = performance.now();
    const labels = new Map(balances.map((b) => [b.account, b.label]));
    const lines = buildSynthetic(labels, Date.now());
    pending.current = { t0, build: performance.now() - t0 };
    setSynthetic(lines);
  };

  const onDisplayed = useCallback((v: LedgerRow[]) => {
    setVisible(v);
    const p = pending.current;
    if (p) {
      pending.current = null;
      setTiming({ build: p.build, grid: performance.now() - p.t0 - p.build });
    }
  }, []);

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
      { colId: "debit", headerName: "Debit", type: "money", valueGetter: side("debit"), valueFormatter: blankIfNull, width: 132, minWidth: 132 },
      { colId: "credit", headerName: "Credit", type: "money", valueGetter: side("credit"), valueFormatter: blankIfNull, width: 132, minWidth: 132 },
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
      <LedgerChartCard visible={visible ?? allRows} total={allRows.length} synthetic={Boolean(synthetic)} />
      {synthetic && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-[12.5px] text-ink-2">
          <FlaskConical className="size-4 shrink-0 text-sky-600" />
          <span>
            <b className="font-semibold text-ink">{synthetic.length.toLocaleString("en-US")} synthetic lines</b> ({(synthetic.length / 2).toLocaleString("en-US")} balanced journals) generated
            in your browser; <b className="font-semibold text-ink">not real money</b>, never sent to the server.
          </span>
          {timing && (
            <span className="num ml-auto text-ink-3">
              built in {Math.round(timing.build)} ms · grid ready in {Math.round(timing.grid)} ms
            </span>
          )}
        </div>
      )}
      <OpsGrid<LedgerRow>
        id="ledger"
        rows={allRows}
        columns={columns}
        getRowId={byId}
        onGridApi={setApi}
        onDisplayedRowsChange={onDisplayed}
        noun={["line", "lines"]}
        toolbar={
          <Button
            variant={synthetic ? "primary" : "outline"}
            size="sm"
            onClick={toggleStress}
            aria-pressed={Boolean(synthetic)}
            title="Append 100,000 synthetic, clearly-labelled ledger lines (client-side only) to show AG Grid virtualisation, row spanning, filtering and live totals at scale"
          >
            <Zap /> {synthetic ? "Remove synthetic lines" : "Stress test · +100k"}
          </Button>
        }
        rowClassRules={SYNTH_RULES}
        searchPlaceholder="Search memo, journal, reference…"
        emptyText="No ledger lines yet. Fund a milestone and the double-entry journal appears here."
        height={640}
        pagination={!synthetic}
        enableCellSpan
        totals={(visible) => {
          const debit = visible.reduce((s, r) => s + Math.max(0, r.amountCents), 0);
          const credit = visible.reduce((s, r) => s + Math.max(0, -r.amountCents), 0);
          return {
            accountLabel: plural(visible.length, "line"),
            debit,
            credit,
            memo: debit === credit ? "Debits = credits ✓" : `Off by ${formatMoney(debit - credit)}`,
          };
        }}
      />
    </div>
  );
}
