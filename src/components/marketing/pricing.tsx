import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Cite, Container, SectionHeading } from "./section";

const INCLUDED = [
  "AI contract compiler with clarity and scam checks",
  "Evidence engine and per-criterion referee verdicts",
  "AI dispute mediation, with human escalation",
  "Anti-ghosting auto-release for passing work",
  "Guest card checkout for clients",
  "MCP server and REST API for agents",
];

const BARS = [
  { name: "Kept", fee: 14.5, note: "2.9% protection fee", kept: true },
  { name: "Escrow.com", fee: 50, note: "$50 minimum on small deals" },
  { name: "Upwork", fee: 100, note: "≈20% blended take rate", approx: true },
  { name: "Fiverr", fee: 127.5, note: "20% seller + 5.5% buyer" },
];

export function Pricing() {
  const max = 127.5;
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-16 py-16 sm:py-20">
      <Container>
        <SectionHeading
          split
          id="pricing-title"
          index="08"
          eyebrow="Pricing"
          title={
            <>
              Freelancers keep <span className="italic text-jade-600">every dollar.</span>
            </>
          }
          lede="The client pays a small protection fee on top of each milestone they fund. No subscriptions, no seat fees, and AI dispute mediation is included."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative flex flex-col overflow-hidden rounded-3xl border border-line bg-card p-7 shadow-lift sm:p-9">
            <div aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-jade-50 blur-2xl" />
            <div className="relative pb-10">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2/80">Per funded milestone</div>
              <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-4">
                <div>
                  <div className="display num text-[84px] leading-[0.85] text-ink">0%</div>
                  <div className="mt-2 text-[13px] text-ink-2">from the freelancer</div>
                </div>
                <div>
                  <div className="display num text-[84px] leading-[0.85] text-jade-600">2.9%</div>
                  <div className="mt-2 text-[13px] text-ink-2">from the client, min $1</div>
                </div>
              </div>
              <p className="mt-6 text-[14px] leading-relaxed text-ink-2">
                Plus PayPal’s processing fee, passed through at cost. Kept grosses up the order so escrow always holds exactly the milestone amount.
              </p>
              <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
                {INCLUDED.map((i) => (
                  <li key={i} className="flex gap-2 text-[13.5px] leading-snug text-ink">
                    <Check className="mt-0.5 size-4 shrink-0 text-jade-600" aria-hidden /> {i}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="group inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-paper transition-colors hover:bg-ink/90"
                >
                  Start a pact <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <span className="text-[13px] text-ink-2/80">Free to sign up. You only pay when a milestone is funded.</span>
              </div>
            </div>
            <dl className="relative mt-auto grid grid-cols-3 gap-4 border-t border-line pt-6">
              {[
                ["$0", "to raise a dispute"],
                ["$0", "monthly or per seat"],
                ["$1", "minimum fee per milestone"],
              ].map(([k, v]) => (
                <div key={v}>
                  <dt className="display num text-[34px] leading-none">{k}</dt>
                  <dd className="mt-1.5 text-[12px] leading-snug text-ink-2">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-3xl border border-line bg-card p-7 shadow-card sm:p-8">
              <h3 className="text-[15px] font-semibold">A $500 milestone, end to end</h3>
              <dl className="mt-4 space-y-2 text-[14px]">
                {[
                  ["Milestone, held in escrow", "$500.00"],
                  ["Kept protection fee (2.9%)", "$14.50"],
                  ["PayPal processing, at cost", "$19.12"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-ink-2">{k}</dt>
                    <dd className="num">{v}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-line pt-2.5 font-semibold">
                  <dt>Client pays</dt>
                  <dd className="num">$533.62</dd>
                </div>
                <div className="flex justify-between gap-4 rounded-xl bg-jade-50 px-3 py-2 font-semibold text-jade-700">
                  <dt>Freelancer receives</dt>
                  <dd className="num">$500.00</dd>
                </div>
              </dl>
              <p className="mt-3">
                <Cite>Processing estimated at PayPal’s US standard checkout rate (3.49% + $0.49); the actual fee is read from the capture.</Cite>
              </p>
            </div>

            <div className="rounded-3xl border border-line bg-card p-7 shadow-card sm:p-8">
              <h3 className="text-[15px] font-semibold">Platform fees on the same $500 milestone</h3>
              <ul className="mt-5 space-y-3.5">
                {BARS.map((b) => (
                  <li key={b.name}>
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className={b.kept ? "font-semibold text-jade-700" : "font-medium text-ink"}>
                        {b.name} <span className="font-normal text-ink-2/80">· {b.note}</span>
                      </span>
                      <span className={"num shrink-0 font-semibold " + (b.kept ? "text-jade-700" : "text-ink")}>
                        {b.approx ? "≈" : ""}${b.fee.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-2">
                      <div
                        className={"kp-grow h-full rounded-full " + (b.kept ? "bg-jade-600" : "bg-ink/25")}
                        style={{ width: `${Math.max(4, (b.fee / max) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                <Cite>
                  Before payment processing. Escrow.com fee calculator (Oct 2026); Upwork 2025 revenue ÷ GSV (computed); Fiverr via vaultleap (2026).
                </Cite>
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
