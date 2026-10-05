import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { DemoButtons } from "@/components/auth/auth-form";
import { HeroVisual } from "./hero-visual";
import { Container } from "./section";

const PROOF = [
  { k: "100%", v: "of the milestone goes to the freelancer" },
  { k: "2.9%", v: "client protection fee, AI mediation included" },
  { k: "72h", v: "default review window (each pact can set its own), then passing work auto-releases" },
  { k: "MCP", v: "agents can hire people with escrow protection" },
];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div aria-hidden className="kp-ruled pointer-events-none absolute inset-x-0 top-0 h-[520px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <Container className="relative grid items-center gap-14 pb-16 pt-12 sm:pt-16 xl:grid-cols-[minmax(0,1fr)_560px] xl:gap-10 lg:pb-16 lg:pt-16">
        <div className="min-w-0">
          <div className="kp-in inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-line bg-card/80 py-1 pl-1 pr-3 text-[12.5px] text-ink-2 shadow-card" style={{ "--d": "0s" } as React.CSSProperties}>
            <span className="rounded-full bg-jade-600 px-2 py-0.5 text-[11px] font-medium text-white">New</span>
            Paste the DM. Get a contract that pays itself.
          </div>
          <h1 id="hero-title" className="display kp-in mt-6 text-[64px] leading-[0.95] sm:text-[96px] lg:text-[112px]" style={{ "--d": "0.08s" } as React.CSSProperties}>
            Promises,{" "}
            <br />
            <span className="italic text-jade-600">kept.</span>
          </h1>
          <p className="kp-in mt-7 max-w-[540px] text-[17.5px] leading-relaxed text-ink-2 sm:text-[19px]" style={{ "--d": "0.16s" } as React.CSSProperties}>
            Turn the DM where the deal was made into a contract that enforces itself. Kept holds the money with PayPal, an AI referee checks the work
            against the criteria you both signed, and payment is released, or fairly split, in minutes.
          </p>

          <div className="kp-in mt-9 max-w-[540px]" style={{ "--d": "0.24s" } as React.CSSProperties}>
            <p className="mb-3 flex items-center gap-2 text-[13px] font-medium text-ink">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-jade-500 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-jade-500" />
              </span>
              Try the live demo. Pick a side, no sign-up.
            </p>
            <DemoButtons />
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px]">
              <Link href="/signup" className="group inline-flex items-center gap-1.5 font-medium text-jade-700 hover:text-jade-900">
                Start a real pact, free
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <span className="text-ink-2/75">Real PayPal sandbox payments. Switch sides any time.</span>
            </div>
          </div>
        </div>

        <HeroVisual />
      </Container>

      <Container>
        <dl className="grid grid-cols-2 border-y border-line lg:grid-cols-4">
          {PROOF.map((p, i) => (
            <div
              key={p.k}
              className={
                "flex flex-col gap-1 py-5 pr-4 " +
                (i % 2 === 1 ? "border-l border-line pl-4 sm:pl-6 " : "") +
                (i >= 2 ? "border-t border-line lg:border-t-0 " : "") +
                (i === 2 ? "lg:border-l lg:pl-6" : "")
              }
            >
              <dt className="display text-[30px] leading-none text-ink sm:text-[34px]">{p.k}</dt>
              <dd className="text-[12.5px] leading-snug text-ink-2/85">{p.v}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
