"use client";

import { Filter } from "lucide-react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/** AG Charts renders to canvas in the browser only; load it client-side, with a skeleton in its place. */
function ChartLoading() {
  return (
    <div className="flex h-[196px] items-end gap-3 px-2 pb-6" aria-hidden>
      {[62, 88, 40, 72, 28, 55].map((h, i) => (
        <div key={i} className="flex-1" style={{ height: `${h}%` }}>
          <Skeleton className="h-full w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

export const EscrowStatusChart = dynamic(() => import("./ops-charts").then((m) => m.EscrowStatusChart), { ssr: false, loading: ChartLoading });
export const LedgerFlowChart = dynamic(() => import("./ops-charts").then((m) => m.LedgerFlowChart), { ssr: false, loading: ChartLoading });

export interface ChartStat {
  label: string;
  value: string;
  tone?: string;
  swatch?: string;
}

/** Card that frames a chart driven by the grid below it. */
export function ChartCard({
  title,
  shown,
  total,
  noun,
  stats,
  children,
  className,
  aside,
}: {
  title: string;
  shown: number;
  total: number;
  noun: string;
  stats: ChartStat[];
  children: React.ReactNode;
  className?: string;
  aside?: React.ReactNode;
}) {
  const filtered = shown !== total;
  return (
    <figure className={cn("overflow-hidden rounded-2xl border border-line bg-card shadow-card", className)} aria-label={title}>
      <div className="grid gap-0 md:grid-cols-[240px_1fr]">
        <figcaption className="flex flex-col gap-4 border-b border-line bg-[linear-gradient(160deg,#faf8f3_0%,#ffffff_75%)] p-5 md:border-b-0 md:border-r">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{title}</p>
            <p className={cn("mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium", filtered ? "bg-ink text-paper" : "bg-paper-2 text-ink-2")}>
              <Filter className="size-3" />
              {filtered ? `${shown.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} · filtered` : `All ${total.toLocaleString("en-US")} ${noun}`}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-1">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0">
                <dt className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
                  {s.swatch && <span className="size-2 shrink-0 rounded-[3px]" style={{ background: s.swatch }} />}
                  {s.label}
                </dt>
                <dd className={cn("num truncate text-[20px] font-semibold tracking-tight text-ink", s.tone)}>{s.value}</dd>
              </div>
            ))}
          </dl>
          {aside}
        </figcaption>
        <div className="min-w-0 px-3 pb-2 pt-4 sm:px-5">{children}</div>
      </div>
    </figure>
  );
}
