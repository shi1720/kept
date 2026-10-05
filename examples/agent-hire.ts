/**
 * An autonomous hiring agent built on Claude + Kept's MCP server.
 *
 *   KEPT_URL=https://<your-kept>.onrender.com KEPT_API_KEY=kept_sk_… ANTHROPIC_API_KEY=sk-ant-… \
 *     npm run agent -- "Hire a designer for 3 Instagram carousels for my yoga studio, $300, due in 10 days"
 *
 * The agent discovers Kept's tools over MCP, drafts an escrow pact with checkable
 * criteria, signs it, and creates the PayPal order whose approval link it hands
 * back to you ;  the human who actually pays. It never moves money on its own.
 */
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const KEPT_URL = (process.env.KEPT_URL || "http://localhost:3000").replace(/\/$/, "");
const KEPT_API_KEY = process.env.KEPT_API_KEY;
const task = process.argv.slice(2).join(" ") || "Hire a designer for 3 Instagram carousel designs for my yoga studio launch. Budget $300, due in 10 days.";

if (!KEPT_API_KEY) {
  console.error("Set KEPT_API_KEY (create one under Agents & API in Kept).");
  process.exit(1);
}

const SYSTEM = `You are a hiring agent acting for a small-business owner. You use Kept (escrow with an AI referee, built on PayPal) so that money is only released for work that meets agreed criteria.
Steps: 1) create_pact from the owner's request (role: client). 2) Review the criteria it returns; if they are reasonable, send_pact to get the signing link for the freelancer. 3) create_funding_order for the first milestone so the owner can approve the PayPal payment. 4) Finish with a short summary for the owner: what was agreed, the signing link to send the freelancer, and the PayPal approval link to click. Never claim money moved unless a tool result says so.`;

async function main() {
  const mcp = new Client({ name: "kept-hiring-agent", version: "1.0.0" });
  await mcp.connect(
    new StreamableHTTPClientTransport(new URL(`${KEPT_URL}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${KEPT_API_KEY}` } },
    }),
  );
  const { tools } = await mcp.listTools();
  console.log(`Connected to Kept MCP · ${tools.length} tools\n`);

  const anthropic = new Anthropic();
  const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
  }));
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: task }];

  for (let turn = 0; turn < 12; turn++) {
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      system: SYSTEM,
      tools: anthropicTools,
      messages,
    });
    for (const block of response.content) if (block.type === "text" && block.text.trim()) console.log(`🤖 ${block.text.trim()}\n`);
    if (response.stop_reason === "refusal") throw new Error("The model declined this request");
    messages.push({ role: "assistant", content: response.content });
    if (response.stop_reason === "pause_turn") continue;
    if (response.stop_reason !== "tool_use") break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      console.log(`⏺ kept.${block.name}(${JSON.stringify(block.input).slice(0, 160)})`);
      const out = await mcp.callTool({ name: block.name, arguments: block.input as Record<string, unknown> });
      const text = (out.content as { type: string; text?: string }[]).map((c) => c.text ?? "").join("\n");
      console.log(`  ⎿ ${text.split("\n")[0].slice(0, 200)}\n`);
      results.push({ type: "tool_result", tool_use_id: block.id, content: text, is_error: Boolean(out.isError) });
    }
    messages.push({ role: "user", content: results });
  }
  await mcp.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
