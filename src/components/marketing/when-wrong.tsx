import { Bot, Check, Clock, Gavel, Send, Undo2, UserRound } from "lucide-react";
import { Container, SectionHeading } from "./section";

function GhostingCard() {
  const events = [
    { time: "Tue 10:14", text: "Ana submits the live landing page", tone: "ink" },
    { time: "Tue 10:15", text: "Referee: PASS, 94/100, 5 of 5 criteria met", tone: "jade" },
    { time: "Tue → Thu", text: "48-hour review window. Maya doesn’t respond.", tone: "wait" },
    { time: "Thu 10:14", text: "Auto-released: $900.00 to Ana via PayPal Payouts", tone: "pay" },
  ] as const;
  return (
    <article className="flex flex-col rounded-3xl border border-line bg-card p-6 shadow-card sm:p-8">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2/80">
        <Clock className="size-3.5 text-amber-600" aria-hidden /> The client goes quiet
      </div>
      <h3 className="display mt-4 text-[32px] leading-[1.05] sm:text-[38px]">
        Ghosting doesn’t <span className="italic">freeze</span> the money.
      </h3>
      <ol className="relative mt-8 space-y-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line-2">
        {events.map((e) => (
          <li key={e.time} className="relative flex gap-4 pl-0">
            <span
              className={
                "relative z-10 mt-1 size-[15px] shrink-0 rounded-full border-[3px] border-card " +
                (e.tone === "jade" ? "bg-jade-500" : e.tone === "pay" ? "bg-jade-700" : e.tone === "wait" ? "bg-amber-500" : "bg-ink")
              }
            />
            <div className="min-w-0">
              <div className="num font-mono text-[11px] text-ink-2/75">{e.time}</div>
              <div className={"text-[14px] leading-snug " + (e.tone === "pay" ? "font-semibold text-jade-700" : "text-ink")}>{e.text}</div>
              {e.tone === "wait" && (
                <div className="mt-2 h-1.5 w-full max-w-[260px] overflow-hidden rounded-full bg-amber-50">
                  <div className="kp-grow h-full w-full rounded-full bg-gradient-to-r from-amber-100 to-amber-500" />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-auto pt-8">
        <p className="rounded-2xl bg-paper-2 px-5 py-4 text-[14px] leading-relaxed text-ink-2">
          <b className="text-ink">Silence defaults to the evidence, not to either side.</b> Had the work failed its criteria, the milestone would have gone to
          mediation instead of releasing.
        </p>
      </div>
    </article>
  );
}

function SplitCard() {
  const steps = [
    { icon: UserRound, text: "Maya raises an issue: “Only two real concepts. The third is a recolour.”" },
    { icon: Bot, text: "The mediator reads the verdict, both statements and the pact, and proposes 65 / 35." },
    { icon: Check, text: "Maya accepts. Ana accepts. It executes on PayPal." },
  ];
  return (
    <article className="relative flex flex-col overflow-hidden rounded-3xl bg-ink p-6 text-paper sm:p-8">
      <div aria-hidden className="grain absolute inset-0 opacity-20" />
      <div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-jade-600/30 blur-3xl" />
      <div className="relative flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-paper/65">
        <Gavel className="size-3.5 text-ember-500" aria-hidden /> Someone disagrees
      </div>
      <h3 className="display relative mt-4 text-[32px] leading-[1.05] sm:text-[38px]">
        A fair split, <span className="italic text-jade-300">settled in PayPal.</span>
      </h3>

      <div className="relative mt-8">
        <div className="flex items-baseline justify-between text-[12px] text-paper/65">
          <span>Milestone 1 · Three logo concepts</span>
          <span className="num">$400.00 in escrow</span>
        </div>
        <div className="mt-3 flex h-14 overflow-hidden rounded-xl" role="img" aria-label="Split: 65 percent, $260, paid to Ana; 35 percent, $140, refunded to Maya">
          <div className="kp-grow flex items-center justify-between bg-jade-600 px-4" style={{ width: "65%" }}>
            <span className="display text-[28px] leading-none">65%</span>
            <span className="num hidden text-[13px] font-medium sm:inline">$260.00</span>
          </div>
          <div className="flex flex-1 items-center justify-between bg-ember-600 px-4">
            <span className="display text-[28px] leading-none">35%</span>
            <span className="num hidden text-[13px] font-medium sm:inline">$140.00</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-[65fr_35fr] gap-3 text-[12px] leading-snug">
          <div className="flex items-start gap-1.5 text-paper/85">
            <Send className="mt-0.5 size-3.5 shrink-0 text-jade-300" aria-hidden />
            <span>
              <span className="num font-medium text-paper sm:hidden">$260 </span>to Ana as a <b className="font-medium text-paper">PayPal Payout</b>
            </span>
          </div>
          <div className="flex items-start gap-1.5 text-paper/85">
            <Undo2 className="mt-0.5 size-3.5 shrink-0 text-ember-100" aria-hidden />
            <span>
              <span className="num font-medium text-paper sm:hidden">$140 </span>back to Maya as a <b className="font-medium text-paper">partial refund</b>
            </span>
          </div>
        </div>
      </div>

      <ol className="relative mt-8 space-y-3 border-t border-paper/10 pt-6">
        {steps.map((s) => (
          <li key={s.text} className="flex gap-3 text-[13.5px] leading-snug text-paper/80">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-paper/10">
              <s.icon className="size-3.5 text-paper" aria-hidden />
            </span>
            {s.text}
          </li>
        ))}
      </ol>
      <p className="relative mt-auto pt-8 text-[13px] leading-relaxed text-paper/60">
        The refund goes back against the original PayPal capture, so Maya sees it where she paid. If either side rejects the proposal, a human
        arbitrator takes over. The AI proposes; people decide.
      </p>
    </article>
  );
}

export function WhenWrong() {
  return (
    <section aria-labelledby="wrong-title" className="border-t border-line bg-paper-2/50 py-16 sm:py-20">
      <Container>
        <SectionHeading
          split
          id="wrong-title"
          index="04"
          eyebrow="When things go wrong"
          title={
            <>
              Disagreements happen. <span className="italic text-ember-600">Fights don’t have to.</span>
            </>
          }
          lede="Upwork’s arbitration costs $337.50 per side. Fewer than 1% of stiffed freelancers ever go to court. Kept proposes a fair settlement in minutes and saves humans for the cases that need one."
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <GhostingCard />
          <SplitCard />
        </div>
      </Container>
    </section>
  );
}
