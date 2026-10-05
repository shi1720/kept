import { ArrowDownToLine, Bot, Eye, FileCheck2, Gavel, KeyRound, Lock, Snowflake, Sparkles, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { DeveloperConsole } from "@/components/developers/developer-console";
import { MCP_TOOLS, REST_GROUPS, type MoneyEffect, type RestEndpoint } from "@/components/developers/reference";
import { AgentTranscript } from "@/components/developers/transcript";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Agents & API" };

const MONEY: Record<MoneyEffect, { label: string; tone: "neutral" | "sky" | "amber" | "ember" | "jade"; icon: React.ElementType }> = {
  read: { label: "Read-only", tone: "sky", icon: Eye },
  none: { label: "No", tone: "neutral", icon: FileCheck2 },
  prepares: { label: "Prepares", tone: "amber", icon: Wallet },
  freezes: { label: "Freezes", tone: "ember", icon: Snowflake },
  moves: { label: "Yes", tone: "jade", icon: ArrowDownToLine },
};

const METHOD_TONE: Record<RestEndpoint["method"], string> = {
  GET: "bg-sky-50 text-sky-600 border-sky-100",
  POST: "bg-jade-50 text-jade-700 border-jade-100",
  PATCH: "bg-amber-50 text-amber-700 border-amber-100",
  DELETE: "bg-rose-50 text-rose-700 border-rose-100",
};

const FLOW = [
  { icon: Bot, title: "Your agent drafts the deal", body: "create_pact turns a brief into milestones with machine-checkable criteria." },
  { icon: Lock, title: "A human funds escrow in PayPal", body: "The agent gets an approval link; nothing is charged until a person approves." },
  { icon: Sparkles, title: "The AI referee checks the work", body: "Deliverables are probed for evidence and judged criterion by criterion." },
  { icon: Gavel, title: "Money moves on evidence", body: "Release via PayPal Payouts, or mediation and a human arbitrator if it's contested." },
];

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-1">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">{eyebrow}</p>
      <h2 className="text-[20px] font-semibold tracking-tight">{title}</h2>
      {children && <p className="max-w-3xl text-[13.5px] leading-relaxed text-ink-3">{children}</p>}
    </div>
  );
}

export default async function DevelopersPage() {
  await requireUser();
  const appUrl = env.appUrl;

  return (
    <div className="flex flex-col gap-12 animate-fade-up">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-card shadow-card">
        <div className="grain absolute inset-0 opacity-40" />
        <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.25fr_1fr]">
          <div className="flex flex-col justify-center">
            <Badge tone="sky" className="w-fit">
              <Bot /> Agents & API
            </Badge>
            <h1 className="display mt-4 text-[40px] sm:text-[52px]">Let your AI agents hire with escrow protection.</h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-2">
              Kept speaks MCP and REST. Your agent can draft a contract, invite a person, ask a human to fund it through PayPal, and pay out only when an AI referee has
              checked the work against the criteria everyone signed.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-[12.5px]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-ink-2">
                <Lock className="size-3.5 text-amber-600" /> Agents never hold the purse strings
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-ink-2">
                <KeyRound className="size-3.5 text-jade-600" /> One Bearer key for MCP and REST
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 font-mono text-ink-2">POST /api/mcp</span>
            </div>
          </div>
          <ol className="relative flex flex-col gap-4 rounded-2xl border border-line bg-paper/70 p-5">
            {FLOW.map((s, i) => (
              <li key={s.title} className="relative flex gap-3">
                {i < FLOW.length - 1 && <span className="absolute left-[15px] top-9 h-[calc(100%-12px)] w-px bg-line-2" />}
                <span className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-full border", i === 1 ? "border-amber-100 bg-amber-50 text-amber-700" : "border-line bg-card text-ink-2")}>
                  <s.icon className="size-4" />
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold">{s.title}</p>
                  <p className="text-[12.5px] leading-relaxed text-ink-3">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Keys + setup */}
      <section>
        <SectionHeading eyebrow="Step 1 · 2" title="Create a key, connect your agent">
          Works with Claude Code, Claude Desktop and any MCP client that supports Streamable HTTP. Prefer plain HTTP? Every endpoint below accepts the same key.
        </SectionHeading>
        <DeveloperConsole appUrl={appUrl} />
      </section>

      {/* Transcript */}
      <section>
        <SectionHeading eyebrow="Example" title="An agent hires a human">
          A real flow through Kept’s MCP tools. The agent does the paperwork; the money only moves at the two gates a human or the evidence controls.
        </SectionHeading>
        <Card className="p-5 sm:p-6">
          <AgentTranscript />
        </Card>
      </section>

      {/* MCP tools */}
      <section>
        <SectionHeading eyebrow="Reference" title="MCP tools">
          Exposed by <code className="rounded bg-paper-2 px-1 font-mono text-[12px] text-ink-2">kept-escrow</code> v1.0. Tools act with the permissions of the key’s owner — an agent can only
          do what you could do in the app.
        </SectionHeading>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="border-b border-line bg-paper text-[12px] text-ink-2">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Tool</th>
                  <th className="px-5 py-2.5 font-semibold">What it does</th>
                  <th className="px-5 py-2.5 font-semibold">Moves money?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {MCP_TOOLS.map((t) => {
                  const m = MONEY[t.money];
                  return (
                    <tr key={t.name} className="align-top hover:bg-paper/60">
                      <td className="whitespace-nowrap px-5 py-3">
                        <code className="font-mono text-[12.5px] font-semibold text-ink">{t.name}</code>
                        <div className="mt-0.5 text-[12px] text-ink-3">{t.title}</div>
                      </td>
                      <td className="px-5 py-3 leading-relaxed text-ink-2">{t.does}</td>
                      <td className="px-5 py-3">
                        <Badge tone={m.tone}>
                          <m.icon /> {m.label}
                        </Badge>
                        {t.moneyNote && <div className="mt-1 max-w-[220px] text-[11.5px] leading-snug text-ink-3">{t.moneyNote}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* REST */}
      <section>
        <SectionHeading eyebrow="Reference" title="REST API">
          JSON in, JSON out, at <code className="rounded bg-paper-2 px-1 font-mono text-[12px] text-ink-2">{appUrl}</code>. Authenticate with{" "}
          <code className="rounded bg-paper-2 px-1 font-mono text-[12px] text-ink-2">Authorization: Bearer kept_sk_…</code> — keys resolve to your account on every endpoint. Errors come back as{" "}
          <code className="rounded bg-paper-2 px-1 font-mono text-[12px] text-ink-2">{"{ error: { code, message } }"}</code> with a matching HTTP status.{" "}
          The full spec is at{" "}
          <a href="/openapi.yaml" className="font-medium text-jade-700 underline underline-offset-2">/openapi.yaml</a> (OpenAPI 3.1): import it into
          Postman, or generate a typed SDK from it with APIMatic.
        </SectionHeading>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead className="border-b border-line bg-paper text-[12px] text-ink-2">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Endpoint</th>
                  <th className="px-5 py-2.5 font-semibold">Who can call</th>
                  <th className="px-5 py-2.5 font-semibold">What it does</th>
                </tr>
              </thead>
              {REST_GROUPS.map((g) => (
                <tbody key={g.title} className="divide-y divide-line border-b border-line last:border-0">
                  <tr className="bg-paper/50">
                    <td colSpan={3} className="px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                      {g.title}
                    </td>
                  </tr>
                  {g.endpoints.map((e) => (
                    <tr key={`${e.method} ${e.path}`} className="align-top hover:bg-paper/60">
                      <td className="whitespace-nowrap px-5 py-2.5">
                        <span className={cn("mr-2 inline-block w-[54px] rounded-md border py-0.5 text-center font-mono text-[10.5px] font-bold", METHOD_TONE[e.method])}>{e.method}</span>
                        <code className="font-mono text-[12.5px] text-ink">{e.path}</code>
                      </td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-ink-2">{e.who}</td>
                      <td className="px-5 py-2.5 leading-relaxed text-ink-2">
                        {e.does}
                        {e.body && <code className="mt-1 block font-mono text-[11.5px] text-ink-3">{e.body}</code>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
