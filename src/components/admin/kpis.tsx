import { Banknote, BrainCircuit, CircleCheck, CircleX, Gavel, HandCoins, Lock, Percent, RotateCcw, Scale, ShieldAlert, ShieldCheck } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import type { BooksCheck, OpsKpis } from "@/lib/domain/ops";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function BooksBadge({ books }: { books: BooksCheck }) {
  return (
    <Tooltip
      content={
        <div className="flex w-[300px] flex-col gap-2 py-1">
          <p className="text-[12px] font-semibold">Ledger invariants, recomputed on every load</p>
          {books.checks.map((c) => (
            <div key={c.label} className="flex gap-2">
              {c.ok ? <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-jade-300" /> : <CircleX className="mt-0.5 size-3.5 shrink-0 text-rose-500" />}
              <div>
                <p className="text-[12px] font-medium">{c.label}</p>
                <p className="text-[11px] leading-snug opacity-70">{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      }
    >
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border py-1.5 pl-2 pr-3.5 text-[13px] font-semibold shadow-card transition-colors",
          books.balanced ? "border-jade-100 bg-jade-50 text-jade-700 hover:bg-jade-100" : "border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100",
        )}
      >
        <span className={cn("flex size-6 items-center justify-center rounded-full text-white", books.balanced ? "bg-jade-600" : "bg-rose-600")}>
          {books.balanced ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
        </span>
        {books.balanced ? "Books balanced ✓" : "Books out of balance ✗"}
        <span className="num font-normal opacity-70">· {plural(books.txnCount, "journal")}</span>
      </button>
    </Tooltip>
  );
}

interface Kpi {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  tone: string;
  emphasis?: boolean;
  valueTone?: string;
}

export function KpiHeader({ kpis, heldCount }: { kpis: OpsKpis; heldCount: number }) {
  const items: Kpi[] = [
    { label: "Escrow held", value: formatMoney(kpis.escrowHeldCents), hint: `Owed to parties across ${plural(heldCount, "milestone")}`, icon: Lock, tone: "bg-amber-50 text-amber-700", emphasis: true },
    { label: "GMV funded", value: formatMoney(kpis.gmvFundedCents), hint: `${plural(kpis.fundedCount, "capture")} · ${formatMoney(kpis.grossChargedCents)} charged incl. fees`, icon: HandCoins, tone: "bg-sky-50 text-sky-600" },
    {
      label: "Released via Payouts",
      value: formatMoney(kpis.releasedCents),
      hint: `${plural(kpis.payoutCount, "payout")}${kpis.pendingPayoutCount ? ` · ${kpis.pendingPayoutCount} awaiting PayPal` : " · all delivered"}`,
      icon: Banknote,
      tone: "bg-jade-50 text-jade-700",
    },
    { label: "Refunded", value: formatMoney(kpis.refundedCents), hint: `${plural(kpis.refundCount, "refund")} back to clients`, icon: RotateCcw, tone: "bg-paper-2 text-ink-2" },
    { label: "Kept fee revenue", value: formatMoney(kpis.feeRevenueCents), hint: "Protection fee, charged on top of each milestone", icon: Percent, tone: "bg-ember-50 text-ember-700" },
    {
      label: "Net processing",
      value: `${kpis.netProcessingCents < 0 ? "−" : ""}${formatMoney(Math.abs(kpis.netProcessingCents))}`,
      valueTone: kpis.netProcessingCents < 0 ? "text-rose-700" : undefined,
      hint: `${formatMoney(kpis.processingCollectedCents)} collected − ${formatMoney(kpis.processingExpenseCents)} PayPal − ${formatMoney(kpis.payoutFeesCents)} payout fees`,
      icon: Scale,
      tone: "bg-paper-2 text-ink-2",
    },
    {
      label: "AI verdicts",
      value: String(kpis.verdictCount),
      hint: `avg ${kpis.avgLatencyMs >= 1000 ? `${(kpis.avgLatencyMs / 1000).toFixed(1)} s` : `${kpis.avgLatencyMs} ms`}${kpis.injectionCount ? ` · ${plural(kpis.injectionCount, "injection")} caught` : " · no injections"}`,
      icon: BrainCircuit,
      tone: "bg-sky-50 text-sky-600",
    },
    {
      label: "Open disputes",
      value: String(kpis.openDisputes),
      valueTone: kpis.openDisputes ? "text-rose-700" : undefined,
      hint: kpis.escalatedDisputes ? `${kpis.escalatedDisputes} escalated to a human` : kpis.openDisputes ? "In AI mediation" : "Nothing waiting on a ruling",
      icon: Gavel,
      tone: kpis.openDisputes ? "bg-rose-50 text-rose-700" : "bg-paper-2 text-ink-2",
    },
  ];

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-line shadow-card [gap:1px] lg:grid-cols-4">
      {items.map((k) => (
        <div key={k.label} className={cn("flex min-w-0 flex-col bg-card p-5", k.emphasis && "bg-[linear-gradient(135deg,#fbf4e6_0%,#ffffff_70%)]")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-ink-3">{k.label}</span>
            <span className={cn("rounded-lg p-1.5", k.tone)}>
              <k.icon className="size-3.5" />
            </span>
          </div>
          <div className={cn("num mt-2.5 truncate text-[26px] font-semibold tracking-tight", k.valueTone)}>{k.value}</div>
          <div className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-ink-3">{k.hint}</div>
        </div>
      ))}
    </div>
  );
}
