import { Logo } from "@/components/brand/logo";
import { Seal } from "@/components/brand/seal";
import { DemoButtons } from "./auth-form";
import "./auth-layout.css";

export function AuthLayout({ title, subtitle, children, showDemo = true }: { title: string; subtitle: string; children: React.ReactNode; showDemo?: boolean }) {
  return (
    <div className="auth-page">
      <div className="auth-content">
        <Logo />
        <main className="auth-main">
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          <div className="auth-fields">{children}</div>
          {showDemo && (
            <div className="auth-demo">
              <p className="text-[13px] font-medium">Just exploring? Try the demo.</p>
              <p className="mb-4 mt-1 text-xs text-ink-3">
                A private workspace. Try both sides.
              </p>
              <DemoButtons />
            </div>
          )}
        </main>
      </div>
      <aside aria-label="About Kept" className="auth-aside">
        <div className="grain absolute inset-0 opacity-30" />
        <div className="absolute -right-24 -top-24 size-[420px] rounded-full bg-jade-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-[380px] rounded-full bg-ember-600/20 blur-3xl" />
        <div className="auth-aside-label">Escrow with an AI referee · built on PayPal</div>
        <div className="auth-story">
          <Seal size={72} className="auth-seal" />
          <blockquote className="auth-quote">
            “The deal was made in a DM. <span className="italic text-jade-300">Kept made it a promise.</span>”
          </blockquote>
          <p className="auth-story-copy">
            Agree on the brief. Fund with PayPal. Review the evidence together before approving the work.
          </p>
        </div>
        <div className="auth-stats">
          <div><div className="num text-xl font-semibold text-paper">71%</div>of freelancers struggle to get paid</div>
          <div><div className="num text-xl font-semibold text-paper">&lt;1%</div>ever take it to court</div>
          <div><div className="num text-xl font-semibold text-paper">~60s</div>for an evidence-backed verdict</div>
        </div>
      </aside>
    </div>
  );
}
