import { ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, Clock3, Gavel, Link2, RotateCcw, Scale, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Seal } from "@/components/brand/seal";
import { CopyInvite } from "@/components/pact/pact-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicProfile, type DisputeSummary, type TrackRecordItem } from "@/lib/domain/profile";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";

type Props = { params: Promise<{ handle: string }> };

const loadProfile = cache((handle: string) => getPublicProfile(decodeURIComponent(handle)));

const money = (cents: number, currency = "USD") => formatMoney(cents, currency).replace(/\.00$/, "");
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const firstName = (name: string) => name.split(/\s+/)[0];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const profile = await loadProfile(handle);
  if (!profile) return { title: "Profile not found" };
  const { user, stats } = profile;
  const kept = stats.milestonesKept;
  const description = `${user.name}${user.headline ? ` — ${user.headline}` : ""}. ${stats.pactsCompleted} pact${stats.pactsCompleted === 1 ? "" : "s"} completed and ${kept} milestone${kept === 1 ? "" : "s"} kept through Kept escrow on PayPal.`;
  return {
    title: `${user.name} · Verified track record`,
    description,
    openGraph: { title: `${user.name} keeps their promises`, description, type: "profile" },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { handle } = await params;
  const [profile, viewer] = await Promise.all([loadProfile(handle), getCurrentUser()]);
  if (!profile) notFound();

  const { user, stats, record, disputes, primaryRole } = profile;
  const isOwner = viewer?.handle === user.handle;
  const first = firstName(user.name);
  const url = `${env.appUrl}/u/${user.handle}`;
  const badgeImg = "https://img.shields.io/badge/Paid_safely_with-Kept-0f6b57?style=flat-square";
  const htmlSnippet = `<a href="${url}" title="${user.name}'s verified track record on Kept"><img src="${badgeImg}" alt="Paid safely with Kept" height="20"></a>`;
  const mdSnippet = `[![Paid safely with Kept](${badgeImg})](${url})`;
  const kept = stats.milestonesKept;

  const statCards =
    primaryRole === "freelancer"
      ? [
          { label: "Pacts completed", value: String(stats.pactsCompleted), hint: stats.pactsActive ? `${stats.pactsActive} in progress` : "All delivered", icon: CheckCircle2 },
          { label: "Released via Kept", value: money(stats.releasedCents), hint: "Paid out by PayPal from escrow", icon: ShieldCheck },
          { label: "On-time delivery", value: stats.onTimeRate === null ? "—" : `${stats.onTimeRate}%`, hint: stats.onTimeSample ? `Across ${stats.onTimeSample} delivered milestone${stats.onTimeSample === 1 ? "" : "s"}` : "No deliveries yet", icon: Clock3 },
          { label: "AI referee score", value: stats.avgScore === null ? "—" : `${stats.avgScore}`, suffix: stats.avgScore === null ? undefined : "/100", hint: stats.scoredCount ? `Average of ${stats.scoredCount} reviewed deliver${stats.scoredCount === 1 ? "y" : "ies"}` : "No reviews yet", icon: Sparkles },
        ]
      : [
          { label: "Pacts completed", value: String(stats.pactsCompleted), hint: stats.pactsActive ? `${stats.pactsActive} in progress` : "All settled", icon: CheckCircle2 },
          { label: "Paid to freelancers", value: money(stats.paidCents), hint: "Released through Kept escrow", icon: ShieldCheck },
          { label: "Milestones funded", value: String(stats.milestonesFunded), hint: "Money secured before work began", icon: Clock3 },
          { label: "Disputes", value: String(stats.disputes.total), hint: stats.disputes.total ? `${stats.disputes.resolved} resolved · ${stats.disputes.open} open` : "None, ever", icon: Scale },
        ];

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center gap-3 px-4 sm:px-8">
          <Logo />
          <span className="hidden text-[13px] text-ink-3 sm:inline">· Public track record</span>
          <div className="ml-auto flex items-center gap-2">
            {viewer ? (
              <Button asChild size="sm" variant="outline"><Link href="/app">Open Kept</Link></Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex"><Link href="/login">Sign in</Link></Button>
                <Button asChild size="sm"><Link href="/signup">Start a pact</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-8 sm:px-8 sm:py-12">
        {isOwner && (
          <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-dashed border-jade-300 bg-jade-50/70 px-4 py-3 text-[13px] text-jade-700">
            <BadgeCheck className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 basis-[240px]">This is your public page. Anyone with the link sees exactly this — no emails, deliverables or private messages.</span>
            <a href="#badge" className="shrink-0 pl-7 font-medium underline-offset-4 hover:underline sm:pl-0">Add the badge to your bio →</a>
          </div>
        )}

        {/* Identity */}
        <section className="relative overflow-hidden rounded-3xl border border-line bg-card shadow-card animate-fade-up">
          <div className="grain absolute inset-0 opacity-40" />
          <div className="absolute -right-24 -top-24 size-72 rounded-full bg-jade-100/60 blur-3xl" />
          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-10">
            <Avatar name={user.name} hue={user.avatarHue} size={96} className="ring-4" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[12px] text-ink-3">@{user.handle}</p>
              <h1 className="display mt-1 text-[44px] sm:text-[56px]">{user.name}</h1>
              {user.headline && <p className="mt-1 text-[16px] text-ink-2">{user.headline}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {user.paypalVerified && <Badge tone="jade"><ShieldCheck /> PayPal-verified payout account</Badge>}
                <Badge tone="neutral"><CalendarDays /> Member since {user.memberSince.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
              <Seal size={88} label="KEPT" tone="jade" />
              <p className="text-[13px] leading-snug text-ink-2">
                <span className="num display block text-[32px] leading-none text-ink">{kept}</span>
                promise{kept === 1 ? "" : "s"} kept
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label} className="p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[12px] font-medium text-ink-3">
                <s.icon className="size-3.5 text-jade-600" /> {s.label}
              </div>
              <p className="num display mt-2 text-[34px] leading-none sm:text-[40px]">
                {s.value}
                {"suffix" in s && s.suffix && <span className="text-[18px] text-ink-3">{s.suffix}</span>}
              </p>
              <p className="mt-2 text-[12px] leading-snug text-ink-3">{s.hint}</p>
            </Card>
          ))}
        </section>

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Track record */}
          <Card>
            <CardHeader>
              <CardTitle>Track record</CardTitle>
              <CardDescription>Every entry is a pact held in PayPal escrow and checked by Kept’s AI referee.</CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              {record.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line-2 bg-paper/60 px-5 py-10 text-center">
                  <p className="display text-[26px]">No completed pacts yet</p>
                  <p className="mt-1 text-[13px] text-ink-3">When {first} finishes work through Kept, it shows up here — verified, not self-reported.</p>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {record.map((r) => (
                    <RecordRow key={r.id} item={r} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="flex min-w-0 flex-col gap-6">
            <DisputesCard items={disputes} total={stats.disputes.total} first={first} />

            {/* Embeddable badge */}
            <Card id="badge" className="scroll-mt-24">
              <CardHeader>
                <CardTitle>{isOwner ? (primaryRole === "freelancer" ? "Show clients you get paid safely" : "Show freelancers you pay safely") : `Share ${first}’s record`}</CardTitle>
                <CardDescription>
                  {isOwner ? "Paste this badge in your bio, portfolio or GitHub README. It links straight to this page." : "A verified badge that links to this page."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center rounded-xl border border-line bg-paper px-4 py-5">
                  <a href={url} className="inline-flex items-center gap-2 rounded-full border border-jade-100 bg-card py-1.5 pl-1.5 pr-3.5 text-[13px] font-medium text-ink shadow-card transition hover:shadow-lift">
                    <LogoMark size={22} />
                    Paid safely with Kept
                    <span className="num rounded-full bg-jade-50 px-2 py-0.5 text-[11px] font-semibold text-jade-700">{kept} kept</span>
                  </a>
                </div>
                <Snippet label="Profile link" icon={<Link2 className="size-3" />} value={url} />
                <Snippet label="Markdown" value={mdSnippet} />
                <Snippet label="HTML" value={htmlSnippet} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Viral loop CTA */}
        <section className="relative mt-10 overflow-hidden rounded-3xl bg-ink px-6 py-10 text-paper sm:px-10">
          <div className="grain absolute inset-0 opacity-20" />
          <div className="absolute -bottom-24 -right-16 size-80 rounded-full bg-jade-600/30 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex-1">
              <h2 className="display text-[34px] sm:text-[40px]">Working with {first}?</h2>
              <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-paper/65">
                Turn the DM where you agreed the deal into a pact. The money waits safely in PayPal escrow, an AI referee checks the work against what you both signed, and nobody gets ghosted.
              </p>
            </div>
            <Button asChild size="lg" variant="jade">
              <Link href={viewer ? "/app/pacts/new" : "/signup?next=/app/pacts/new"}>
                Start a pact <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-[12px] text-ink-3">
        Figures are computed from Kept’s escrow ledger and PayPal payouts, not self-reported.
      </footer>
    </div>
  );
}

function Snippet({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
        {icon}
        {label}
      </p>
      <CopyInvite url={value} />
    </div>
  );
}

function OutcomeBadge({ item }: { item: TrackRecordItem }) {
  switch (item.outcome) {
    case "paid_in_full":
      return <Badge tone="jade"><CheckCircle2 /> Paid in full</Badge>;
    case "settled":
      return <Badge tone="ember"><Scale /> Settled · {item.releasedPct}% released</Badge>;
    case "refunded":
      return <Badge tone="neutral"><RotateCcw /> Refunded</Badge>;
    default:
      return <Badge tone="sky" dot>In progress · {item.milestonesKept} of {item.milestonesTotal} kept</Badge>;
  }
}

function RecordRow({ item }: { item: TrackRecordItem }) {
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-ink">{item.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-3">
          <span>
            {item.role === "freelancer" ? "Delivered for" : "Hired"} {item.counterpart ?? "a Kept member"}
          </span>
          <span aria-hidden>·</span>
          <span>{fmtDate(item.date)}</span>
          {item.score !== null && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1"><Sparkles className="size-3 text-sky-500" /> referee {item.score}/100</span>
            </>
          )}
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <OutcomeBadge item={item} />
        <span className="num w-24 text-right text-[15px] font-semibold">{money(item.amountCents, item.currency)}</span>
      </div>
    </li>
  );
}

function DisputesCard({ items, total, first }: { items: DisputeSummary[]; total: number; first: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gavel className="size-4 text-ink-3" /> Disputes</CardTitle>
        <CardDescription>
          {total === 0 ? `${first} has never had a dispute on Kept.` : `${total} dispute${total === 1 ? "" : "s"}, each handled by Kept’s AI mediator.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex items-center gap-3 rounded-xl bg-jade-50 px-4 py-3 text-[13px] text-jade-700">
            <CheckCircle2 className="size-4" /> Clean record
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((d, i) => (
              <li key={i} className="rounded-xl border border-line bg-paper/60 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-[13.5px] font-medium leading-snug">{d.pactTitle}</p>
                  <Badge tone={d.status === "resolved" ? "jade" : d.status === "escalated" ? "rose" : "amber"} className="shrink-0">
                    {d.status === "resolved" ? "Resolved" : "Open"}
                  </Badge>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-3">{d.resolution} · {fmtDate(d.date)}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
