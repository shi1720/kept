import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LiveBooksBadge, LiveIndicator, LiveKpis, OpsLiveProvider } from "@/components/admin/ops-live";
import { OpsTabs } from "@/components/admin/ops-tabs";
import { OPS_TABS, type OpsTab } from "@/components/admin/tab-keys";
import { getCurrentUser } from "@/lib/auth/session";
import { getOpsConsole, resolveOpsScope } from "@/lib/domain/ops";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Ops console" };
export const dynamic = "force-dynamic";

export default async function OpsConsolePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  const scope = resolveOpsScope(user);
  if (!user || !scope) redirect("/app");
  const sp = await searchParams;
  const requested = typeof sp.tab === "string" ? sp.tab : "";
  const initialTab: OpsTab = (OPS_TABS as readonly string[]).includes(requested) ? (requested as OpsTab) : "escrow";

  const data = await getOpsConsole(scope);
  const isAdmin = scope.kind === "admin";

  return (
    <OpsLiveProvider initial={data}>
      <div className="flex flex-col gap-7 animate-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-3">{isAdmin ? "Kept operations · all workspaces" : "Kept operations · ops view"}</p>
            <h1 className="display mt-1.5 text-[40px] sm:text-[46px]">Every dollar, accounted for.</h1>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
              Escrow balances, PayPal money movement, the double-entry ledger and every AI decision, all reconciled live from the same books.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LiveIndicator />
            <LiveBooksBadge />
          </div>
        </div>

        {!isAdmin && (
          <div className="flex items-start gap-3 rounded-2xl border border-ember-100 bg-ember-50 px-4 py-3.5 text-[13.5px] text-ember-700">
            <Sparkles className="mt-0.5 size-4 shrink-0" />
            <p className="leading-relaxed">
              <b className="font-semibold">You’re viewing the ops console for your demo world.</b> Kept’s operators see every workspace here; you see only the pacts, money and AI
              decisions in the sandbox created for you; and you can act as the human arbitrator on its disputes.
            </p>
          </div>
        )}

        <LiveKpis />

        <OpsTabs initialTab={initialTab} paypalEnv={env.paypal.environment} showWorkspace={isAdmin} />
      </div>
    </OpsLiveProvider>
  );
}
