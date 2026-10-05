import { and, eq, sql } from "drizzle-orm";
import { ArrowUpRight, FlaskConical, Hourglass, UserRound, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/developers/code-block";
import { LinkedBanner, PayoutForm, PayoutStatus, ProfileForm, VerifyWithPayPal } from "@/components/settings/forms";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { milestones, pacts, payouts } from "@/lib/db/schema";
import { env, paypalConfigured } from "@/lib/env";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Settings" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-[13px]">
      <span className="text-ink-3">{label}</span>
      <span className="min-w-0 truncate text-right text-ink">{children}</span>
    </div>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const linked = sp.linked === "paypal";
  const verifyEnabled = paypalConfigured() && env.paypal.loginEnabled;
  const isDemo = Boolean(user.demoWorkspace);
  const profileUrl = `${env.appUrl}/u/${user.handle}`;

  const [waiting] = await db
    .select({ n: sql<number>`count(*)`, cents: sql<number>`coalesce(sum(${payouts.amountCents}), 0)` })
    .from(payouts)
    .innerJoin(milestones, eq(milestones.id, payouts.milestoneId))
    .innerJoin(pacts, eq(pacts.id, milestones.pactId))
    .where(and(eq(pacts.freelancerId, user.id), eq(payouts.status, "NEEDS_PAYOUT_EMAIL")));
  const waitingCount = Number(waiting?.n ?? 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div>
        <p className="text-sm text-ink-3">Account</p>
        <h1 className="display mt-1 text-[44px]">Settings</h1>
      </div>

      {linked && <LinkedBanner email={user.paypalEmail} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-paper-2 p-1.5 text-ink-2">
                  <UserRound className="size-4" />
                </span>
                <CardTitle>Profile</CardTitle>
              </div>
              <CardDescription>How you appear to the people you make pacts with.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm initialName={user.name} initialHeadline={user.headline} />
            </CardContent>
          </Card>

          <Card id="payouts">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-jade-50 p-1.5 text-jade-700">
                  <Wallet className="size-4" />
                </span>
                <CardTitle>Payouts</CardTitle>
                <Badge tone="sky" className="ml-auto">PayPal Payouts</Badge>
              </div>
              <CardDescription>When escrow is released to you, Kept sends it straight to your PayPal account.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <PayoutStatus state={{ paypalEmail: user.paypalEmail, paypalVerified: user.paypalVerified, paypalPayerId: user.paypalPayerId }} />
              {waitingCount > 0 && (
                <div className="flex items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-700">
                  <Hourglass className="size-4 shrink-0" />
                  <span>
                    <b className="font-semibold">{formatMoney(Number(waiting?.cents ?? 0))}</b> in {waitingCount} payout{waitingCount === 1 ? " is" : "s are"} waiting for a payout email — they go
                    out the moment you save one.
                  </span>
                </div>
              )}
              <PayoutForm initialEmail={user.paypalEmail} />
              <VerifyWithPayPal enabled={verifyEnabled} verified={user.paypalVerified && Boolean(user.paypalPayerId)} />
              {isDemo && (
                <div className="flex items-start gap-2.5 rounded-xl border border-ember-100 bg-ember-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-ember-700">
                  <FlaskConical className="mt-0.5 size-4 shrink-0" />
                  <p>
                    <b className="font-semibold">Demo account.</b>{" "}
                    {env.paypal.demoPayoutEmail ? (
                      <>
                        Payouts in the demo go to Kept’s PayPal sandbox test account (<span className="font-mono">{env.paypal.demoPayoutEmail}</span>), whatever email you enter here — no
                        real money moves.
                      </>
                    ) : (
                      <>Payouts in the demo run against the PayPal sandbox (or Kept’s built-in simulator), so no real money moves.</>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Public track record</CardTitle>
              <CardDescription>Share it in proposals: kept promises, verdicts and payouts, verified by Kept.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} hue={user.avatarHue} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{user.name}</p>
                  <p className="truncate text-[12px] text-ink-3">@{user.handle}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-line bg-paper py-1 pl-3 pr-1">
                <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-2">{profileUrl.replace(/^https?:\/\//, "")}</code>
                <CopyButton text={profileUrl} label="Profile link copied" />
              </div>
              <Link href={`/u/${user.handle}`} className="flex items-center gap-1 text-[13px] font-medium text-jade-700 hover:underline">
                View public profile <ArrowUpRight className="size-3.5" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-line pt-2">
              <Row label="Email">{user.email}</Row>
              <Row label="Handle">@{user.handle}</Row>
              <Row label="Role">{user.role === "admin" ? <Badge tone="ink">Admin</Badge> : "Member"}</Row>
              <Row label="Sign-in">{[user.passwordHash ? "Password" : null, user.paypalPayerId ? "PayPal" : null, isDemo ? "Demo link" : null].filter(Boolean).join(" · ") || "—"}</Row>
              <Row label="Member since">{user.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</Row>
              {isDemo && (
                <Row label="Workspace">
                  <Badge tone="ember">Demo world</Badge>
                </Row>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
