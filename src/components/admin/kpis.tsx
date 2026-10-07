import {
  Banknote,
  BrainCircuit,
  CircleCheck,
  CircleX,
  Gavel,
  HandCoins,
  Lock,
  Percent,
  RotateCcw,
  Scale,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
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
          <p className="text-[12px] font-semibold">
            Ledger invariants, recomputed on every load
          </p>
          {books.checks.map((c) => (
            <div key={c.label} className="flex gap-2">
              {c.ok ? (
                <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-jade-300" />
              ) : (
                <CircleX className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
              )}
              <div>
                <p className="text-[12px] font-medium">{c.label}</p>
                <p className="text-[11px] leading-snug opacity-70">
                  {c.detail}
                </p>
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
          books.balanced
            ? "border-jade-100 bg-jade-50 text-jade-700 hover:bg-jade-100"
            : "border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100",
        )}
      >
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-white",
            books.balanced ? "bg-jade-600" : "bg-rose-600",
          )}
        >
          {books.balanced ? (
            <ShieldCheck className="size-3.5" />
          ) : (
            <ShieldAlert className="size-3.5" />
          )}
        </span>
        {books.balanced ? "Books balanced ✓" : "Books out of balance ✗"}
        <span className="num font-normal">
          · {plural(books.txnCount, "journal")}
        </span>
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

export function KpiHeader({
  kpis,
  heldCount,
}: {
  kpis: OpsKpis;
  heldCount: number;
}) {
  const items: Kpi[] = [
    {
      label: "Escrow held",
      value: formatMoney(kpis.escrowHeldCents),
      hint: kpis.awaitingPayPalCents
        ? `${plural(heldCount, "held milestone")} + ${formatMoney(kpis.awaitingPayPalCents)} released, awaiting PayPal`
        : `Owed to parties across ${plural(heldCount, "milestone")}`,
      icon: Lock,
      tone: "bg-amber-50 text-amber-700",
      emphasis: true,
    },
    {
      label: "GMV funded",
      value: formatMoney(kpis.gmvFundedCents),
      hint: `${plural(kpis.fundedCount, "capture")} · ${formatMoney(kpis.grossChargedCents)} charged incl. fees`,
      icon: HandCoins,
      tone: "bg-sky-50 text-sky-600",
    },
    {
      label: "Released via Payouts",
      value: formatMoney(kpis.releasedCents),
      hint: `${plural(kpis.payoutCount, "payout")}${kpis.pendingPayoutCount ? ` · ${kpis.pendingPayoutCount} awaiting PayPal` : " · all delivered"}`,
      icon: Banknote,
      tone: "bg-jade-50 text-jade-700",
    },
    {
      label: "Refunded",
      value: formatMoney(kpis.refundedCents),
      hint: `${plural(kpis.refundCount, "refund")} back to clients`,
      icon: RotateCcw,
      tone: "bg-paper-2 text-ink-2",
    },
    {
      label: "Kept fee revenue",
      value: formatMoney(kpis.feeRevenueCents),
      hint: "Protection fee, charged on top of each milestone",
      icon: Percent,
      tone: "bg-ember-50 text-ember-700",
    },
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
      hint: kpis.escalatedDisputes
        ? `${kpis.escalatedDisputes} escalated to a human`
        : kpis.openDisputes
          ? "In AI mediation"
          : "Nothing waiting on a ruling",
      icon: Gavel,
      tone: kpis.openDisputes
        ? "bg-rose-50 text-rose-700"
        : "bg-paper-2 text-ink-2",
    },
  ];

  const primary = [items[0], items[2], items[3], items[7]];
  const secondary = [items[1], items[4], items[5], items[6]];
  const render = (k: Kpi) => (
    <div
      key={k.label}
      className={cn(
        "min-w-0 rounded-2xl border border-line bg-card p-4 sm:p-5",
        k.emphasis && "bg-jade-50 border-jade-100",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-ink-2">{k.label}</span>
        <k.icon className="size-4 shrink-0 text-ink-3" />
      </div>
      <div
        className={cn(
          "num mt-3 whitespace-nowrap text-[23px] sm:text-[28px] font-semibold tracking-tight",
          k.valueTone,
        )}
      >
        {k.value}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-3">{k.hint}</p>
    </div>
  );
  return (
    <section aria-label="Operations summary" className="space-y-4">
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 xl:grid-cols-4">
        {primary.map(render)}
      </div>
      <details className="group rounded-xl border border-line bg-card px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-ink-2">
          Revenue, processing & AI metrics
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {secondary.map(render)}
        </div>
      </details>
    </section>
  );
}
