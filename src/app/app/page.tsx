import { ArrowRight, Banknote, Hourglass, Lock, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Timeline } from "@/components/app/timeline";
import { PactsGrid } from "@/components/grid/pacts-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { getDashboard } from "@/lib/domain/queries";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Overview" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const TONE: Record<string, string> = {
  jade: "border-l-jade-500",
  amber: "border-l-amber-500",
  rose: "border-l-rose-500",
  sky: "border-l-sky-500",
  ember: "border-l-ember-500",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const d = await getDashboard(user);
  const firstName = user.name.split(" ")[0];
  const isFreelancerish = d.stats.earnedCents > 0 || d.pacts.some((p) => p.role === "freelancer");

  const stats = [
    { label: "Held in escrow", value: formatMoney(d.stats.heldCents), icon: Lock, tone: "text-amber-700 bg-amber-50", hint: "Secured with PayPal, waiting on work" },
    isFreelancerish
      ? { label: "Paid out to you", value: formatMoney(d.stats.earnedCents), icon: Banknote, tone: "text-jade-700 bg-jade-50", hint: "Released via PayPal Payouts" }
      : { label: "Released to freelancers", value: formatMoney(d.stats.paidCents), icon: Banknote, tone: "text-jade-700 bg-jade-50", hint: "Only for work that passed" },
    { label: "Needs your attention", value: String(d.actions.length), icon: Hourglass, tone: "text-sky-600 bg-sky-50", hint: d.actions.length ? "See the queue below" : "Nothing waiting on you" },
    { label: "Promises kept", value: String(d.stats.completed), icon: Sparkles, tone: "text-ember-700 bg-ember-50", hint: `${d.stats.active} active right now` },
  ];

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-3">{user.headline ?? "Your pacts"}</p>
          <h1 className="display mt-1 text-[44px]">
            {greeting()}, {firstName}.
          </h1>
        </div>
        <Button asChild variant="jade" size="lg">
          <Link href="/app/pacts/new">
            New pact <ArrowRight />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-3">{s.label}</span>
              <span className={cn("rounded-lg p-1.5", s.tone)}>
                <s.icon className="size-4" />
              </span>
            </div>
            <div className="num mt-3 text-[28px] font-semibold tracking-tight">{s.value}</div>
            <div className="mt-1 text-xs text-ink-3">{s.hint}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Needs your attention</CardTitle>
            {d.actions.length > 0 && <Badge tone="ember">{d.actions.length}</Badge>}
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {d.actions.length === 0 && (
              <p className="rounded-xl border border-dashed border-line-2 px-4 py-8 text-center text-sm text-ink-3">Nothing is waiting on you. Every promise is on track.</p>
            )}
            {d.actions.map((a, i) => (
              <Link
                key={`${a.pactId}-${a.milestoneId ?? i}-${a.label}`}
                href={a.href}
                className={cn("group flex items-center gap-4 rounded-xl border border-line border-l-[3px] bg-paper/50 px-4 py-3 transition-colors hover:bg-paper", TONE[a.tone])}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium">{a.label}</p>
                  <p className="truncate text-xs text-ink-3">
                    {a.pactTitle} · {a.detail}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-[13px] font-medium text-jade-700">
                  {a.cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card className="max-h-[420px] overflow-hidden">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[360px] overflow-y-auto">
            <Timeline events={d.events.slice(0, 10)} titles={d.pactTitles} compact />
          </CardContent>
        </Card>
      </div>

      <section className="min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">All pacts</h2>
          <span className="hidden text-xs text-ink-3 sm:inline">Sort, filter and search · AG Grid</span>
        </div>
        <PactsGrid rows={d.pacts} />
      </section>
    </div>
  );
}
