/**
 * Two AI agents hire each other through Kept ;  over MCP, with PayPal escrow.
 *
 *   KEPT_URL=https://<your-kept> npm run agents:demo            # works with or without ANTHROPIC_API_KEY
 *
 * 1. Bootstraps a private demo world and mints an API key for each persona.
 * 2. Maya's agent (client) drafts and signs a pact; Ana's agent (freelancer) countersigns.
 * 3. Maya's agent creates the PayPal order. On a simulator deployment it is approved
 *    automatically; on the PayPal sandbox the script prints the approval link and waits for you.
 * 4. Ana's agent writes the deliverable (with Claude if ANTHROPIC_API_KEY is set) and submits it.
 * 5. Kept's AI referee judges it; Maya's agent approves on PASS or a score ≥ 80 (→ PayPal Payout), otherwise requests a revision.
 */
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
const BASE = (process.env.KEPT_URL || "http://localhost:3000").replace(/\/$/, "");

type ToolOut = { text: string; data: Record<string, unknown> };

async function session(as: "client" | "freelancer" | null, cookie?: string) {
  const res = await fetch(`${BASE}/api/auth/${as ? "demo" : "switch"}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(as ? { as } : {}),
  });
  if (!res.ok) throw new Error(`demo bootstrap failed: ${res.status} ${await res.text()}`);
  return res.headers.get("set-cookie")!.split(";")[0];
}

async function mintKey(cookie: string, name: string) {
  const res = await fetch(`${BASE}/api/keys`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ name }) });
  return ((await res.json()) as { key: string }).key;
}

async function agent(name: string, key: string) {
  const mcp = new Client({ name, version: "1.0.0" });
  await mcp.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/api/mcp`), { requestInit: { headers: { Authorization: `Bearer ${key}` } } }));
  return async (tool: string, args: Record<string, unknown> = {}): Promise<ToolOut> => {
    const out = await mcp.callTool({ name: tool, arguments: args });
    const text = (out.content as { text?: string }[]).map((c) => c.text ?? "").join("\n");
    console.log(`\n${name} ⏺ ${tool}\n  ⎿ ${text.split("\n").slice(0, 6).join("\n    ")}`);
    if (out.isError) throw new Error(text);
    return { text, data: (out.structuredContent ?? {}) as Record<string, unknown> };
  };
}

async function writeDeliverable(brief: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return `Lantern Holiday Blend. Some coffees are for rushing out the door; this one is for long December evenings, a blanket and someone you like. We built the Holiday Blend around a single harvest from the Alvarado family farm in Huila, Colombia, where three generations have grown coffee on the same steep hillside. In the cup you will find dark cherry up front, cocoa nib in the middle and a bright twist of orange peel on the finish. We roast every batch by hand in Austin. Brew it as a pour-over to taste the fruit, or as an espresso with oat milk for a dessert-like latte. Every bag pays the farm 40% above fair-trade price. $22 per 12oz bag. Pre-order now; ships December 1.`;
  }
  const claude = new Anthropic();
  const msg = await claude.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    max_tokens: 4000,
    system: "You are a freelance copywriter agent. Deliver exactly what the brief's acceptance criteria require. Output only the deliverable text.",
    messages: [{ role: "user", content: brief }],
  });
  return msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
}

async function main() {
  console.log(`Kept agent-to-agent demo against ${BASE}`);
  const mayaCookie = await session("client");
  const adeCookie = await session(null, mayaCookie);
  const maya = await agent("Maya's agent", await mintKey(mayaCookie, "maya-agent"));
  const ade = await agent("Ana's agent", await mintKey(adeCookie, "ade-agent"));

  const brief =
    "Write a product description for Lantern Coffee's Holiday Blend for our shop page. At least 120 words, mention the tasting notes (dark cherry, cocoa nib, orange peel), the Huila origin, the $22 price and a clear call to pre-order. Budget $80, due in 3 days.";
  const created = await maya("create_pact", { description: brief, role: "client" });
  const pactId = created.data.pact_id as string;
  const sent = await maya("send_pact", { pact_id: pactId });
  await ade("accept_invite", { invite: sent.data.invite_url as string });

  const pact = await maya("get_pact", { pact_id: pactId });
  const list = await maya("list_pacts");
  const milestoneId = ((list.data.pacts as { id: string; milestones: { id: string }[] }[]).find((p) => p.id === pactId)!.milestones[0]).id;
  const order = await maya("create_funding_order", { milestone_id: milestoneId });
  if (order.data.mode === "simulator") {
    await fetch(`${BASE}/api/simulator/approve`, { method: "POST", headers: { "content-type": "application/json", cookie: mayaCookie }, body: JSON.stringify({ orderId: order.data.order_id }) });
    await maya("confirm_funding", { order_id: order.data.order_id as string });
  } else {
    console.log(`\n👉 Approve the PayPal payment as the human client: ${order.data.approve_url}\n   Waiting for PayPal…`);
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        await maya("confirm_funding", { order_id: order.data.order_id as string });
        break;
      } catch {
        /* not approved yet */
      }
    }
  }
  void pact;

  const text = await writeDeliverable(`${brief}\n\nAcceptance criteria are in the pact: ${created.text}`);
  const submitted = await ade("submit_deliverable", { milestone_id: milestoneId, note: "Delivered by Ana's writing agent", text });
  const verdict = submitted.data.verdict as { overall: string; score: number } | null;
  // Maya's agent policy: approve a PASS, or a strong PARTIAL (≥ 80) ;  otherwise ask for a revision.
  if (verdict && (verdict.overall === "pass" || verdict.score >= 80)) await maya("approve_milestone", { milestone_id: milestoneId });
  else await maya("request_revision", { milestone_id: milestoneId, note: "Please address the referee's notes and resubmit." });

  console.log(`\n✅ Done. Open ${BASE}/app/pacts/${pactId} (log in via the demo cookie, or look at the ops console).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
