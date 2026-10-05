import { ImageIcon } from "lucide-react";
import type { Metadata } from "next";
import { LanternHeader } from "../_lantern/brand";

/**
 * Demo deliverable: a half-finished draft. Names the product but has no
 * price, no order button and far fewer than 150 words, so several machine
 * checks fail honestly. (Avoid the words "pre-order" and the dollar sign here.)
 */
export const metadata: Metadata = {
  title: { absolute: "Holiday Blend (draft)" },
  robots: { index: false, follow: false },
};

function Todo({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-md border border-dashed border-[#C2410C]/50 bg-[#fdf1ea] px-2.5 py-1 font-mono text-[12px] text-[#9a330a]">
      {children}
    </p>
  );
}

export default function LanternDraftSamplePage() {
  return (
    <main className="relative">
      <LanternHeader nav={false} />
      <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        <div className="flex aspect-[16/7] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#3B2A20]/20 bg-[repeating-linear-gradient(45deg,#f3ebdc,#f3ebdc_12px,#efe5d3_12px,#efe5d3_24px)] text-[#3B2A20]/45">
          <ImageIcon className="size-10" />
          <span className="font-mono text-[13px]">hero image goes here (1600×700)</span>
        </div>

        <h1 className="display mt-10 text-[56px] sm:text-[72px]">Holiday Blend</h1>
        <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-[#3B2A20]/80">
          Our winter coffee is back. Lorem ipsum dolor sit amet, warm and cosy, more copy coming soon.
        </p>

        <div className="mt-8 flex flex-col items-start gap-2.5">
          <Todo>TODO: origin story from Maya (farm name?)</Todo>
          <Todo>TODO: pricing + checkout button</Todo>
          <Todo>TODO: shipping date, FAQ</Todo>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-dashed border-[#3B2A20]/20 bg-[#F6EEDF]/60 p-4 font-mono text-[12px] text-[#3B2A20]/40">
              tasting note {i}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
