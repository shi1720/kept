/**
 * `npm run doctor` — verifies the live integrations with the keys in your env:
 * database, PayPal OAuth + Orders + Payouts permission, and the AI provider.
 */
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const ok = (m: string) => console.log(`  ✅ ${m}`);
const bad = (m: string) => console.log(`  ❌ ${m}`);
const info = (m: string) => console.log(`  • ${m}`);

async function main() {
  const { env, paypalConfigured } = await import("../src/lib/env");
  console.log("\nKept doctor\n");

  console.log("Database");
  try {
    const { ensureMigrated } = await import("../src/lib/db/migrate");
    await ensureMigrated();
    ok(`migrations applied (${env.databaseUrl.split("?")[0]})`);
  } catch (e) {
    bad(`database: ${(e as Error).message}`);
  }

  console.log("\nPayPal");
  if (!paypalConfigured()) {
    info("PAYPAL_CLIENT_ID/SECRET not set — the app will use the PayPal simulator");
  } else {
    try {
      const { getAccessToken } = await import("../src/lib/paypal/http");
      await getAccessToken();
      ok(`OAuth token for ${env.paypal.environment}`);
      const { LivePayPalGateway } = await import("../src/lib/paypal/live");
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
      ok(`Orders v2 create (order ${order.orderId}, approve link ${order.approveUrl ? "present" : "missing"})`);
      if (env.paypal.demoPayoutEmail) {
        const p = await gw.createPayout({
          senderBatchId: `doctor-${Date.now()}`,
          senderItemId: "doctor",
          receiverEmail: env.paypal.demoPayoutEmail,
          amountCents: 100,
          currency: "USD",
          subject: "Kept doctor test payout",
          note: "Connectivity check",
        });
        ok(`Payouts (batch ${p.batchId}: ${p.status}${p.itemStatus ? ` / item ${p.itemStatus}` : ""})`);
      } else info("PAYPAL_DEMO_PAYOUT_EMAIL not set — skipping payout check");
      if (!env.paypal.webhookId) info("PAYPAL_WEBHOOK_ID not set — webhooks will be stored but not trusted");
    } catch (e) {
      bad(`PayPal: ${(e as Error).message}`);
    }
  }

  console.log("\nAI");
  const { aiStatus } = await import("../src/lib/ai/provider");
  const st = aiStatus();
  if (st.mode === "offline") info("No AI key — offline heuristic referee in use");
  else {
    try {
      const { draftPact } = await import("../src/lib/ai/drafter");
      const t = Date.now();
      const r = await draftPact({
        sourceText: "Maya: Can you design a logo for my coffee shop? Budget $400, need 3 concepts and final files by next Friday. A few revisions are fine.",
        creatorRole: "client",
      });
      if (r.degraded) bad(`draft fell back to offline (provider ${st.provider} failed — see logs above)`);
      else ok(`${r.provider}/${r.model} drafted “${r.output.title}” with ${r.output.milestones.reduce((s, m) => s + m.criteria.length, 0)} criteria in ${((Date.now() - t) / 1000).toFixed(1)}s`);
    } catch (e) {
      bad(`AI: ${(e as Error).message}`);
    }
  }
  console.log("");
}

main().then(() => process.exit(0));
