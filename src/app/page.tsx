import { Agents } from "@/components/marketing/agents";
import { FinalCta, MarketingFooter } from "@/components/marketing/closing";
import { Comparison } from "@/components/marketing/comparison";
import { Faq } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MarketingNav } from "@/components/marketing/nav";
import { PayPalRails } from "@/components/marketing/paypal-rails";
import { Pricing } from "@/components/marketing/pricing";
import { Problem } from "@/components/marketing/problem";
import { Referee } from "@/components/marketing/referee";
import { WhenWrong } from "@/components/marketing/when-wrong";
import { env } from "@/lib/env";
import "@/components/marketing/marketing.css";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Skip to content
      </a>
      <MarketingNav />
      <main id="main" className="flex-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <Referee />
        <WhenWrong />
        <Agents appUrl={env.appUrl} />
        <PayPalRails />
        <Comparison />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
