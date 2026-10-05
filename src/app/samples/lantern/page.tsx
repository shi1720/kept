import { ArrowRight, Coffee, Flame, Mountain, Package, Sprout, Truck } from "lucide-react";
import type { Metadata } from "next";
import { HolidayBag, LanternHeader, LanternMark, PREORDER_HREF, TASTING_NOTES } from "../_lantern/brand";

export const metadata: Metadata = {
  title: { absolute: "Holiday Blend; Lantern Coffee Roasters" },
  description: "Pre-order Lantern's Holiday Blend: a single-farm Colombian coffee from the Alvarado family in Huila. $22 per 12oz bag, ships December 1.",
  robots: { index: false, follow: false },
};

const FACTS = [
  { icon: Sprout, label: "Farm", value: "Finca La Esperanza, Alvarado family" },
  { icon: Mountain, label: "Altitude", value: "1,750 metres, Pitalito, Huila" },
  { icon: Coffee, label: "Variety", value: "Caturra & Pink Bourbon" },
  { icon: Flame, label: "Process & roast", value: "Washed, 36-hour ferment · medium" },
];

const FAQ = [
  {
    q: "When will my Holiday Blend ship?",
    a: "Every pre-order is roasted the last week of November and ships on December 1. You'll get a tracking link the day it leaves our roastery.",
  },
  {
    q: "Whole bean or ground?",
    a: "Whole bean by default. Add a note at checkout and we'll grind it for pour-over, espresso or French press.",
  },
  {
    q: "Can I send it as a gift?",
    a: "Yes. Add a gift message and we'll tuck a handwritten card in the box and leave the receipt out.",
  },
  {
    q: "What if I change my mind?",
    a: "Cancel any time before November 24 for a full refund, no questions asked.",
  },
];

export default function LanternSamplePage() {
  return (
    <main id="top" className="relative overflow-hidden">
      <div className="grain pointer-events-none absolute inset-0 opacity-50" />
      <LanternHeader />

      {/* Hero */}
      <section className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24 lg:pt-10">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#B88A3B]/40 bg-[#F6EEDF] px-3 py-1 text-[12px] font-medium uppercase tracking-[0.14em] text-[#8a6d4f]">
            <span className="size-1.5 rounded-full bg-[#C2410C]" /> Limited winter release · Lot 07
          </p>
          <h1 className="display mt-5 text-[64px] text-[#3B2A20] sm:text-[96px] lg:text-[112px]">
            Holiday <span className="italic text-[#C2410C]">Blend</span>
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[#3B2A20]/80 sm:text-[19px]">
            A single-farm Colombian coffee with notes of dark cherry, cocoa nib and orange peel. Roasted in small batches in Austin, made for long December mornings.
          </p>
          <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6d4f]">Price</p>
              <p className="display mt-1 text-[44px] leading-none">
                $22 <span className="text-[22px] text-[#3B2A20]/60">/ 12oz bag</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="#preorder"
                className="inline-flex h-14 items-center gap-2 rounded-full bg-[#C2410C] px-8 text-[16px] font-semibold text-[#FBF6EC] shadow-[0_10px_30px_-10px_rgba(194,65,12,0.7)] transition hover:bg-[#9a330a]"
              >
                Pre-order now <ArrowRight className="size-4" />
              </a>
              <a href="#story" className="inline-flex h-14 items-center rounded-full border border-[#3B2A20]/20 px-6 text-[15px] font-medium hover:bg-[#3B2A20]/5">
                Read the story
              </a>
            </div>
          </div>
          <p className="mt-6 flex items-center gap-2 text-[13.5px] text-[#3B2A20]/70">
            <Truck className="size-4 text-[#B88A3B]" /> Ships December 1 · free US shipping on two bags or more
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[420px]">
          <div className="absolute inset-6 rounded-full bg-[radial-gradient(circle_at_40%_35%,#f6d8b8,#F6EEDF_55%,transparent_72%)]" />
          <div className="absolute -right-2 top-6 z-10 flex size-24 rotate-12 items-center justify-center rounded-full border-2 border-dashed border-[#C2410C]/60 bg-[#FBF6EC] text-center text-[11px] font-semibold uppercase leading-tight tracking-[0.12em] text-[#C2410C] sm:size-28">
            Roasted
            <br />
            to order
          </div>
          <HolidayBag className="relative w-full drop-shadow-[0_30px_40px_rgba(59,42,32,0.25)]" />
        </div>
      </section>

      {/* Tasting notes */}
      <section className="relative bg-[#3B2A20] text-[#F6EEDF]">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-10 sm:grid-cols-[auto_1fr] sm:items-center sm:px-8">
          <p className="display text-[30px] italic text-[#e9c99a]">In the cup</p>
          <ul className="grid gap-4 sm:grid-cols-3">
            {TASTING_NOTES.map((n) => (
              <li key={n.name} className="flex items-center gap-3 rounded-2xl border border-[#F6EEDF]/10 bg-[#F6EEDF]/5 px-4 py-3">
                <span className={`size-8 shrink-0 rounded-full ring-2 ring-[#F6EEDF]/20 ${n.swatch}`} />
                <span className="text-[15px] font-medium">{n.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Story */}
      <section id="story" className="relative mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:py-28">
        <div className="lg:sticky lg:top-10 lg:self-start">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#C2410C]">The origin</p>
          <h2 className="display mt-3 text-[44px] sm:text-[56px]">From the Alvarado family’s hillside in Huila</h2>
          <dl className="mt-8 divide-y divide-[#3B2A20]/10 rounded-2xl border border-[#3B2A20]/10 bg-[#F6EEDF]/70">
            {FACTS.map((f) => (
              <div key={f.label} className="flex items-start gap-3 px-5 py-3.5">
                <f.icon className="mt-0.5 size-4 shrink-0 text-[#B88A3B]" />
                <dt className="w-32 shrink-0 text-[13px] text-[#3B2A20]/60">{f.label}</dt>
                <dd className="text-[14px] font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="space-y-6 text-[17.5px] leading-[1.75] text-[#3B2A20]/90">
          <p className="first-letter:float-left first-letter:mr-3 first-letter:font-[family-name:var(--font-instrument)] first-letter:text-[76px] first-letter:leading-[0.8] first-letter:text-[#C2410C]">
            Every bag of Holiday Blend begins on a steep green hillside outside Pitalito, in Colombia’s Huila department, where the Alvarado family has grown coffee for three
            generations. Doña Rosa Alvarado planted the first Caturra trees in 1979 on land her father cleared by hand. Today her son Julián and granddaughter Camila tend eleven
            hectares at 1,750 metres, shaded by guamo and plantain trees that keep the soil cool and the birds close.
          </p>
          <p>
            Cherries are picked one at a time, only when they turn the colour of wine. The family ferments the coffee for thirty-six hours in small tanks, washes it in spring
            water and dries it slowly on raised beds under the parabolic roof Camila built in 2019. That patience is what you taste: a deep dark cherry sweetness up front, a
            cocoa nib richness in the middle, and a bright lift of orange peel in the finish.
          </p>
          <blockquote className="border-l-2 border-[#C2410C] pl-5 font-[family-name:var(--font-instrument)] text-[26px] italic leading-snug text-[#3B2A20]">
            “We don’t rush the coffee, so the coffee doesn’t rush you.”
            <footer className="mt-2 font-sans text-[13px] not-italic text-[#3B2A20]/60">Camila Alvarado, Finca La Esperanza</footer>
          </blockquote>
          <p>
            We met Julián on our first sourcing trip in 2021 and have bought his whole Caturra and Pink Bourbon lot every year since, paying 40% above the fair-trade price. Our
            roaster Sam roasts it in small batches on our twelve-kilo drum in East Austin, a touch lighter than last year so the fruit sings, whether you brew it as a pour-over,
            in a French press or with a splash of oat milk. Every pre-order helps us commit to next year’s harvest before it is picked.
          </p>
        </div>
      </section>

      {/* Pre-order */}
      <section id="preorder" className="relative mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        <div className="relative overflow-hidden rounded-[28px] bg-[#3B2A20] text-[#F6EEDF] shadow-[0_30px_60px_-30px_rgba(59,42,32,0.6)]">
          <div className="absolute -right-20 -top-20 size-72 rounded-full bg-[#C2410C]/30 blur-3xl" />
          <div className="relative grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#e9c99a]">Pre-order · 400 bags this year</p>
              <h2 className="display mt-3 text-[42px] sm:text-[52px]">Reserve your Holiday Blend</h2>
              <ul className="mt-6 space-y-2.5 text-[15px] text-[#F6EEDF]/85">
                <li className="flex items-center gap-2.5"><Package className="size-4 text-[#e9c99a]" /> 12oz bag, whole bean, roasted to order</li>
                <li className="flex items-center gap-2.5"><Truck className="size-4 text-[#e9c99a]" /> Ships December 1, 2026 · pre-orders close November 24</li>
                <li className="flex items-center gap-2.5"><Sprout className="size-4 text-[#e9c99a]" /> 40% above fair-trade price, paid to the Alvarado family</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-[#FBF6EC] p-6 text-[#3B2A20] sm:p-7">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-medium">Holiday Blend · 12oz</span>
                <span className="display text-[40px] leading-none">$22</span>
              </div>
              <p className="mt-1 text-[13px] text-[#3B2A20]/60">Two bags or more ship free in the US.</p>
              <a
                href={PREORDER_HREF}
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#C2410C] text-[16px] font-semibold text-[#FBF6EC] transition hover:bg-[#9a330a]"
              >
                Pre-order for $22 <ArrowRight className="size-4" />
              </a>
              <p className="mt-3 text-center text-[12px] text-[#3B2A20]/55">You won’t be charged until your coffee ships.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <h2 className="display text-center text-[40px]">Good questions</h2>
        <div className="mt-8 divide-y divide-[#3B2A20]/10 rounded-2xl border border-[#3B2A20]/10 bg-[#FBF6EC]">
          {FAQ.map((f, i) => (
            <details key={f.q} className="group px-6 py-4" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-medium">
                {f.q}
                <span className="text-[20px] leading-none text-[#C2410C] transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-[15px] leading-relaxed text-[#3B2A20]/75">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-[#3B2A20]/10 bg-[#F6EEDF]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-8 text-[13px] text-[#3B2A20]/65 sm:px-8">
          <span className="flex items-center gap-2 text-[#3B2A20]"><LanternMark size={22} /> Lantern Coffee Roasters</span>
          <span>1100 E 6th St, Austin, TX</span>
          <span>hello@lantern.coffee</span>
          <span className="sm:ml-auto">Roasting in Austin since 2016</span>
        </div>
      </footer>
    </main>
  );
}
