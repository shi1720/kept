"use client";

import { BookOpen, BrainCircuit, Gavel, Landmark, Vault, Webhook } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OpsConsole } from "@/lib/domain/ops";
import { cn } from "@/lib/cn";
import { DecisionsPanel } from "./decisions-grid";
import { DisputesQueue } from "./disputes-grid";
import { EscrowGrid } from "./escrow-grid";
import { LedgerPanel } from "./ledger-grid";
import { MovementsGrid } from "./movements-grid";
import type { OpsTab } from "./tab-keys";
import { WebhooksGrid } from "./webhooks-grid";


type Data = Pick<OpsConsole, "escrow" | "ledger" | "balances" | "movements" | "verdicts" | "disputes" | "webhooks">;

export function OpsTabs({ data, initialTab, paypalEnv, showWorkspace }: { data: Data; initialTab: OpsTab; paypalEnv: string; showWorkspace: boolean }) {
  const [tab, setTab] = useState<OpsTab>(initialTab);
  const queue = data.disputes.filter((d) => d.status !== "resolved").length;
  const webhookIssues = data.webhooks.filter((w) => w.error || !w.verified).length;
  const rulings = data.disputes.filter((d) => d.proposedPct != null);

  const tabs: { key: OpsTab; label: string; icon: React.ReactNode; count: number; alert?: boolean }[] = [
    { key: "escrow", label: "Escrow book", icon: <Vault />, count: data.escrow.length },
    { key: "ledger", label: "Ledger", icon: <BookOpen />, count: data.ledger.length },
    { key: "paypal", label: "PayPal activity", icon: <Landmark />, count: data.movements.length },
    { key: "ai", label: "AI decisions", icon: <BrainCircuit />, count: data.verdicts.length + rulings.length },
    { key: "disputes", label: "Disputes", icon: <Gavel />, count: queue, alert: queue > 0 },
    { key: "webhooks", label: "Webhooks", icon: <Webhook />, count: data.webhooks.length, alert: webhookIssues > 0 },
  ];

  const change = (v: string) => {
    setTab(v as OpsTab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", v);
      window.history.replaceState(null, "", url);
    } catch {
      /* non-critical */
    }
  };

  return (
    <Tabs value={tab} onValueChange={change} className="flex min-w-0 flex-col gap-5">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="w-max">
          {tabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="group">
              {t.icon}
              {t.label}
              <span
                className={cn(
                  "num ml-0.5 rounded-full px-1.5 text-[11px] font-semibold",
                  t.alert ? "bg-rose-600 text-white" : "bg-paper-2 text-ink-3 group-data-[state=active]:bg-ink group-data-[state=active]:text-paper",
                )}
              >
                {t.count}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value="escrow" className="outline-none">
        <EscrowGrid rows={data.escrow} showWorkspace={showWorkspace} />
      </TabsContent>
      <TabsContent value="ledger" className="outline-none">
        <LedgerPanel rows={data.ledger} balances={data.balances} showWorkspace={showWorkspace} />
      </TabsContent>
      <TabsContent value="paypal" className="outline-none">
        <MovementsGrid rows={data.movements} paypalEnv={paypalEnv} />
      </TabsContent>
      <TabsContent value="ai" className="outline-none">
        <DecisionsPanel verdicts={data.verdicts} rulings={rulings} />
      </TabsContent>
      <TabsContent value="disputes" className="outline-none">
        <DisputesQueue rows={data.disputes} />
      </TabsContent>
      <TabsContent value="webhooks" className="outline-none">
        <WebhooksGrid rows={data.webhooks} scoped={!showWorkspace} />
      </TabsContent>
    </Tabs>
  );
}
