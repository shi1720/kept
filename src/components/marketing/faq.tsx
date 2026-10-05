import { Plus } from "lucide-react";
import { Container, SectionHeading } from "./section";

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Is my money safe?",
    a: (
      <>
        Clients pay through PayPal Checkout, and the captured funds are held in escrow for that milestone. Every movement is booked in a double-entry ledger,
        every PayPal call carries an idempotency key, and each milestone moves through a compare-and-set state machine, so a retry, a double click or a
        replayed webhook can’t release money twice. Funds leave escrow only when the client approves, when both sides accept a settlement, or when a
        client stays silent past the review window and the work passed its criteria.
      </>
    ),
  },
  {
    q: "What if the AI is wrong?",
    a: (
      <>
        The AI proposes; people decide. The referee’s verdict is advice to the client, and every finding cites the evidence it relied on, so you can check its
        work. A mediation split only executes if both of you accept it. If either side rejects it, the dispute escalates to a human arbitrator. And if a
        deliverable tries to manipulate the referee, auto-release is switched off for that milestone.
      </>
    ),
  },
  {
    q: "How is this legal and compliant?",
    a: (
      <>
        This test release runs on the PayPal sandbox and holds funds on the platform’s own PayPal account. For production, the path is PayPal’s
        multiparty delayed-disbursement program for platforms, where PayPal holds the funds until release and Kept never touches them. Kept stays the
        referee, not the bank.
      </>
    ),
  },
  {
    q: "Who can see my pact and my work?",
    a: (
      <>
        Only the two parties to the pact, plus a human arbitrator if a dispute is escalated. Deliverables are sent to the AI model only to produce a verdict
        or a mediation proposal. Links are fetched by a sandboxed, SSRF-safe fetcher that refuses private networks. Agent API keys are stored as hashes,
        never in plain text.
      </>
    ),
  },
  {
    q: "Do both sides need a PayPal account?",
    a: (
      <>
        Clients don’t: they can pay as a guest with a debit or credit card, or use PayPal or Pay Later. Freelancers are paid through PayPal Payouts, and can
        connect a verified account with Log in with PayPal.
      </>
    ),
  },
  {
    q: "What kinds of work can the referee check?",
    a: (
      <>
        Anything you can deliver as text, files, images, a live URL or a GitHub repo: copy, design, documents, landing pages and code. Kept measures
        what can be measured (word counts, live links, required text, file types, image resolution, tests in a repo) and the referee judges the rest
        against the criteria you signed, marking subjective ones as such.
      </>
    ),
  },
];

export function Faq() {
  return (
    <section aria-labelledby="faq-title" className="border-t border-line bg-paper-2/50 py-16 sm:py-20">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-16">
        <SectionHeading
          className="lg:sticky lg:top-28 lg:self-start"
          id="faq-title"
          index="09"
          eyebrow="Questions"
          title={
            <>
              The fine print, <span className="italic text-jade-600">in large print.</span>
            </>
          }
        />
        <div className="divide-y divide-line border-y border-line">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-medium tracking-tight text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line-2 bg-card text-ink-2 transition-transform duration-200 group-open:rotate-45">
                  <Plus className="size-4" aria-hidden />
                </span>
              </summary>
              <div className="max-w-2xl pb-6 text-[15px] sm:pr-12 leading-relaxed text-ink-2">{f.a}</div>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
