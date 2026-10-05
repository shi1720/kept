import { aiStatus } from "@/lib/ai/provider";
import { env, paypalConfigured } from "@/lib/env";

export interface DoctorCheck {
  name: string;
  status: "ok" | "fail" | "skipped";
  detail: string;
}

/** Live integration self-test. Reports outcomes only; never secrets. */
export async function runDoctor(): Promise<{ checks: DoctorCheck[]; at: string }> {
  const checks: DoctorCheck[] = [];
  const push = (name: string, status: DoctorCheck["status"], detail: string) => checks.push({ name, status, detail });

  try {
    const { ensureMigrated } = await import("@/lib/db/migrate");
    await ensureMigrated();
    push("database", "ok", env.databaseUrl.startsWith("libsql") ? "libSQL (Turso)" : "SQLite file");
  } catch (e) {
    push("database", "fail", (e as Error).message);
  }

  if (!paypalConfigured()) {
    push("paypal", "skipped", "No credentials; running on the PayPal simulator");
  } else {
    try {
      const { getAccessToken } = await import("@/lib/paypal/http");
      await getAccessToken();
      push("paypal.oauth", "ok", `client-credentials token (${env.paypal.environment})`);
      const { LivePayPalGateway } = await import("@/lib/paypal/live");
      const gw = new LivePayPalGateway();
      const order = await gw.createOrder({
        milestoneId: "mst_doctor",
        pactId: "pct_doctor",
        pactTitle: "Doctor check",
        milestoneTitle: "Connectivity",
        currency: "USD",
        quote: { milestoneCents: 1000, platformFeeCents: 100, processingFeeCents: 90, totalCents: 1190 },
        requestId: `doctor-${Date.now()}`,
      });
      push("paypal.orders", "ok", `Orders v2 create → ${order.status}${order.approveUrl ? " with approval link" : ""}`);
      if (env.paypal.demoPayoutEmail && env.paypal.environment === "sandbox") {
        const p = await gw.createPayout({
          senderBatchId: `doctor-${Date.now()}`,
          senderItemId: "doctor",
          receiverEmail: env.paypal.demoPayoutEmail,
          amountCents: 100,
          currency: "USD",
          subject: "Kept connectivity check",
          note: "Automated connectivity check ($1, sandbox)",
        });
        push("paypal.payouts", "ok", `Payouts batch ${p.status}${p.itemStatus ? ` / item ${p.itemStatus}` : ""}`);
      } else push("paypal.payouts", "skipped", "PAYPAL_DEMO_PAYOUT_EMAIL not set");
      push("paypal.webhooks", env.paypal.webhookId ? "ok" : "skipped", env.paypal.webhookId ? "webhook id configured (signature verification on)" : "PAYPAL_WEBHOOK_ID not set");
    } catch (e) {
      push("paypal", "fail", (e as Error).message);
    }
  }

  const ai = aiStatus();
  if (ai.mode === "offline") push("ai", "skipped", "No AI key; offline heuristic referee");
  else {
    try {
      const { draftPact } = await import("@/lib/ai/drafter");
      const t = Date.now();
      const r = await draftPact({ sourceText: "Can you design a logo for my coffee shop? Budget $400, 3 concepts, final files by Friday.", creatorRole: "client" });
      push("ai", r.degraded ? "fail" : "ok", r.degraded ? `${ai.provider} failed, fell back to offline` : `${r.model} compiled a pact in ${((Date.now() - t) / 1000).toFixed(1)}s`);
    } catch (e) {
      push("ai", "fail", (e as Error).message);
    }
  }
  return { checks, at: new Date().toISOString() };
}
