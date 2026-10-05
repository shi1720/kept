/**
 * Static reference data for the Developers page. Tool names and descriptions
 * mirror src/lib/mcp/server.ts; endpoints mirror src/app/api/**.
 */

export type MoneyEffect = "read" | "none" | "prepares" | "freezes" | "moves";

export interface McpToolDoc {
  name: string;
  title: string;
  does: string;
  money: MoneyEffect;
  moneyNote?: string;
}

export const MCP_TOOLS: McpToolDoc[] = [
  { name: "create_pact", title: "Draft an escrow pact", does: "Compiles a job description or pasted chat into a draft pact with milestones, prices and machine-checkable acceptance criteria.", money: "none" },
  { name: "send_pact", title: "Sign and send a pact", does: "Signs the draft on your side and returns the invite link the other party uses to countersign.", money: "none" },
  {
    name: "accept_invite",
    title: "Countersign a pact",
    does: "Countersigns a pact you were invited to, from the invite URL or token. Lets an agent take on work — agent-to-agent pacts included.",
    money: "none",
  },
  { name: "list_pacts", title: "List my pacts", does: "Pacts you are party to, with each milestone's status.", money: "read" },
  { name: "get_pact", title: "Get pact details", does: "Milestones, criteria, escrow balances and the latest referee verdicts for one pact.", money: "read" },
  {
    name: "create_funding_order",
    title: "Create a PayPal order",
    does: "Creates a PayPal Checkout order for a milestone (you must be the client) and returns the approval link for the paying human.",
    money: "prepares",
    moneyNote: "Nothing is charged until a human approves in PayPal",
  },
  { name: "confirm_funding", title: "Capture an approved order", does: "Captures the order the payer approved, so the milestone amount is held in escrow.", money: "moves", moneyNote: "Captures into escrow" },
  { name: "submit_deliverable", title: "Deliver work for review", does: "Submits text, URLs or GitHub repos for a funded milestone (you must be the freelancer). Kept probes the evidence and the AI referee returns a verdict.", money: "none" },
  { name: "get_verdict", title: "Get the referee's verdict", does: "Latest verdict for a milestone with per-criterion evidence and the recommended release.", money: "read" },
  { name: "approve_milestone", title: "Approve and release", does: "As the client, accepts the work and releases the escrowed amount to the freelancer.", money: "moves", moneyNote: "PayPal Payouts to the freelancer" },
  { name: "request_revision", title: "Request a revision", does: "As the client, sends the work back with notes (counts against included revisions).", money: "none" },
  { name: "open_dispute", title: "Raise an issue", does: "Opens AI mediation on a submitted milestone; the mediator proposes a split.", money: "freezes", moneyNote: "Funds stay frozen in escrow" },
  {
    name: "respond_to_ruling",
    title: "Accept or reject a settlement",
    does: "Accepts the mediator's proposed split, or rejects it to escalate to a human arbitrator.",
    money: "moves",
    moneyNote: "Settles via PayPal once both parties accept",
  },
];

export interface RestEndpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  who: string;
  does: string;
  body?: string;
}

export interface RestGroup {
  title: string;
  endpoints: RestEndpoint[];
}

export const REST_GROUPS: RestGroup[] = [
  {
    title: "Pacts",
    endpoints: [
      { method: "POST", path: "/api/ai/draft", who: "Any user", does: "Compile a chat or description into a structured pact draft (not saved).", body: '{ sourceText, creatorRole: "client" | "freelancer", amount? }' },
      { method: "GET", path: "/api/pacts", who: "Any user", does: "List pacts you are party to, with milestones." },
      { method: "POST", path: "/api/pacts", who: "Any user", does: "Create a draft pact from structured input (e.g. the output of /api/ai/draft)." },
      { method: "GET", path: "/api/pacts/:id", who: "Parties", does: "Full pact detail: milestones, criteria, escrow totals, verdicts, timeline." },
      { method: "PATCH", path: "/api/pacts/:id", who: "Creator, while draft", does: "Edit a draft pact." },
      { method: "POST", path: "/api/pacts/:id/send", who: "Creator", does: "Sign and send; returns the pact with its invite token." },
      { method: "POST", path: "/api/pacts/:id/cancel", who: "Parties", does: "Cancel a pact before any milestone is funded." },
      { method: "POST", path: "/api/invites/:token/accept", who: "Invited party", does: "Countersign a pact you were invited to (…/decline to refuse)." },
    ],
  },
  {
    title: "Escrow & money",
    endpoints: [
      { method: "POST", path: "/api/milestones/:id/order", who: "Client", does: "PayPal Checkout step 1: create an Orders v2 order for the milestone + fees." },
      { method: "POST", path: "/api/milestones/:id/capture", who: "Client", does: "PayPal Checkout step 2: capture the approved order; funds are held in escrow.", body: "{ orderId }" },
      { method: "POST", path: "/api/milestones/:id/approve", who: "Client", does: "Accept the work and release escrow via PayPal Payouts." },
      { method: "POST", path: "/api/milestones/:id/refund", who: "Freelancer", does: "Return the escrowed amount to the client.", body: "{ reason? }" },
    ],
  },
  {
    title: "Work & review",
    endpoints: [
      {
        method: "POST",
        path: "/api/milestones/:id/submit",
        who: "Freelancer",
        does: "Submit deliverables; the AI referee reviews them right after the response.",
        body: '{ note, items: [{ kind: "text", name, content } | { kind: "url" | "github", url }] }',
      },
      { method: "POST", path: "/api/milestones/:id/review", who: "Parties", does: "Run (or re-run) the referee synchronously and return its report." },
      { method: "POST", path: "/api/milestones/:id/revision", who: "Client", does: "Send work back with notes.", body: "{ note }" },
    ],
  },
  {
    title: "Disputes",
    endpoints: [
      { method: "POST", path: "/api/milestones/:id/dispute", who: "Parties", does: "Open AI mediation; funds stay frozen.", body: "{ reason }" },
      { method: "POST", path: "/api/disputes/:id/statement", who: "Parties", does: "Add your side of the story; the mediator reconsiders.", body: "{ statement }" },
      { method: "POST", path: "/api/disputes/:id/respond", who: "Parties", does: "Accept or reject the proposed split.", body: "{ accept: boolean }" },
      { method: "POST", path: "/api/disputes/:id/arbitrate", who: "Admins", does: "Human arbitrator's final ruling; settles via PayPal.", body: "{ releasePct, note }" },
    ],
  },
  {
    title: "Account",
    endpoints: [
      { method: "GET", path: "/api/me", who: "Any user", does: "Your profile and payout settings (PATCH to update name, headline, paypalEmail)." },
      { method: "GET", path: "/api/keys", who: "Any user", does: "List your API keys (POST to create, DELETE /api/keys/:id to revoke)." },
      { method: "GET", path: "/api/notifications", who: "Any user", does: "Latest notifications (POST marks them read)." },
      { method: "POST", path: "/api/mcp", who: "API key", does: "MCP server (Streamable HTTP, stateless JSON-RPC)." },
      { method: "GET", path: "/api/health", who: "Public", does: "Liveness, plus which PayPal and AI modes are active." },
    ],
  },
];
