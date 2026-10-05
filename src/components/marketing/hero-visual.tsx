import { ArrowDownRight, Bot, CheckCircle2, Cpu, Lock, MessageCircle, Send, Sparkles } from "lucide-react";
import { Seal } from "@/components/brand/seal";
import { ScoreRing } from "@/components/pact/verdict-report";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

const CRITERIA: { text: string; auto: boolean }[] = [
  { text: "Page is live and publicly reachable", auto: true },
  { text: "Names “Holiday Blend” and shows its price", auto: true },
  { text: "Has a clear “Pre-order” call to action", auto: true },
  { text: "At least 150 words on the beans’ origin", auto: true },
  { text: "Matches Lantern’s warm, craft brand", auto: false },
];

function d(seconds: number) {
  return { "--d": `${seconds}s` } as React.CSSProperties;
}

/**
 * The hero "product film": an Instagram-style DM compiles into a pact with
 * machine-checkable criteria, gets sealed, funded, and judged. Pure HTML/CSS.
 */
export function HeroVisual() {
  return (
    <div
      className="relative mx-auto w-full max-w-[560px] xl:h-[730px]"
      role="img"
      aria-label="Illustration: a DM between Maya and Ana is compiled into a Kept pact for a $900 landing page with five acceptance criteria, sealed by both, funded through PayPal, and judged by the AI referee at 94 out of 100 before the payout is sent."
    >
      {/* Soft light behind the composition */}
      <div aria-hidden className="pointer-events-none absolute -inset-10 -z-10">
        <div className="absolute right-6 top-10 size-72 rounded-full bg-jade-100/70 blur-3xl" />
        <div className="absolute bottom-6 left-0 size-64 rounded-full bg-ember-100/60 blur-3xl" />
      </div>

      <div className="flex flex-col gap-4 xl:block">
        {/* 1; The DM */}
        <div className="kp-in w-full max-w-[310px] xl:absolute xl:left-0 xl:top-0" style={d(0.07)}>
          <div className="kp-float rounded-2xl border border-line bg-card/95 p-3.5 shadow-lift" style={{ "--fd": "0.4s" } as React.CSSProperties}>
            <div className="flex items-center gap-2 border-b border-line pb-2.5">
              <MessageCircle className="size-3.5 text-ink-3" aria-hidden />
              <span className="text-[11.5px] font-medium text-ink-2">Instagram DM</span>
              <span className="ml-auto text-[10.5px] text-ink-3">@lanterncoffee</span>
            </div>
            <div className="mt-3 space-y-2 text-[12.5px] leading-snug">
              <div className="kp-in flex items-end gap-2" style={d(0.2)}>
                <Avatar name="Maya Chen" hue={24} size={22} />
                <p className="max-w-[240px] rounded-2xl rounded-bl-md bg-paper-2 px-3 py-2 text-ink">
                  Could you build a pre-order page for our Holiday Blend? Should be{" "}
                  <mark className="rounded bg-amber-100/80 px-0.5 text-ink underline decoration-amber-500 decoration-dashed underline-offset-2">mobile friendly</mark>{" "}
                  and tell the bean story. ~$900?
                </p>
              </div>
              <div className="kp-in flex items-end justify-end gap-2" style={d(0.43)}>
                <p className="max-w-[220px] rounded-2xl rounded-br-md bg-jade-600 px-3 py-2 text-white">
                  Love it. Live in 5 days. Let’s do it on Kept 🙌
                </p>
                <Avatar name="Ana Reyes" hue={160} size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Compile connector (desktop) */}
        <svg aria-hidden className="kp-draw kp-in absolute left-[118px] top-[216px] hidden xl:block" style={d(0.59)} width="90" height="86" viewBox="0 0 90 86" fill="none">
          <path d="M4 2 C 8 52, 40 70, 84 80" stroke="#7fbea8" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div className="kp-pop absolute left-[6px] top-[306px] z-20 hidden items-center gap-1.5 rounded-full border border-jade-100 bg-card px-2.5 py-1 text-[11px] font-medium text-jade-700 shadow-card xl:flex" style={d(0.61)}>
          <Sparkles className="size-3" aria-hidden /> Compiled · clarity 41 → 92
        </div>

        {/* Mobile connector */}
        <div className="kp-in flex items-center gap-2 pl-3 text-[11.5px] font-medium text-jade-700 xl:hidden" style={d(0.54)}>
          <ArrowDownRight className="size-4" aria-hidden />
          <span className="rounded-full border border-jade-100 bg-card px-2.5 py-1 shadow-card">
            <Sparkles className="mr-1 inline size-3" aria-hidden />
            Compiled · clarity 41 → 92
          </span>
        </div>

        {/* 2; The pact */}
        <div className="kp-in relative w-full xl:absolute xl:right-0 xl:top-[214px] xl:w-[350px]" style={d(0.68)}>
          <div className="relative rounded-2xl border border-line bg-card shadow-lift">
            <div className="flex items-start justify-between gap-3 border-b border-line px-4 pb-3 pt-4">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Pact · Milestone 1 of 1</div>
                <div className="mt-1 text-[14px] font-semibold leading-snug tracking-tight">Pre-order landing page for the Holiday Blend</div>
              </div>
              <div className="text-right">
                <div className="num text-[17px] font-semibold">$900.00</div>
                <div className="kp-pop mt-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-700" style={d(1.53)}>
                  <Lock className="size-2.5" aria-hidden /> In escrow
                </div>
              </div>
            </div>
            <ul className="space-y-2 px-4 py-3.5">
              {CRITERIA.map((c, i) => (
                <li key={c.text} className="kp-in flex items-start gap-2 text-[12px] leading-snug" style={d(0.85 + i * 0.07)}>
                  <CheckCircle2 className={cn("mt-px size-3.5 shrink-0", c.auto ? "text-jade-600" : "text-amber-500")} aria-hidden />
                  <span className="min-w-0 flex-1 text-ink-2">{c.text}</span>
                  {c.auto ? (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-sky-50 px-1.5 py-px text-[9.5px] font-medium text-sky-600">
                      <Cpu className="size-2.5" aria-hidden /> auto
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-paper-2 px-1.5 py-px text-[9.5px] font-medium text-ink-3">judged</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex items-end gap-6 border-t border-dashed border-line-2 px-4 pb-4 pt-3">
              <div>
                <div className="display text-[19px] italic leading-none text-ink">Maya Chen</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-ink-3">Client</div>
              </div>
              <div>
                <div className="display text-[19px] italic leading-none text-ink">Ana Reyes</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-ink-3">Freelancer</div>
              </div>
            </div>
            <div className="kp-stamp absolute -bottom-7 -right-5" style={d(1.3)}>
              <Seal size={86} label="KEPT" />
            </div>
          </div>
        </div>

        {/* 3; The verdict */}
        <div className="kp-in w-full max-w-[320px] xl:absolute xl:left-[24px] xl:top-[556px] xl:z-10" style={d(1.8)}>
          <div className="kp-float rounded-2xl border border-line bg-card p-4 shadow-lift" style={{ "--fd": "1.2s" } as React.CSSProperties}>
            <div className="flex items-center gap-4">
              <div className="kp-ring" style={d(1.89)}>
                <ScoreRing score={94} overall="pass" size={72} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                  <Bot className="size-3.5 text-sky-600" aria-hidden /> AI referee
                  <span className="rounded-full border border-jade-100 bg-jade-50 px-1.5 py-px text-[10px] font-semibold text-jade-700">PASS</span>
                </div>
                <p className="mt-1 text-[11.5px] leading-snug text-ink-2">5 of 5 criteria met. Live URL returned 200; “Pre-order” found in the hero; 212-word origin story.</p>
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between rounded-xl bg-jade-50 px-3 py-2 text-[12px]">
              <span className="font-medium text-jade-700">Maya approved</span>
              <span className="num font-semibold text-jade-700">Release $900.00</span>
            </div>
          </div>
        </div>

        {/* 4; Money moves */}
        <div className="kp-pop w-fit xl:absolute xl:right-[10px] xl:top-[650px] xl:z-20" style={d(2.34)}>
          <div className="flex items-center gap-2.5 rounded-full border border-line bg-ink py-1.5 pl-1.5 pr-4 text-paper shadow-lift">
            <span className="flex size-7 items-center justify-center rounded-full bg-jade-500">
              <Send className="size-3.5" aria-hidden />
            </span>
            <span className="text-[12px] leading-tight">
              <span className="block font-medium">PayPal Payout sent</span>
              <span className="num block text-paper/60">$900.00 → Ana · 100%</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
