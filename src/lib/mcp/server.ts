import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { draftPact } from "@/lib/ai/drafter";
import type { User } from "@/lib/db/schema";
import { latestVerdict, loadMilestone, assertParty } from "@/lib/domain/context";
import { activeDispute, openDispute, respondToRuling } from "@/lib/domain/disputes";
import { captureFunding, createFundingOrder } from "@/lib/domain/funding";
import { acceptPact, createPact, draftToInput, listPactsForUser, sendPact } from "@/lib/domain/pacts";
import { getPactDetail } from "@/lib/domain/queries";
import { MILESTONE_STATUS_LABEL } from "@/lib/domain/state";
import { approveMilestone, requestRevision, runReview, submitWork } from "@/lib/domain/work";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";

/**
 * Kept as an MCP server: lets any AI agent (Claude, ChatGPT, a custom
 * LangGraph worker…) hire people or other agents with escrow protection.
 * Agents can draft and send pacts, create PayPal orders whose approval link
 * goes to a human, submit deliverables and read the referee's verdicts.
 * Money only moves on a human's PayPal approval or an evidence-backed verdict.
 */
type ToolResult = { content: { type: "text"; text: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean };

function ok(text: string, data?: Record<string, unknown>): ToolResult {
  return { content: [{ type: "text", text }], ...(data ? { structuredContent: data } : {}) };
}

async function safely(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
  }
}

const pactUrl = (id: string) => `${env.appUrl}/app/pacts/${id}`;

export function buildMcpServer(user: User): McpServer {
  const server = new McpServer(
    { name: "kept-escrow", version: "1.0.0" },
    {
      instructions:
        "Kept is escrow with an AI referee, built on PayPal. Use create_pact to turn a job description into a contract with machine-checkable acceptance criteria, send_pact to get a signing link for the other party (an agent on the other side uses accept_invite), create_funding_order to get a PayPal approval link for the paying human, submit_deliverable to deliver work (the AI referee reviews it), and get_pact / get_verdict to follow progress. Never claim money has moved unless a tool result says so.",
    },
  );

  server.registerTool(
    "create_pact",
    {
      title: "Draft an escrow pact",
      description:
        "Compile a natural-language job description (or a pasted chat) into a Kept pact with milestones, prices and objective acceptance criteria. Saved as a draft owned by you.",
      inputSchema: {
        description: z.string().min(20).describe("What needs to be done, for how much, by when. Can be a pasted conversation."),
        role: z.enum(["client", "freelancer"]).describe("Your side of the deal: client pays, freelancer delivers"),
        budget: z.number().positive().optional().describe("Total budget in USD, if known"),
        counterparty_email: z.string().email().optional(),
      },
    },
    async ({ description, role, budget, counterparty_email }) =>
      safely(async () => {
        const { output, provider, model } = await draftPact({ sourceText: description, creatorRole: role, hints: budget ? { amount: budget } : undefined });
        const input = draftToInput(output, { creatorRole: role, sourceText: description, counterpartyEmail: counterparty_email ?? null });
        const pact = await createPact(user, input, "mcp");
        const lines = input.milestones.map(
          (m, i) => `${i + 1}. ${m.title} — $${m.amount}\n${m.criteria.map((c) => `   • ${c.text}${c.check.type !== "none" ? ` [auto-check: ${c.check.type}]` : ""}`).join("\n")}`,
        );
        return ok(
          `Drafted pact ${pact.id}: “${pact.title}” (clarity of the original brief: ${output.clarityScore}/100, compiled by ${provider}/${model}).\n\n${lines.join("\n")}\n\n${
            output.ambiguities.length ? `Resolved ambiguities:\n${output.ambiguities.map((a) => `- “${a.quote}” → ${a.suggestion}`).join("\n")}\n\n` : ""
          }${output.riskFlags.length ? `⚠ Risk flags: ${output.riskFlags.map((r) => `${r.signal} (${r.severity})`).join("; ")}\n\n` : ""}Review it at ${pactUrl(pact.id)} then call send_pact.`,
          { pact_id: pact.id, url: pactUrl(pact.id), clarity_score: output.clarityScore, milestones: input.milestones },
        );
      }),
  );

  server.registerTool(
    "send_pact",
    {
      title: "Sign and send a pact",
      description: "Sign a draft pact on your side and get the invitation link the other party uses to countersign.",
      inputSchema: { pact_id: z.string() },
    },
    async ({ pact_id }) =>
      safely(async () => {
        const pact = await sendPact(user, pact_id);
        const link = `${env.appUrl}/invite/${pact.inviteToken}`;
        return ok(`Signed and sent. Share this link with the other party to countersign: ${link}`, { invite_url: link });
      }),
  );

  server.registerTool(
    "accept_invite",
    {
      title: "Countersign a pact",
      description:
        "Countersign a pact you were invited to (pass the invite URL or its token). Use this when you are the counterparty — e.g. an agent taking on work. The pact becomes active and the client can fund it.",
      inputSchema: { invite: z.string().describe("Invite URL (…/invite/<token>) or the bare token") },
    },
    async ({ invite }) =>
      safely(async () => {
        const token = invite.trim().split("/invite/").pop()!.split(/[?#]/)[0];
        const pact = await acceptPact(user, token);
        return ok(`Countersigned “${pact.title}”. The pact is sealed; milestones await funding by the client. ${pactUrl(pact.id)}`, { pact_id: pact.id, status: pact.status });
      }),
  );

  server.registerTool(
    "list_pacts",
    { title: "List my pacts", description: "List pacts you are party to, with milestone statuses.", inputSchema: {}, annotations: { readOnlyHint: true } },
    async () =>
      safely(async () => {
        const pacts = await listPactsForUser(user);
        if (!pacts.length) return ok("You have no pacts yet.");
        return ok(
          pacts
            .map((p) => `${p.id} · ${p.title} · ${p.status} · you are the ${p.role}\n${p.milestones.map((m) => `   ${m.id}: ${m.title} — ${formatMoney(m.amountCents)} — ${MILESTONE_STATUS_LABEL[m.status]}`).join("\n")}`)
            .join("\n\n"),
          { pacts: pacts.map((p) => ({ id: p.id, title: p.title, status: p.status, role: p.role, milestones: p.milestones.map((m) => ({ id: m.id, title: m.title, status: m.status, amount_cents: m.amountCents })) })) },
        );
      }),
  );

  server.registerTool(
    "get_pact",
    { title: "Get pact details", description: "Full status of a pact: milestones, criteria, escrow balances and latest verdicts.", inputSchema: { pact_id: z.string() }, annotations: { readOnlyHint: true } },
    async ({ pact_id }) =>
      safely(async () => {
        const d = await getPactDetail(user, pact_id);
        const text = [
          `${d.pact.title} — ${d.pact.status}. You are the ${d.role}.`,
          `Escrow: ${formatMoney(d.totals.heldCents)} held · ${formatMoney(d.totals.releasedCents)} released · ${formatMoney(d.totals.refundedCents)} refunded`,
          ...d.milestones.map((m) => {
            const v = m.verdicts[0];
            return `\n${m.id}: ${m.title} — ${formatMoney(m.amountCents)} — ${MILESTONE_STATUS_LABEL[m.status]}\n${m.criteria.map((c) => `   • ${c.text}`).join("\n")}${v ? `\n   Referee: ${v.overall.toUpperCase()} ${v.score}/100 — ${v.summary}` : ""}`;
          }),
        ].join("\n");
        return ok(text, { pact_id, status: d.pact.status, totals: d.totals, url: pactUrl(pact_id) });
      }),
  );

  server.registerTool(
    "create_funding_order",
    {
      title: "Create a PayPal order to fund a milestone",
      description:
        "Creates a PayPal Checkout order for a milestone (you must be the client). Returns a PayPal approval link for the human who pays. After they approve, call confirm_funding (PayPal webhooks also confirm it automatically).",
      inputSchema: { milestone_id: z.string() },
    },
    async ({ milestone_id }) =>
      safely(async () => {
        const r = await createFundingOrder(user, milestone_id, { flow: "redirect" });
        const link = r.approveUrl ?? pactUrl((await loadMilestone(milestone_id)).pact.id);
        return ok(
          `PayPal order ${r.orderId} created for ${formatMoney(r.quote.totalCents)} (milestone ${formatMoney(r.quote.milestoneCents)} + Kept fee ${formatMoney(r.quote.platformFeeCents)} + processing ${formatMoney(r.quote.processingFeeCents)}).\nAsk the payer to approve it here: ${link}`,
          { order_id: r.orderId, approve_url: link, quote: r.quote, mode: r.mode },
        );
      }),
  );

  server.registerTool(
    "confirm_funding",
    {
      title: "Capture an approved PayPal order",
      description: "After the payer approved the PayPal order, capture it so the money is held in escrow.",
      inputSchema: { order_id: z.string() },
    },
    async ({ order_id }) =>
      safely(async () => {
        const r = await captureFunding(order_id, { user, source: "checkout" });
        return ok(`Funded. ${formatMoney(r.milestone.amountCents)} is held in escrow for “${r.milestone.title}”.`, { status: r.milestone.status });
      }),
  );

  server.registerTool(
    "submit_deliverable",
    {
      title: "Deliver work for review",
      description:
        "Submit deliverables for a funded milestone (you must be the freelancer). Kept's evidence engine probes them and the AI referee returns a criterion-by-criterion verdict.",
      inputSchema: {
        milestone_id: z.string(),
        note: z.string().optional(),
        text: z.string().optional().describe("Inline written deliverable (markdown or plain text)"),
        urls: z.array(z.string().url()).optional().describe("Live URLs to check"),
        github: z.array(z.string()).optional().describe("GitHub repositories, e.g. owner/repo"),
      },
    },
    async ({ milestone_id, note, text, urls, github }) =>
      safely(async () => {
        const items = [
          ...(text ? [{ kind: "text" as const, name: "deliverable.md", content: text }] : []),
          ...(urls ?? []).map((url) => ({ kind: "url" as const, url })),
          ...(github ?? []).map((url) => ({ kind: "github" as const, url })),
        ];
        await submitWork(user, milestone_id, { note: note ?? "", items });
        await runReview(milestone_id);
        const v = await latestVerdict(milestone_id);
        return ok(
          v ? `Submitted. Referee verdict: ${v.overall.toUpperCase()} (${v.score}/100). ${v.summary}\n${v.notesForFreelancer ? `To improve: ${v.notesForFreelancer}` : ""}` : "Submitted; review pending.",
          { verdict: v ? { overall: v.overall, score: v.score, criteria: v.criteriaResults } : null },
        );
      }),
  );

  server.registerTool(
    "get_verdict",
    { title: "Get the referee's verdict", description: "Latest AI referee verdict for a milestone, with per-criterion evidence.", inputSchema: { milestone_id: z.string() }, annotations: { readOnlyHint: true } },
    async ({ milestone_id }) =>
      safely(async () => {
        const { pact, criteria } = await loadMilestone(milestone_id);
        assertParty(user, pact);
        const v = await latestVerdict(milestone_id);
        if (!v) return ok("No verdict yet.");
        const byId = new Map(criteria.map((c) => [c.id, c.text]));
        return ok(
          `${v.overall.toUpperCase()} ${v.score}/100 — ${v.summary}\n${v.criteriaResults.map((r) => `• [${r.result}] ${byId.get(r.criterionId)} — ${r.evidence}`).join("\n")}`,
          { overall: v.overall, score: v.score, recommended_release_pct: v.recommendedReleasePct, criteria: v.criteriaResults },
        );
      }),
  );

  server.registerTool(
    "approve_milestone",
    { title: "Approve and release payment", description: "As the client, accept the work and release the escrowed amount to the freelancer via PayPal Payouts.", inputSchema: { milestone_id: z.string() }, annotations: { destructiveHint: true } },
    async ({ milestone_id }) =>
      safely(async () => {
        await approveMilestone(user, milestone_id);
        return ok("Approved. The escrowed amount is being paid out to the freelancer via PayPal.");
      }),
  );

  server.registerTool(
    "request_revision",
    { title: "Request a revision", description: "As the client, send the work back with notes (counts against included revisions).", inputSchema: { milestone_id: z.string(), note: z.string().min(5) } },
    async ({ milestone_id, note }) =>
      safely(async () => {
        await requestRevision(user, milestone_id, note);
        return ok("Revision requested.");
      }),
  );

  server.registerTool(
    "open_dispute",
    { title: "Raise an issue", description: "Open AI mediation on a submitted milestone. Funds stay frozen; the mediator proposes a split.", inputSchema: { milestone_id: z.string(), reason: z.string().min(10) } },
    async ({ milestone_id, reason }) =>
      safely(async () => {
        const d = await openDispute(user, milestone_id, reason);
        return ok(`Mediation opened. Proposal: release ${d.ruling?.releasePct}% to the freelancer. ${d.ruling?.rationale ?? ""}`, { dispute_id: d.id, ruling: d.ruling });
      }),
  );

  server.registerTool(
    "respond_to_ruling",
    { title: "Accept or reject a settlement", description: "Accept the AI mediator's proposed split (settles via PayPal once both accept) or reject it to escalate to a human.", inputSchema: { milestone_id: z.string(), accept: z.boolean() } },
    async ({ milestone_id, accept }) =>
      safely(async () => {
        const d = await activeDispute(milestone_id);
        if (!d) return ok("There is no open dispute on this milestone.");
        const after = await respondToRuling(user, d.id, accept);
        return ok(after.status === "resolved" ? `Settled at ${after.finalReleasePct}% via PayPal.` : accept ? "Accepted — waiting for the other party." : "Rejected — escalated to a human arbitrator.");
      }),
  );

  return server;
}
