import { AlertOctagon, ArrowLeft, Bot, FileSignature, ScrollText, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PactStatusBadge } from "@/components/app/status";
import { Timeline } from "@/components/app/timeline";
import { Seal } from "@/components/brand/seal";
import { MilestoneCard } from "@/components/pact/milestone-card";
import { ReturnCapture } from "@/components/pact/return-capture";
import { CancelPactButton, CopyInvite, EditPactLink, SendPactButton } from "@/components/pact/pact-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/session";
import { getPactDetail, type PublicUser } from "@/lib/domain/queries";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import { getPayPal } from "@/lib/paypal";

export const metadata: Metadata = { title: "Pact" };

async function load(id: string) {
  const user = await requireUser();
  try {
    return { user, detail: await getPactDetail(user, id) };
  } catch (err) {
    if (err instanceof AppError && (err.code === "not_found" || err.code === "forbidden")) notFound();
    throw err;
  }
}

function Party({ user, fallback, role, signedAt }: { user: PublicUser | null; fallback: string | null; role: string; signedAt: Date | null }) {
  const name = user?.name ?? fallback ?? "Not yet joined";
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} hue={user?.avatarHue ?? 40} size={40} />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{role}</p>
        {user ? (
          <Link href={`/u/${user.handle}`} className="block truncate text-[14px] font-medium hover:underline">{name}</Link>
        ) : (
          <p className="truncate text-[14px] font-medium text-ink-2">{name}</p>
        )}
        <p className="text-[11px] text-ink-3">{signedAt ? `Signed ${signedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Not signed yet"}</p>
      </div>
    </div>
  );
}

export default async function PactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paypal?: string; token?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { user, detail } = await load(id);
  const { pact, milestones, totals, role, isCreator } = detail;
  const gateway = getPayPal();
  const paypal = { mode: gateway.mode, clientId: env.paypal.clientId, sdk: (process.env.PAYPAL_JS_SDK === "v5" ? "v5" : "v6") as "v5" | "v6" };
  const sealed = Boolean(pact.clientSignedAt && pact.freelancerSignedAt);
  const lastSignature = Math.max(pact.clientSignedAt?.getTime() ?? 0, pact.freelancerSignedAt?.getTime() ?? 0);
  // eslint-disable-next-line react-hooks/purity -- server component: evaluated once per request
  const justSealed = sealed && Date.now() - lastSignature < 90_000;
  const demo = Boolean(pact.demoWorkspace && pact.demoWorkspace === user.demoWorkspace);
  const done = milestones.filter((m) => ["released", "settled", "refunded", "cancelled"].includes(m.status)).length;
  const inviteUrl = `${env.appUrl}/invite/${pact.inviteToken}`;
  // Returned from a PayPal approval link (redirect flow): capture that order.
  const returning =
    sp.paypal === "return" && sp.token && role === "client"
      ? milestones.find((m) => m.status === "awaiting_funding" && m.pendingOrderIds.includes(sp.token!))
      : undefined;

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <Link href="/app" className="flex w-fit items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft className="size-3.5" /> All pacts</Link>
      {returning && <ReturnCapture milestoneId={returning.id} orderId={sp.token!} pactId={pact.id} />}
      {sp.paypal === "cancel" && (
        <p className="rounded-2xl border border-line bg-paper-2 px-5 py-3 text-[13px] text-ink-2">PayPal checkout was cancelled — nothing was charged.</p>
      )}

      {/* Contract header */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-card shadow-card">
        <div className="grain absolute inset-0 opacity-40" />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PactStatusBadge status={pact.status} />
              {pact.createdVia === "mcp" && <Badge tone="sky"><Bot /> Drafted by an AI agent</Badge>}
              <span className="font-mono text-[11px] text-ink-3">{pact.id}</span>
            </div>
            <h1 className="display mt-3 text-[38px] sm:text-[46px]">{pact.title}</h1>
            {pact.summary && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">{pact.summary}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-4">
              <Party user={detail.client} fallback={pact.creatorRole === "freelancer" ? pact.counterpartyName : null} role="Client" signedAt={pact.clientSignedAt} />
              <span className="hidden h-8 w-px bg-line sm:block" />
              <Party user={detail.freelancer} fallback={pact.creatorRole === "client" ? pact.counterpartyName : null} role="Freelancer" signedAt={pact.freelancerSignedAt} />
            </div>
          </div>
          {sealed && (
            <div className="hidden flex-col items-center justify-center gap-2 lg:flex">
              <Seal
                size={104}
                label={pact.status === "completed" ? "KEPT" : "SEALED"}
                tone={pact.status === "completed" ? "jade" : "ember"}
                className={justSealed ? "animate-stamp" : undefined}
              />
              <span className="text-[11px] uppercase tracking-[0.2em] text-ink-3">{pact.status === "completed" ? "Promise kept" : "Signed by both"}</span>
            </div>
          )}
        </div>
        <div className="relative grid grid-cols-2 border-t border-line sm:grid-cols-4">
          {[
            { label: "Total value", value: totals.amountCents, cls: "" },
            { label: "Held in escrow", value: totals.heldCents, cls: "text-amber-700" },
            { label: "Released", value: totals.releasedCents, cls: "text-jade-700" },
            { label: "Refunded", value: totals.refundedCents, cls: "text-ink-2" },
          ].map((s, i) => (
            <div key={s.label} className={`px-6 py-4 ${i > 0 ? "sm:border-l" : ""} ${i % 2 ? "border-l" : ""} border-line ${i > 1 ? "border-t sm:border-t-0" : ""}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{s.label}</p>
              <p className={`num mt-1 text-[20px] font-semibold ${s.cls}`}>{formatMoney(s.value, pact.currency)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Draft / signature banner */}
      {(pact.status === "draft" || pact.status === "pending_acceptance") && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-ember-100 bg-ember-50/60 p-5">
          <FileSignature className="size-5 text-ember-600" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold">{pact.status === "draft" ? "This pact is a draft" : isCreator ? "Waiting for the other party to countersign" : "This pact needs your signature"}</p>
            <p className="text-[13px] text-ink-3">
              {pact.status === "draft"
                ? "Review the milestones and criteria below. When it looks right, sign it and share the link."
                : isCreator
                  ? "Share this link. Once they countersign, the client can fund milestone 1 with PayPal."
                  : "Open your invitation to review and countersign."}
            </p>
          </div>
          {isCreator && pact.status === "draft" && (
            <div className="flex flex-wrap gap-2">
              <EditPactLink pactId={pact.id} />
              <SendPactButton pactId={pact.id} />
            </div>
          )}
          {isCreator && pact.status === "pending_acceptance" && <div className="w-full max-w-md"><CopyInvite url={inviteUrl} /></div>}
          {!isCreator && pact.status === "pending_acceptance" && (
            <Link href={`/invite/${pact.inviteToken}`} className="text-[13px] font-medium text-jade-700 hover:underline">Review & countersign →</Link>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Milestones</h2>
            <div className="flex w-48 items-center gap-2 text-xs text-ink-3">
              <Progress value={milestones.length ? (done / milestones.length) * 100 : 0} />
              <span className="num shrink-0">{done}/{milestones.length}</span>
            </div>
          </div>
          {milestones.map((m, i) => (
            <MilestoneCard key={m.id} m={m} index={i} detail={detail} paypal={paypal} fees={env.fees} demo={demo} />
          ))}
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ScrollText className="size-4 text-ink-3" /> Terms</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-[13px]">
              <Term label="Revisions included" value={`${pact.terms.revisionsIncluded}`} />
              <Term label="Client review window" value={`${pact.terms.reviewWindowHours} hours, then auto-resolve`} />
              <Term label="Ownership" value={pact.terms.ipTransfer} />
              {pact.terms.communication && <Term label="Communication" value={pact.terms.communication} />}
              <Term label="Disputes" value="AI mediation, then human arbitration if either party rejects" />
            </CardContent>
          </Card>

          {pact.ambiguities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-ember-600" /> Contract linter</CardTitle>
                {pact.clarityScore != null && (
                  <p className="text-xs text-ink-3">The original brief scored <b className="text-ink">{pact.clarityScore}/100</b> for clarity. Kept tightened {pact.ambiguities.length} dispute-prone phrase{pact.ambiguities.length === 1 ? "" : "s"}:</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {pact.ambiguities.map((a, i) => (
                  <div key={i} className="text-[12.5px] leading-relaxed">
                    <p><span className="rounded bg-rose-50 px-1 text-rose-700 line-through decoration-rose-300">{a.quote}</span></p>
                    <p className="mt-0.5 text-ink-2">→ {a.suggestion}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {pact.riskFlags.length > 0 && (
            <Card className="border-rose-100">
              <CardHeader><CardTitle className="flex items-center gap-2 text-rose-700"><AlertOctagon className="size-4" /> Risk flags</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                {pact.riskFlags.map((r, i) => (
                  <div key={i} className="text-[12.5px]">
                    <Badge tone={r.severity === "high" ? "rose" : r.severity === "medium" ? "amber" : "neutral"} className="mb-1">{r.severity}</Badge>
                    <p className="font-medium">{r.signal}</p>
                    <p className="text-ink-3">{r.explanation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
            <CardContent className="max-h-[560px] overflow-y-auto">
              <Timeline events={detail.events} />
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 px-1 text-[11.5px] leading-relaxed text-ink-3">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-jade-600" />
            Payments, payouts and refunds run on PayPal ({gateway.mode}). Every money movement is double-entry booked and listed above.
          </div>
          {isCreator && ["draft", "pending_acceptance"].includes(pact.status) && <CancelPactButton pactId={pact.id} />}
          {role && pact.status === "active" && milestones.every((m) => ["awaiting_funding", "cancelled"].includes(m.status)) && <CancelPactButton pactId={pact.id} />}
        </aside>
      </div>
    </div>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-0.5 text-ink-2">{value}</p>
    </div>
  );
}
