import { Logo } from "@/components/brand/logo";
import { Seal } from "@/components/brand/seal";
import { paypalConfigured } from "@/lib/env";
import { DemoButtons } from "./auth-form";

export function AuthLayout({ title, subtitle, children, showDemo = true }: { title: string; subtitle: string; children: React.ReactNode; showDemo?: boolean }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,560px)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
          <h1 className="display text-[44px]">{title}</h1>
          <p className="mt-2 text-[15px] text-ink-3">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {showDemo && (
            <div className="mt-10 rounded-2xl border border-dashed border-line-2 bg-paper-2/60 p-5">
              <p className="text-[13px] font-medium">Judging or just curious? Skip sign-up.</p>
              <p className="mb-4 mt-1 text-xs text-ink-3">
                Get a private demo world{paypalConfigured() ? " with real PayPal sandbox payments" : ""}. Switch sides any time.
              </p>
              <DemoButtons />
            </div>
          )}
        </main>
      </div>
      <aside aria-label="About Kept" className="relative hidden overflow-hidden bg-ink text-paper lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="grain absolute inset-0 opacity-30" />
        <div className="absolute -right-24 -top-24 size-[420px] rounded-full bg-jade-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-[380px] rounded-full bg-ember-600/20 blur-3xl" />
        <div className="relative text-sm text-paper/60">Escrow with an AI referee · built on PayPal</div>
        <div className="relative">
          <Seal size={92} className="mb-8" />
          <blockquote className="display text-[40px] leading-[1.08]">
            “The deal was made in a DM. <span className="italic text-jade-300">Kept made it a promise.</span>”
          </blockquote>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-paper/60">
            Paste the chat, sign the criteria, fund with PayPal. When the work arrives, an AI referee checks it against what you both agreed; and the money moves.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-6 border-t border-paper/10 pt-6 text-xs text-paper/60">
          <div><div className="num text-xl font-semibold text-paper">71%</div>of freelancers struggle to get paid</div>
          <div><div className="num text-xl font-semibold text-paper">&lt;1%</div>ever take it to court</div>
          <div><div className="num text-xl font-semibold text-paper">~60s</div>for an evidence-backed verdict</div>
        </div>
      </aside>
    </div>
  );
}
