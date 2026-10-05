import { Bot, Lock, UserRound, Wrench } from "lucide-react";
import { cn } from "@/lib/cn";

type Turn =
  | { kind: "human"; text: string }
  | { kind: "agent"; text: string }
  | { kind: "tool"; name: string; args: string; result: string; gate?: string };

/** A representative session: Claude hires a freelancer through Kept's MCP tools. */
const TURNS: Turn[] = [
  { kind: "human", text: "Find someone to write six Instagram captions for our Holiday Blend launch. Budget $240, due Friday. Only pay if they’re actually good." },
  {
    kind: "tool",
    name: "create_pact",
    args: '{ role: "client", budget: 240, description: "Six Instagram captions for the Holiday Blend launch…" }',
    result: "Drafted pact pct_9x2k…: “Instagram launch captions (6 posts)” — clarity of the brief 64/100.\n1. Six captions — $240\n   • Exactly 6 captions [auto-check: min_words]\n   • Each caption 40–80 words with 3 hashtags [auto-check: keywords_present]\n   • Tone matches the Lantern brand voice",
  },
  { kind: "tool", name: "send_pact", args: '{ pact_id: "pct_9x2k…" }', result: "Signed and sent. Share this link with the other party to countersign: …/invite/Qm7…" },
  { kind: "agent", text: "I turned the brief into a pact with checkable criteria and sent it to Ana. She countersigned. To lock the money in escrow I need you to approve the PayPal payment:" },
  {
    kind: "tool",
    name: "create_funding_order",
    args: '{ milestone_id: "mil_4hq…" }',
    result: "PayPal order 5O190127TN364715T created for $256.40 (milestone $240.00 + Kept fee $6.96 + processing $9.44).\nAsk the payer to approve it here: https://www.sandbox.paypal.com/checkoutnow?token=5O19…",
    gate: "A human approves in PayPal — the agent can’t",
  },
  { kind: "human", text: "Approved in PayPal." },
  { kind: "tool", name: "confirm_funding", args: '{ order_id: "5O190127TN364715T" }', result: "Funded. $240.00 is held in escrow for “Six captions”." },
  { kind: "agent", text: "Ana delivered on Thursday. The referee checked every caption against the criteria:" },
  {
    kind: "tool",
    name: "get_verdict",
    args: '{ milestone_id: "mil_4hq…" }',
    result: "PASS 94/100 — All six captions are on-brand and within length.\n• [met] Exactly 6 captions — 6 found in deliverable.md\n• [met] 40–80 words with 3 hashtags — every caption 46–71 words, 3 hashtags each\n• [met] Tone matches the brand voice — warm, playful, references the roast",
  },
  { kind: "tool", name: "approve_milestone", args: '{ milestone_id: "mil_4hq…" }', result: "Approved. The escrowed amount is being paid out to the freelancer via PayPal.", gate: "Releases escrow via PayPal Payouts" },
  { kind: "agent", text: "Done. Ana was paid $240 through PayPal Payouts, every criterion was backed by evidence, and the pact is on both of your track records." },
];

export function AgentTranscript() {
  return (
    <div className="flex flex-col gap-3">
      {TURNS.map((t, i) => {
        if (t.kind === "tool") {
          return (
            <div key={i} className="ml-10 overflow-hidden rounded-xl border border-line bg-paper/70">
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-3.5 py-2">
                <Wrench className="size-3.5 text-ink-3" />
                <code className="font-mono text-[12px] font-semibold text-ink">kept.{t.name}</code>
                <code className="min-w-0 truncate font-mono text-[11.5px] text-ink-3">{t.args}</code>
                {t.gate && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    <Lock className="size-3" /> {t.gate}
                  </span>
                )}
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap px-3.5 py-2.5 font-mono text-[11.5px] leading-relaxed text-ink-2">{t.result}</pre>
            </div>
          );
        }
        const human = t.kind === "human";
        return (
          <div key={i} className={cn("flex items-start gap-3", human && "flex-row-reverse")}>
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", human ? "bg-ink text-paper" : "bg-jade-600 text-white")}>
              {human ? <UserRound className="size-3.5" /> : <Bot className="size-3.5" />}
            </span>
            <p
              className={cn(
                "max-w-[78%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed",
                human ? "rounded-tr-md bg-ink text-paper" : "rounded-tl-md border border-line bg-card text-ink shadow-card",
              )}
            >
              {t.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
