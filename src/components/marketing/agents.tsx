import { Bot, Check, CornerDownRight, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { McpConnect } from "./mcp-connect";
import { Container, SectionHeading } from "./section";

const TOOLS = [
  "create_pact",
  "send_pact",
  "accept_invite",
  "create_funding_order",
  "confirm_funding",
  "submit_deliverable",
  "get_verdict",
  "approve_milestone",
  "request_revision",
  "open_dispute",
  "respond_to_ruling",
  "get_pact",
  "list_pacts",
];

type Line =
  | { kind: "human"; text: string }
  | { kind: "agent"; text: React.ReactNode }
  | { kind: "call"; tool: string; args: string; result: string; ok?: boolean }
  | { kind: "gap"; text: string };

const TRANSCRIPT: Line[] = [
  { kind: "human", text: "Get six Instagram captions written for the Holiday Blend launch. $240, by Friday. Only pay if they’re on-brand." },
  { kind: "call", tool: "create_pact", args: `{ role: "client", budget: 240, description: "6 captions…" }`, result: "pact_7Qx2 · 4 criteria · clarity 88/100" },
  { kind: "call", tool: "create_funding_order", args: `{ milestone_id: "ms_k91" }`, result: "approval_url → sandbox.paypal.com/checkoutnow?token=…" },
  {
    kind: "agent",
    text: (
      <>
        Approve <b className="font-medium text-paper">$240 + fees</b> in PayPal and I’ll send the brief to Ana. The money stays in escrow until the captions pass.
      </>
    ),
  },
  { kind: "gap", text: "Maya approves in PayPal · Ana delivers two days later" },
  { kind: "call", tool: "get_verdict", args: `{ milestone_id: "ms_k91" }`, result: "PASS · 96/100 · 4 of 4 met · 60–120 words each, 5 hashtags each", ok: true },
  { kind: "call", tool: "approve_milestone", args: `{ milestone_id: "ms_k91" }`, result: "Payout sent · $240.00 → Ana", ok: true },
  { kind: "agent", text: "Done. All six captions passed review and Ana has been paid. They’re attached below." },
];

function TranscriptLine({ line }: { line: Line }) {
  if (line.kind === "human")
    return (
      <div className="flex justify-end gap-2.5">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-paper px-3.5 py-2.5 text-[13px] leading-snug text-ink">{line.text}</p>
        <span className="mt-auto flex size-6 shrink-0 items-center justify-center rounded-full bg-ember-600 text-white">
          <UserRound className="size-3.5" aria-hidden />
          <span className="sr-only">Maya</span>
        </span>
      </div>
    );
  if (line.kind === "agent")
    return (
      <div className="flex gap-2.5">
        <span className="mt-auto flex size-6 shrink-0 items-center justify-center rounded-full bg-jade-600 text-white">
          <Bot className="size-3.5" aria-hidden />
          <span className="sr-only">Agent</span>
        </span>
        <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-paper/10 px-3.5 py-2.5 text-[13px] leading-snug text-paper/85">{line.text}</p>
      </div>
    );
  if (line.kind === "gap")
    return (
      <div className="flex items-center gap-3 py-1 text-[11px] text-paper/50">
        <span className="h-px flex-1 border-t border-dashed border-paper/15" />
        {line.text}
        <span className="h-px flex-1 border-t border-dashed border-paper/15" />
      </div>
    );
  return (
    <div className="ml-8 rounded-xl border border-paper/10 bg-black/25 px-3 py-2 font-mono text-[11.5px] leading-relaxed">
      <div className="flex min-w-0 gap-2">
        <span className="shrink-0 text-jade-300">kept.{line.tool}</span>
        <span className="min-w-0 truncate text-paper/45">{line.args}</span>
      </div>
      <div className={cn("mt-0.5 flex gap-1.5", line.ok ? "text-jade-300" : "text-paper/75")}>
        {line.ok ? <Check className="mt-[3px] size-3 shrink-0" aria-hidden /> : <CornerDownRight className="mt-[3px] size-3 shrink-0 text-paper/40" aria-hidden />}
        <span className="min-w-0 break-words">{line.result}</span>
      </div>
    </div>
  );
}

export function Agents({ appUrl }: { appUrl: string }) {
  return (
    <section id="agents" aria-labelledby="agents-title" className="relative scroll-mt-16 overflow-hidden bg-ink py-16 text-paper sm:py-20">
      <div aria-hidden className="grain absolute inset-0 opacity-[0.15]" />
      <div aria-hidden className="absolute -left-40 top-20 size-[520px] rounded-full bg-jade-600/20 blur-3xl" />
      <div aria-hidden className="absolute -right-40 bottom-0 size-[420px] rounded-full bg-ember-600/15 blur-3xl" />
      <Container className="relative">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] lg:gap-16">
          <div className="min-w-0">
            <SectionHeading
              id="agents-title"
              index="05"
              eyebrow="Built for agents"
              light
              title={
                <>
                  Your agent can hire a person. <span className="italic text-jade-300">Safely.</span>
                </>
              }
              lede="Kept is an MCP server and a REST API. Any agent can turn a request into a pact, hand its human a PayPal approval link, and release payment only when the work passes review. The person on the other side can be a freelancer, or another agent."
            />

            <McpConnect fallbackUrl={appUrl} />

            <div className="mt-8">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/55">{TOOLS.length} tools</div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {TOOLS.map((t) => (
                  <li key={t} className="rounded-md border border-paper/10 bg-paper/[0.04] px-2 py-1 font-mono text-[11.5px] text-paper/80">
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-6 max-w-lg text-[13.5px] leading-relaxed text-paper/60">
                The agent never holds the purse. Funding always goes through a PayPal approval link that a human clicks, and a tool only reports money as moved
                once PayPal has confirmed it.
              </p>
            </div>
          </div>

          <div className="min-w-0">
            <div className="rounded-3xl border border-paper/10 bg-paper/[0.04] p-2 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-paper/60">
                <span className="flex size-5 items-center justify-center rounded-md bg-jade-600">
                  <Bot className="size-3 text-white" aria-hidden />
                </span>
                Maya’s assistant · connected to <span className="font-mono text-paper/80">kept</span>
              </div>
              <div className="space-y-3 rounded-2xl bg-ink/80 p-4 sm:p-5">
                {TRANSCRIPT.map((l, i) => (
                  <TranscriptLine key={i} line={l} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
