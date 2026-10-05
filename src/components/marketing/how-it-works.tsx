import { AlertTriangle, ArrowRight, Check, CreditCard, RotateCcw, Scale, Send, Wallet } from "lucide-react";
import { Seal } from "@/components/brand/seal";
import { cn } from "@/lib/cn";
import { Container, SectionHeading } from "./section";

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl border border-line bg-card p-5 shadow-card", className)}>{children}</div>;
}

function CompileVisual() {
  return (
    <Panel>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-ink-2">Brief clarity</span>
        <span className="num font-semibold">
          <span className="text-amber-600">41</span> <span className="text-ink-3">→</span> <span className="text-jade-600">92</span>
        </span>
      </div>
      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2">
        <div className="absolute inset-y-0 left-0 w-[41%] rounded-full bg-amber-500/50" />
        <div className="kp-grow absolute inset-y-0 left-0 w-[92%] rounded-full bg-jade-500" />
      </div>
      <ul className="mt-4 space-y-2.5 text-[12.5px]">
        {[
          ["“mobile friendly”", "Viewport meta tag and a single column under 600px"],
          ["“a few revisions”", "2 revision rounds, then change requests are new work"],
        ].map(([vague, fixed]) => (
          <li key={vague} className="grid grid-cols-[auto_1fr] items-start gap-x-2 gap-y-1">
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700 line-through decoration-amber-500/60">{vague}</span>
            <span className="flex items-start gap-1.5 text-ink-2">
              <ArrowRight className="mt-0.5 size-3 shrink-0 text-jade-600" aria-hidden /> {fixed}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-[12px] leading-snug text-rose-700">
        <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
        <span>
          <b className="font-semibold">Scam signal:</b> asks to be paid via Friends &amp; Family. That payment has no protection.
        </span>
      </div>
    </Panel>
  );
}

function SealVisual() {
  return (
    <Panel className="relative overflow-hidden">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Terms, locked on signing</div>
      <ul className="mt-3 space-y-1.5 text-[12.5px] text-ink-2">
        <li className="flex gap-2"><Check className="mt-0.5 size-3.5 text-jade-600" aria-hidden /> 1 milestone · $900.00 · due in 5 days</li>
        <li className="flex gap-2"><Check className="mt-0.5 size-3.5 text-jade-600" aria-hidden /> 1 revision round · 48h review window</li>
        <li className="flex gap-2"><Check className="mt-0.5 size-3.5 text-jade-600" aria-hidden /> Lantern owns the page once paid</li>
      </ul>
      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-dashed border-line-2 pt-4 pr-20">
        <div>
          <div className="display text-[20px] italic leading-none">Maya Chen</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-ink-3">Signed</div>
        </div>
        <div>
          <div className="display text-[20px] italic leading-none">Ana Reyes</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-ink-3">Signed</div>
        </div>
      </div>
      <Seal size={84} label="SEALED" className="absolute -bottom-3 right-3 rotate-[-12deg]" />
    </Panel>
  );
}

function FundVisual() {
  const rows: [string, string][] = [
    ["Milestone, held in escrow", "$900.00"],
    ["Kept protection fee · 2.9%", "$26.10"],
    ["PayPal processing, at cost", "$34.00"],
  ];
  return (
    <Panel>
      <dl className="space-y-1.5 text-[12.5px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-ink-2">{k}</dt>
            <dd className="num text-ink">{v}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-line pt-2 font-semibold">
          <dt>Maya pays</dt>
          <dd className="num">$960.10</dd>
        </div>
      </dl>
      <div className="mt-4 grid gap-2">
        <div className="flex h-9 items-center justify-center gap-2 rounded-full bg-ink text-[12.5px] font-medium text-paper">
          <Wallet className="size-3.5" aria-hidden /> Pay with PayPal
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex h-9 items-center justify-center rounded-full border border-line-2 text-[12.5px] font-medium text-ink-2">Pay Later</div>
          <div className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-line-2 text-[12.5px] font-medium text-ink-2">
            <CreditCard className="size-3.5" aria-hidden /> Card, as guest
          </div>
        </div>
      </div>
    </Panel>
  );
}

function EvidenceVisual() {
  const probes: [string, string][] = [
    ["url_reachable", "holiday.lanterncoffee.co → 200"],
    ["page_contains", "“Holiday Blend”, “$” found"],
    ["page_contains", "“Pre-order” found in hero"],
    ["min_words", "212 ≥ 150 words"],
    ["injection_scan", "0 findings"],
  ];
  return (
    <Panel className="bg-ink p-0 text-paper">
      <div className="flex items-center gap-1.5 border-b border-paper/10 px-4 py-2.5">
        <span className="size-2 rounded-full bg-paper/20" />
        <span className="size-2 rounded-full bg-paper/20" />
        <span className="size-2 rounded-full bg-paper/20" />
        <span className="ml-2 font-mono text-[10.5px] text-paper/50">evidence pack · live URL</span>
      </div>
      <ul className="space-y-1.5 px-4 py-3.5 font-mono text-[11.5px] leading-relaxed">
        {probes.map(([probe, detail], i) => (
          <li key={i} className="flex gap-2">
            <span className="text-jade-300">✓</span>
            <span className="w-[7.5rem] shrink-0 text-paper/55">{probe}</span>
            <span className="min-w-0 truncate text-paper/90">{detail}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function OutcomeVisual() {
  const outcomes = [
    { icon: Send, title: "Approve", detail: "PayPal Payout · 100% to Ana", cls: "border-jade-100 bg-jade-50 text-jade-700" },
    { icon: RotateCcw, title: "Request a revision", detail: "1 of 1 included rounds", cls: "border-line bg-paper text-ink-2" },
    { icon: Scale, title: "Raise an issue", detail: "AI mediator proposes a split", cls: "border-ember-100 bg-ember-50 text-ember-700" },
  ];
  return (
    <Panel className="space-y-2">
      {outcomes.map((o) => (
        <div key={o.title} className={cn("flex items-center gap-3 rounded-xl border px-3.5 py-2.5", o.cls)}>
          <o.icon className="size-4 shrink-0" aria-hidden />
          <span className="text-[13px] font-medium">{o.title}</span>
          <span className="ml-auto text-right text-[11.5px] opacity-80">{o.detail}</span>
        </div>
      ))}
    </Panel>
  );
}

const STEPS = [
  {
    title: "Paste the DM. Get a contract.",
    body: "Drop in the chat, the email or a two-line description. Kept’s contract compiler turns it into a pact: milestones, amounts, deadlines, and acceptance criteria a machine can check. It scores how clear the brief was, rewrites the vague bits, and flags scam patterns like overpayment, gift cards and Friends & Family.",
    visual: <CompileVisual />,
  },
  {
    title: "Both sides sign. The wax sets.",
    body: "Client and freelancer review the same criteria, revisions, review window and IP terms, then sign. From here on, “done” means what you both agreed, not what anyone remembers.",
    visual: <SealVisual />,
  },
  {
    title: "Fund each milestone with PayPal.",
    body: "The client pays with PayPal Checkout: their PayPal account, Pay Later, or a debit or credit card without an account. The money is captured into escrow, visible to both sides, and booked in a double-entry ledger.",
    visual: <FundVisual />,
  },
  {
    title: "Deliver. The evidence engine checks it.",
    body: "Send text, files, images, a live URL or a GitHub repo. Code measures first: word counts, whether links load, whether the page says what it must, whether the repo has tests, image resolution, PDF and DOCX text. Then the AI referee judges each criterion and cites its evidence.",
    visual: <EvidenceVisual />,
  },
  {
    title: "Release, revise, or resolve.",
    body: "The client approves and PayPal Payouts sends the freelancer 100% of the milestone. Or they request a revision, or raise an issue and the AI mediator proposes a fair split. If the client goes silent, the evidence decides: passing work auto-releases, failing work goes to mediation.",
    visual: <OutcomeVisual />,
  },
];

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-16 border-t border-line bg-paper-2/50 py-16 sm:py-20">
      <Container>
        <SectionHeading
          split
          id="how-title"
          index="02"
          eyebrow="How it works"
          title={
            <>
              From “sounds good” to <span className="italic text-jade-600">paid in full</span>, in five steps.
            </>
          }
          lede="Kept sits between the handshake and the payment. Each step is something both people can see, and nothing moves money unless the pact says it should."
        />
        <ol className="mt-10">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-3 gap-y-7 border-t border-line py-7 last:pb-0 md:grid-cols-[72px_minmax(0,1fr)] md:gap-x-6 lg:grid-cols-[72px_minmax(0,1fr)_minmax(0,400px)] lg:gap-10 lg:py-8">
              <div className="display num text-[34px] leading-none text-jade-600 md:text-[56px]" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="max-w-xl">
                <h3 className="text-[22px] font-semibold leading-snug tracking-tight sm:text-[24px]">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </h3>
                <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">{s.body}</p>
              </div>
              <div className="col-span-2 min-w-0 md:col-start-2 md:col-span-1 md:max-w-[460px] lg:col-start-auto lg:max-w-none">{s.visual}</div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
