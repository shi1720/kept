import { Quote } from "lucide-react";
import { Cite, Container, SectionHeading } from "./section";

const SOURCES = {
  fu: "https://blog.freelancersunion.org/2015/12/10/costs-nonpayment/",
  remote: "https://remote.com/blog/contractor-management/reversing-late-payment-culture",
  ag: "https://authorsguild.org/news/survey-finds-62-percent-of-ny-freelance-workers-have-lost-wages-due-to-nonpayment/",
  mbo: "https://www.prnewswire.com/news-releases/mbo-partners-by-beeline-releases-15th-annual-state-of-independence-study-revealing-a-growing-talent-strategy-for-businesses-302550604.html",
  upwork: "https://investors.upwork.com/news-releases/news-release-details/upwork-study-finds-64-million-americans-freelanced-2023-adding",
  paypal: "https://www.paypal.com/us/legalhub/paypal/buyer-protection",
};

function Stat({ value, children, cite, href, className }: { value: string; children: React.ReactNode; cite: string; href: string; className?: string }) {
  return (
    <div className={"flex flex-col justify-between gap-6 rounded-2xl border border-line bg-card p-6 shadow-card " + (className ?? "")}>
      <div>
        <div className="display num text-[56px] leading-none text-ink sm:text-[64px]">{value}</div>
        <p className="mt-3 text-[15px] leading-snug text-ink-2">{children}</p>
      </div>
      <Cite href={href}>{cite}</Cite>
    </div>
  );
}

export function Problem() {
  return (
    <section aria-labelledby="problem-title" className="py-16 sm:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end">
          <SectionHeading
            id="problem-title"
            index="01"
            eyebrow="The problem"
            title={
              <>
                Most freelance deals start in a DM. <span className="italic text-ember-600">None of them are protected.</span>
              </>
            }
          />
          <p className="text-[16.5px] leading-relaxed text-ink-2 lg:pb-2">
            Work gets agreed in Instagram DMs, email threads, Discord and LinkedIn, then paid by invoice, bank transfer or Friends &amp; Family.
            There is no escrow, no shared definition of “done”, and no referee. When it goes wrong, someone just eats the loss.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-6">
          <div className="relative flex flex-col justify-between gap-8 overflow-hidden rounded-2xl bg-ink p-7 text-paper md:col-span-3 md:row-span-2 sm:p-9">
            <div aria-hidden className="grain absolute inset-0 opacity-20" />
            <div aria-hidden className="absolute -right-20 -top-20 size-72 rounded-full bg-ember-600/25 blur-3xl" />
            <div className="relative">
              <div className="display num text-[96px] leading-[0.85] sm:text-[140px]">71%</div>
              <p className="mt-5 max-w-sm text-[18px] leading-snug text-paper/85">
                of US freelancers have had trouble collecting payment. The average loss: <span className="num font-semibold text-paper">$5,968</span>, about 14% of a
                year’s income.
              </p>
            </div>
            <div className="relative flex flex-col gap-4 border-t border-paper/15 pt-5">
              <p className="text-[13.5px] leading-relaxed text-paper/70">34% of those affected were never paid at all. The longest wait averaged 98 days.</p>
              <Cite href={SOURCES.fu} light>
                Freelancers Union, The Costs of Nonpayment, 2015 (n=5,358)
              </Cite>
            </div>
          </div>
          <Stat value="85%" cite="Remote, Contractor Management Report, 2025" href={SOURCES.remote} className="md:col-span-3 lg:col-span-3">
            of freelancers have invoices paid late at least some of the time. One in five are paid late, or never, more than half the time.
          </Stat>
          <Stat value="62%" cite="Authors Guild & Freelancers Union survey, 2022" href={SOURCES.ag} className="md:col-span-3">
            of New York freelancers have been stiffed at least once. <span className="font-medium text-ink">Fewer than 1%</span> took it to court.
          </Stat>
          <Stat value="58%" cite="MBO Partners, State of Independence, 2025 (computed from 42%)" href={SOURCES.mbo} className="md:col-span-2">
            of US independents don’t rely mainly on platforms to find work. Their deals happen off-marketplace.
          </Stat>
          <Stat value="64M" cite="Upwork, Freelance Forward, 2023" href={SOURCES.upwork} className="md:col-span-2">
            Americans freelanced in 2023, earning <span className="num font-medium text-ink">$1.27T</span>.
          </Stat>
          <figure className="flex flex-col justify-between gap-5 rounded-2xl border border-dashed border-ember-100 bg-ember-50/60 p-6 md:col-span-2">
            <Quote className="size-5 text-ember-600" aria-hidden />
            <blockquote className="display text-[22px] leading-[1.15] text-ink">
              PayPal Purchase Protection excludes “Significantly Not as Described claims for wholly or partly custom-made items.”
            </blockquote>
            <figcaption className="flex flex-col gap-1.5">
              <span className="text-[13px] leading-snug text-ink-2">Every logo, landing page and line of code is custom-made.</span>
              <Cite href={SOURCES.paypal}>PayPal Purchase Protection policy, Jan 2026</Cite>
            </figcaption>
          </figure>
        </div>
      </Container>
    </section>
  );
}
