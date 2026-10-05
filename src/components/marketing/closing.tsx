import { ArrowRight, FolderGit2 } from "lucide-react";
import Link from "next/link";
import { DemoButtons } from "@/components/auth/auth-form";
import { Logo } from "@/components/brand/logo";
import { Seal } from "@/components/brand/seal";
import { paypalConfigured } from "@/lib/env";
import { Container } from "./section";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="py-16 sm:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-[28px] bg-jade-900 px-6 py-14 text-paper sm:px-12 sm:py-16 lg:px-16">
          <div aria-hidden className="grain absolute inset-0 opacity-20" />
          <div aria-hidden className="absolute -right-32 -top-32 size-[460px] rounded-full bg-jade-600/40 blur-3xl" />
          <div aria-hidden className="absolute -bottom-40 left-10 size-[380px] rounded-full bg-ember-600/20 blur-3xl" />
          <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
            <div>
              <Seal size={76} label="KEPT" className="mb-8 rotate-[-10deg]" />
              <h2 id="cta-title" className="display text-[44px] leading-[1.02] sm:text-[60px] lg:text-[72px]">
                Get paid for the work you did.{" "}
                <br />
                <span className="italic text-jade-300">Pay only for the work you got.</span>
              </h2>
            </div>
            <div className="rounded-2xl bg-paper p-5 text-ink shadow-lift sm:p-6">
              <p className="text-[15px] font-semibold">See it work in two minutes</p>
              <p className="mb-4 mt-1 text-[13px] text-ink-2">
                A private demo world with pacts in every state{paypalConfigured() ? " and real PayPal sandbox checkout" : ""}. Switch sides any time.
              </p>
              <div className="[&>div]:!grid-cols-1">
                <DemoButtons />
              </div>
              <Link href="/signup" className="group mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-jade-700 hover:text-jade-900">
                Or start a real pact
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-line">
      <Container className="flex flex-col gap-10 py-12 sm:py-14">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
              Escrow with an AI referee for work agreed anywhere on the internet. Promises, kept.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-14 gap-y-2.5 text-[14px] sm:grid-cols-3">
            <a href="#how" className="text-ink-2 hover:text-ink">How it works</a>
            <a href="#referee" className="text-ink-2 hover:text-ink">The referee</a>
            <a href="#agents" className="text-ink-2 hover:text-ink">For agents</a>
            <a href="#paypal" className="text-ink-2 hover:text-ink">Built on PayPal</a>
            <a href="#pricing" className="text-ink-2 hover:text-ink">Pricing</a>
            <Link href="/login" className="text-ink-2 hover:text-ink">Sign in</Link>
          </nav>
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-6 text-[13px] text-ink-2/85 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Built for the PayPal AI Hackathon by <span className="font-medium text-ink">Shivam Gupta</span>. MIT licensed.
          </p>
          <a
            href="https://github.com/shi1720/paypal-ai"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-line-2 bg-card px-3 py-1.5 font-medium text-ink transition-colors hover:bg-paper-2"
          >
            <FolderGit2 className="size-4" aria-hidden /> shi1720/paypal-ai
          </a>
        </div>
        <p className="text-[11.5px] leading-relaxed text-ink-2/75">
          Kept is a hackathon project running on the PayPal sandbox. It is not affiliated with or endorsed by PayPal, Upwork, Fiverr or Escrow.com. Product
          names are used only to describe compatibility and comparisons.
        </p>
      </Container>
    </footer>
  );
}
