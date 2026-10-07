import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  LiveBooksBadge,
  LiveIndicator,
  LiveKpis,
  OpsLiveProvider,
} from "@/components/admin/ops-live";
import { OpsTabs } from "@/components/admin/ops-tabs";
import { OPS_TABS, type OpsTab } from "@/components/admin/tab-keys";
import { getCurrentUser } from "@/lib/auth/session";
import { getOpsConsole, resolveOpsScope } from "@/lib/domain/ops";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Ops console" };
export const dynamic = "force-dynamic";

export default async function OpsConsolePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const scope = resolveOpsScope(user);
  if (!user || !scope) redirect("/app");
  const sp = await searchParams;
  const requested = typeof sp.tab === "string" ? sp.tab : "";
  const initialTab: OpsTab = (OPS_TABS as readonly string[]).includes(requested)
    ? (requested as OpsTab)
    : "escrow";

  const data = await getOpsConsole(scope);
  const isAdmin = scope.kind === "admin";

  return (
    <OpsLiveProvider initial={data}>
      <div className="flex flex-col gap-7 animate-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-3">
              {isAdmin
                ? "Kept operations · all workspaces"
                : "Kept operations · ops view"}
            </p>
            <h1 className="display mt-1.5 text-[40px] sm:text-[46px]">
              Operations
            </h1>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
              Monitor balances, review exceptions and trace every payment.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LiveIndicator />
            <LiveBooksBadge />
          </div>
        </div>

        {!isAdmin && (
          <details className="rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink-2">
            <summary className="flex cursor-pointer items-center gap-2 font-medium">
              <Sparkles className="size-4 text-jade-700" />
              Your demo workspace
            </summary>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ink-3">
              Only your demo pacts and test payments appear here. You can also
              try the human arbitrator flow for disputes. No real money moves.
            </p>
          </details>
        )}

        <LiveKpis />

        <OpsTabs
          initialTab={initialTab}
          paypalEnv={env.paypal.environment}
          showWorkspace={isAdmin}
        />
      </div>
    </OpsLiveProvider>
  );
}
