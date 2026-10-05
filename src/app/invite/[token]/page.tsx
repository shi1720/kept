import {
  AlertOctagon,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileSignature,
  Gavel,
  Lock,
  MailOpen,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PactStatusBadge } from "@/components/app/status";
import { Logo } from "@/components/brand/logo";
import { Seal } from "@/components/brand/seal";
import { CopyInvite, CountersignButton } from "@/components/pact/pact-actions";
import { CriterionRow } from "@/components/pact/verdict-report";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import type { Pact, User } from "@/lib/db/schema";
import { getPactByInvite } from "@/lib/domain/pacts";
import { getPactDetail, type PactDetail, type PublicUser } from "@/lib/domain/queries";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { formatMoney } from "@/lib/money";

type Props = { params: Promise<{ token: string }> };
type Side = "client" | "freelancer";

const loadInvite = cache(async (token: string) => {
  try {
    return await getPactByInvite(token);
  } catch (err) {
    if (err instanceof AppError && err.code === "not_found") return null;
    throw err;
  }
});

const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const pact = await loadInvite(token);
  const robots = { index: false, follow: false };
  if (!pact) return { title: "Invitation not found", robots };
  return {
    title: `Review & countersign: ${pact.title}`,
    description: "You've been invited to a Kept pact; escrow on PayPal with an AI referee that checks the work against criteria you both sign.",
    robots,
  };
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const [invite, viewer] = await Promise.all([loadInvite(token), getCurrentUser()]);
  if (!invite) notFound();
  const detail = await getPactDetail(viewer, invite.id, { inviteToken: token });
  const { pact } = detail;

  const creatorSide: Side = pact.creatorRole;
  const side: Side = creatorSide === "client" ? "freelancer" : "client";
  const inviter = creatorSide === "client" ? detail.client : detail.freelancer;
  const inviterName = inviter?.name ?? "Someone";
  const isCreator = viewer?.id === pact.creatorId;
  const isParty = Boolean(viewer && (detail.role || isCreator || pact.clientId === viewer.id || pact.freelancerId === viewer.id));
  const open = pact.status === "pending_acceptance";
  const next = encodeURIComponent(`/invite/${token}`);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1160px] items-center gap-3 px-4 sm:px-8">
          <Logo />
          <span className="hidden text-[13px] text-ink-3 sm:inline">· Invitation to a pact</span>
          <div className="ml-auto flex items-center gap-2 text-[13px] text-ink-3">
            {viewer ? (
              <>
                <span className="hidden sm:inline">Signed in as <span className="font-medium text-ink">{viewer.name}</span></span>
                <Avatar name={viewer.name} hue={viewer.avatarHue} size={30} />
              </>
            ) : (
              <Button asChild size="sm" variant="ghost"><Link href={`/login?next=${next}`}>Sign in</Link></Button>
            )}
          </div>
        </div>
      </header>

      {open ? (
        <OpenInvite detail={detail} token={token} side={side} inviter={inviter} inviterName={inviterName} viewer={viewer} isCreator={isCreator} next={next} />
      ) : (
        <ClosedInvite pact={pact} isParty={isParty} />
      )}

      <footer className="border-t border-line py-6 text-center text-[12px] text-ink-3">
        Kept holds funds with PayPal. Nothing is charged by signing; the client funds each milestone separately.
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ClosedInvite({ pact, isParty }: { pact: Pact; isParty: boolean }) {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-line bg-card shadow-card">
        <MailOpen className="size-7 text-ink-3" />
      </div>
      <h1 className="display mt-6 text-[40px] sm:text-[48px]">This invitation is no longer open</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        {pact.status === "active" || pact.status === "completed"
          ? "It has already been countersigned, so the pact is sealed."
          : pact.status === "cancelled"
            ? "The pact was cancelled before it was signed."
            : "The author has taken it back to make changes. They’ll send a fresh link when it’s ready."}
      </p>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-[13px]">
        <span className="max-w-[260px] truncate font-medium">{pact.title}</span>
        <PactStatusBadge status={pact.status} />
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {isParty ? (
          <Button asChild variant="jade" size="lg"><Link href={`/app/pacts/${pact.id}`}>Open the pact <ArrowRight /></Link></Button>
        ) : (
          <>
            <Button asChild variant="outline" size="lg"><Link href="/">What is Kept?</Link></Button>
            <Button asChild size="lg"><Link href="/app">Go to your dashboard</Link></Button>
          </>
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */

function protections(side: Side, reviewHours: number, counterpart: string) {
  return side === "freelancer"
    ? [
        { icon: Lock, title: "The money is secured before you start", body: `${counterpart} funds each milestone into PayPal escrow before you begin. You’ll see it held; no more working on a promise.` },
        { icon: Timer, title: "Ghosting can’t block your payment", body: `Once you deliver, ${counterpart} has ${reviewHours} hours to respond. If they go quiet and the AI referee passed your work, the money is released automatically.` },
        { icon: Gavel, title: "Judged on what you both signed", body: "The referee checks your work against these exact criteria; not shifting tastes. Disagreements go to a neutral AI mediator, then human arbitration." },
      ]
    : [
        { icon: ShieldCheck, title: "Pay only for work that passes", body: `Your money waits in PayPal escrow. It’s released to ${counterpart} when the work meets the criteria below and you approve; not before.` },
        { icon: Sparkles, title: "Evidence, not vibes", body: "Kept probes every delivery (links, word counts, files) and an AI referee reports criterion by criterion before you decide." },
        { icon: RefreshCcw, title: "A fair way out", body: "If the work falls short, request a revision or raise a dispute. Mediation can refund all or part of the milestone straight back to your PayPal." },
      ];
}

function OpenInvite({
  detail,
  token,
  side,
  inviter,
  inviterName,
  viewer,
  isCreator,
  next,
}: {
  detail: PactDetail;
  token: string;
  side: Side;
  inviter: PublicUser | null;
  inviterName: string;
  viewer: User | null;
  isCreator: boolean;
  next: string;
}) {
  const { pact, milestones, totals } = detail;
  const inviterFirst = inviterName.split(/\s+/)[0];
  const creatorSide = pact.creatorRole;
  const signedAt = creatorSide === "client" ? pact.clientSignedAt : pact.freelancerSignedAt;
  const items = protections(side, pact.terms.reviewWindowHours, inviterFirst);
  const inviteUrl = `${env.appUrl}/invite/${token}`;
  const criteriaCount = milestones.reduce((s, m) => s + m.criteria.length, 0);
  const autoChecks = milestones.reduce((s, m) => s + m.criteria.filter((c) => c.check.type !== "none").length, 0);

  return (
    <main className="mx-auto w-full max-w-[1160px] flex-1 px-4 py-8 sm:px-8 sm:py-10">
      {/* Envelope */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-card shadow-card animate-fade-up">
        <div className="grain absolute inset-0 opacity-40" />
        <div className="absolute -right-24 -top-28 size-80 rounded-full bg-ember-100/50 blur-3xl" />
        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Avatar name={inviterName} hue={inviter?.avatarHue ?? 40} size={44} />
              <p className="text-[14px] leading-snug text-ink-2">
                {inviter ? (
                  <Link href={`/u/${inviter.handle}`} className="font-semibold text-ink hover:underline">{inviterName}</Link>
                ) : (
                  <span className="font-semibold text-ink">{inviterName}</span>
                )}{" "}
                {isCreator ? "(you) " : ""}signed this pact as the <b className="font-semibold text-ink">{creatorSide}</b>
                <br />
                <span className="text-ink-3">
                  {isCreator ? "and is waiting for the other side" : "and invited you to countersign as the"}{" "}
                  {!isCreator && <b className="font-semibold text-ember-700">{side}</b>}
                  {signedAt && ` · ${signedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                </span>
              </p>
            </div>
            <h1 className="display mt-6 text-[40px] sm:text-[54px]">{pact.title}</h1>
            {pact.summary && <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">{pact.summary}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Badge tone="amber" dot>{isCreator ? "Awaiting countersignature" : "Awaiting your signature"}</Badge>
              <Badge tone="neutral">{milestones.length} milestone{milestones.length === 1 ? "" : "s"}</Badge>
              <Badge tone="neutral">{criteriaCount} acceptance criteria</Badge>
              {autoChecks > 0 && <Badge tone="sky">{autoChecks} checked automatically</Badge>}
            </div>
            {!isCreator && (
              <Button asChild variant="jade" className="mt-6 lg:hidden">
                <a href="#sign"><FileSignature /> Review protections & sign</a>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-5 lg:flex-col lg:items-end lg:text-right">
            <Seal size={84} label="SIGNED" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Pact total</p>
              <p className="num display mt-1 text-[44px] leading-none">{formatMoney(totals.amountCents, pact.currency)}</p>
              <p className="mt-1 text-[12px] text-ink-3">{pact.currency} · escrowed with PayPal, milestone by milestone</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Contract */}
        <div className="flex min-w-0 flex-col gap-5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-ink-3">
            <FileSignature className="size-4" /> What you’re agreeing to
          </h2>
          {milestones.map((m, i) => (
            <Card key={m.id} className="overflow-hidden">
              <div className="flex flex-wrap items-start gap-4 border-b border-line bg-paper/50 px-5 py-4 sm:px-6">
                <span className="num flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-paper">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold tracking-tight">{m.title}</p>
                  {m.description && <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-3">{m.description}</p>}
                  {m.dueAt && (
                    <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink-2">
                      <CalendarClock className="size-3.5 text-ink-3" /> Due {fmtDate(m.dueAt)}
                    </p>
                  )}
                </div>
                <p className="num display text-[30px] leading-none">{formatMoney(m.amountCents, pact.currency)}</p>
              </div>
              <CardContent className="py-2">
                <p className="pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Acceptance criteria</p>
                <ul className="divide-y divide-line">
                  {m.criteria.map((c, ci) => (
                    <CriterionRow key={c.id} criterion={c} index={ci} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ScrollText className="size-4 text-ink-3" /> Terms</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-[13.5px] sm:grid-cols-2">
              <Term label="Revisions included" value={`${pact.terms.revisionsIncluded} round${pact.terms.revisionsIncluded === 1 ? "" : "s"}`} />
              <Term label="Client review window" value={`${pact.terms.reviewWindowHours} hours after each delivery, then auto-resolves`} />
              <Term label="Ownership" value={pact.terms.ipTransfer} />
              {pact.terms.reviewGuidance && <Term label="Creative review guidance" value={pact.terms.reviewGuidance} />}
              <Term label="Disputes" value="AI mediation first, human arbitration if either side rejects" />
              {pact.terms.communication && <Term label="Communication" value={pact.terms.communication} />}
              {pact.terms.extra?.map((x, i) => <Term key={i} label="Also agreed" value={x} />)}
            </CardContent>
          </Card>

          {pact.ambiguities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-ember-600" /> Vague wording, made checkable</CardTitle>
                <CardDescription>
                  Kept’s contract linter rewrote {pact.ambiguities.length} dispute-prone phrase{pact.ambiguities.length === 1 ? "" : "s"} from the original conversation
                  {pact.clarityScore != null && <> (which scored <b className="text-ink">{pact.clarityScore}/100</b> for clarity)</>}. These resolutions are part of what you sign.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {pact.ambiguities.map((a, i) => (
                  <div key={i} className="grid gap-2 rounded-xl border border-line bg-paper/50 p-3.5 text-[13px] sm:grid-cols-[minmax(0,0.9fr)_auto_minmax(0,1.1fr)] sm:items-center">
                    <div className="min-w-0">
                      <p className="text-ink-3 line-through decoration-rose-300">“{a.quote}”</p>
                      <p className="mt-0.5 text-[12px] text-rose-700">{a.issue}</p>
                    </div>
                    <ArrowRight className="hidden size-4 text-ink-3 sm:block" />
                    <p className="flex items-start gap-1.5 font-medium text-ink">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-jade-600" /> {a.suggestion}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {pact.riskFlags.length > 0 ? (
            <Card className="border-rose-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-700"><AlertOctagon className="size-4" /> Risk flags</CardTitle>
                <CardDescription>Kept spotted patterns worth a second look before you sign.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pact.riskFlags.map((r, i) => (
                  <div key={i} className="flex gap-3 text-[13px]">
                    <Badge tone={r.severity === "high" ? "rose" : r.severity === "medium" ? "amber" : "neutral"} className="h-fit">{r.severity}</Badge>
                    <div>
                      <p className="font-medium">{r.signal}</p>
                      <p className="text-ink-3">{r.explanation}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center gap-2.5 rounded-2xl border border-jade-100 bg-jade-50/70 px-5 py-3.5 text-[13px] text-jade-700">
              <ShieldCheck className="size-4 shrink-0" /> No risk flags; Kept found no off-platform payment, gift-card or other scam patterns in this pact.
            </div>
          )}
        </div>

        {/* Sign */}
        <aside id="sign" className="flex min-w-0 scroll-mt-20 flex-col gap-5 lg:sticky lg:top-24">
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-gradient-to-br from-ember-50 via-card to-card px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ember-700">{isCreator ? "Your invitation" : `You’d sign as the ${side}`}</p>
              <p className="display mt-1 text-[28px] leading-tight">
                {isCreator ? "Waiting for a countersignature" : side === "freelancer" ? `Get paid ${formatMoney(totals.amountCents, pact.currency)}, safely` : `Pay ${formatMoney(totals.amountCents, pact.currency)} only for work that passes`}
              </p>
            </div>
            <CardContent className="space-y-4">
              {!isCreator && (
                <ul className="space-y-4">
                  {items.map((p) => (
                    <li key={p.title} className="flex gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-jade-50 text-jade-700"><p.icon className="size-4" /></span>
                      <div>
                        <p className="text-[13.5px] font-semibold leading-snug">{p.title}</p>
                        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">{p.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {isCreator ? (
                <div className="space-y-3">
                  <p className="text-[13.5px] leading-relaxed text-ink-2">
                    This is the page {pact.counterpartyName ? <b className="text-ink">{pact.counterpartyName}</b> : "the other side"} sees. Share the link; once they countersign, milestones open for funding.
                  </p>
                  <CopyInvite url={inviteUrl} />
                  <Button asChild variant="outline" className="w-full"><Link href={`/app/pacts/${pact.id}`}>Open the pact <ArrowRight /></Link></Button>
                </div>
              ) : viewer ? (
                <div className="space-y-3 border-t border-line pt-4">
                  <p className="text-[12.5px] text-ink-3">
                    Signing as <b className="text-ink">{viewer.name}</b>. Nothing is charged now{side === "client" ? "; you fund each milestone when you’re ready" : ""}.
                  </p>
                  <CountersignButton token={token} role={side} />
                </div>
              ) : (
                <div className="space-y-2.5 border-t border-line pt-4">
                  <p className="text-[12.5px] text-ink-3">Create a free account to countersign. It takes under a minute{side === "freelancer" ? " and freelancers never pay a Kept fee" : ""}.</p>
                  <Button asChild variant="jade" size="lg" className="w-full">
                    <Link href={`/signup?next=${next}`}><FileSignature /> Sign up to countersign</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full">
                    <Link href={`/login?next=${next}`}>I already have an account</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-line bg-paper-2/60 px-5 py-4 text-[12px] leading-relaxed text-ink-3">
            <p className="font-medium text-ink-2">How Kept works</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Both sides sign these criteria.</li>
              <li>The client funds each milestone into PayPal escrow.</li>
              <li>The freelancer delivers; an AI referee checks it against the criteria.</li>
              <li>Money is released; or fairly split; in minutes.</li>
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-0.5 leading-relaxed text-ink">{value}</p>
    </div>
  );
}
