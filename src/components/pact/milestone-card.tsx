import { CalendarDays, CheckCircle2, CircleDollarSign, Clock, ExternalLink, FileText, FolderGit2, Link2, Lock, Paperclip, Undo2 } from "lucide-react";
import { MilestoneStatusBadge } from "@/components/app/status";
import { Badge } from "@/components/ui/badge";
import type { PactDetail } from "@/lib/domain/queries";
import { formatMoney } from "@/lib/money";
import { ago } from "@/lib/time";
import { DisputePanel } from "./dispute-panel";
import { PayPalDisputeBanner, SimulatePayPalDisputeButton } from "./paypal-dispute";
import { FundPanel, type PayPalClientConfig } from "./fund-panel";
import { Countdown, RefereeWorking } from "./live";
import { FastForwardButton, RefundButton, ReviewActions } from "./review-actions";
import { SubmitWorkDialog } from "./submit-dialog";
import { CriterionRow, VerdictReport } from "./verdict-report";
import { quoteFunding } from "@/lib/domain/fees";

type M = PactDetail["milestones"][number];

function ArtifactChip({ a }: { a: M["submissions"][number]["artifacts"][number] }) {
  const Icon = a.kind === "url" ? Link2 : a.kind === "github" ? FolderGit2 : a.kind === "text" ? FileText : Paperclip;
  const href = a.kind === "url" || a.kind === "github" ? (a.content?.startsWith("http") ? a.content : `https://github.com/${a.content}`) : `/api/artifacts/${a.id}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-xs text-ink-2 hover:border-line-2 hover:text-ink">
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{a.name}</span>
      {(a.kind === "url" || a.kind === "github") && <ExternalLink className="size-3 shrink-0 text-ink-3" />}
    </a>
  );
}

export function MilestoneCard({
  m,
  index,
  detail,
  paypal,
  fees,
  demo,
}: {
  m: M;
  index: number;
  detail: PactDetail;
  paypal: PayPalClientConfig;
  fees: { platformFeeBps: number; platformFeeMinCents: number };
  demo: boolean;
}) {
  const role = detail.role;
  const verdict = m.verdicts[0] ?? null;
  const pact = detail.pact;
  const latest = m.submissions[0];
  const clientName = detail.client?.name ?? pact.counterpartyName ?? "Client";
  const freelancerName = detail.freelancer?.name ?? pact.counterpartyName ?? "Freelancer";
  const revisionsLeft = pact.terms.revisionsIncluded - m.revisionsUsed;
  const showVerdict = verdict && ["in_review", "disputed", "released", "settled", "refunded", "funded"].includes(m.status);

  return (
    <section id={m.id} className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-card shadow-card">
      <header className="flex flex-wrap items-start gap-4 border-b border-line px-6 py-5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-paper-2 text-[13px] font-semibold text-ink-2">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold tracking-tight">{m.title}</h3>
          {m.description && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">{m.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
            {m.dueAt && <span className="flex items-center gap-1"><CalendarDays className="size-3.5" /> Due {m.dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
            {m.revisionsUsed > 0 && <span>{m.revisionsUsed} revision{m.revisionsUsed === 1 ? "" : "s"} used</span>}
            {m.fundedAt && <span className="flex items-center gap-1"><Lock className="size-3.5" /> Funded {ago(m.fundedAt)}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="num text-[20px] font-semibold tracking-tight">{formatMoney(m.amountCents, pact.currency)}</span>
          <MilestoneStatusBadge status={m.status} />
        </div>
      </header>

      <div className="flex flex-col gap-5 px-6 py-5">
        {showVerdict ? (
          <VerdictReport verdict={verdict} criteria={m.criteria} viewerRole={role} />
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Acceptance criteria</p>
            <ul className="divide-y divide-line">
              {m.criteria.map((c, i) => (
                <CriterionRow key={c.id} criterion={c} index={i} />
              ))}
            </ul>
          </div>
        )}

        {/* Funding */}
        {m.status === "awaiting_funding" && role === "client" && (
          <FundPanel milestoneId={m.id} paypal={paypal} quote={quoteFunding(m.amountCents, { ...fees, processingBps: 349, processingFixedCents: 49 })} />
        )}
        {m.status === "awaiting_funding" && role === "freelancer" && (
          <Callout icon={<Clock />} tone="neutral" title={`Waiting for ${clientName} to fund this milestone`}>
            Don’t start yet. You’ll be notified the moment the money is secured in escrow.
          </Callout>
        )}

        {/* Working */}
        {m.status === "funded" && role === "freelancer" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-jade-100 bg-jade-50/60 p-5">
            <div>
              <p className="flex items-center gap-2 text-[14px] font-semibold text-jade-700"><Lock className="size-4" /> {formatMoney(m.amountCents)} is secured in escrow</p>
              <p className="mt-0.5 text-xs text-ink-3">{m.revisionsUsed > 0 ? "A revision was requested — see the activity feed for the client’s note." : "Deliver against the criteria above. Passing work is paid even if the client goes quiet."}</p>
            </div>
            <div className="flex items-center gap-2">
              <RefundButton milestoneId={m.id} amountCents={m.amountCents} />
              <SubmitWorkDialog milestoneId={m.id} milestoneTitle={m.title} demo={demo} revision={m.revisionsUsed > 0} />
            </div>
          </div>
        )}
        {m.status === "funded" && role === "client" && (
          <Callout icon={<Lock />} tone="jade" title={`${freelancerName} is working on it`}>
            Your {formatMoney(m.amountCents)} is held in escrow. You’ll review the delivery — with the AI referee’s report — before anything is released.
          </Callout>
        )}

        {m.status === "submitted" && <RefereeWorking since={m.submittedAt?.toISOString() ?? null} />}

        {/* Review */}
        {m.status === "in_review" && verdict && (
          <div className="flex flex-col gap-3 rounded-2xl border border-sky-100 bg-sky-50/40 p-5">
            <p className="text-[13px] text-ink-2">
              {m.reviewDeadlineAt && (
                <Countdown
                  to={m.reviewDeadlineAt.toISOString()}
                  prefix={verdict.overall === "pass" && !verdict.injectionDetected ? "If there’s no response, the payment is released automatically in" : "If there’s no response, AI mediation opens automatically in"}
                />
              )}
            </p>
            {role === "client" ? (
              <ReviewActions milestoneId={m.id} amountCents={m.amountCents} freelancerName={freelancerName} revisionsLeft={revisionsLeft} canRevise={revisionsLeft > 0} />
            ) : (
              <p className="text-[13px] text-ink-3">Waiting for {clientName} to review. You can’t be ghosted: passing work is released when the window closes.</p>
            )}
            {demo && <div><FastForwardButton milestoneId={m.id} hours={pact.terms.reviewWindowHours} /></div>}
          </div>
        )}

        {m.status === "disputed" && m.dispute && (
          <DisputePanel dispute={m.dispute} amountCents={m.amountCents} role={role} clientName={clientName} freelancerName={freelancerName} />
        )}

        {/* Outcome receipt */}
        {["released", "settled", "refunded"].includes(m.status) && (
          <div className="rounded-2xl border border-line bg-paper/60 p-5">
            <p className="flex items-center gap-2 text-[14px] font-semibold">
              <CheckCircle2 className="size-4 text-jade-600" />
              {m.status === "released" ? "Released in full" : m.status === "refunded" ? "Refunded to the client" : `Settled ${m.releasedPct}/${100 - (m.releasedPct ?? 0)}`}
              {m.resolvedAt && <span className="text-xs font-normal text-ink-3">· {ago(m.resolvedAt)}</span>}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {m.payout && (
                <Receipt icon={<CircleDollarSign />} title="PayPal Payout to freelancer" amount={m.payout.amountCents} lines={[`Status: ${m.payout.status}`, m.payout.paypalBatchId ? `Batch ${m.payout.paypalBatchId}` : "Awaiting payout details", m.payout.receiverEmail ? `To ${m.payout.receiverEmail}` : "", m.payout.simulated ? "Simulated" : ""]} />
              )}
              {m.refund && (
                <Receipt icon={<Undo2 />} title="PayPal refund to client" amount={m.refund.amountCents} lines={[`Status: ${m.refund.status}`, m.refund.paypalRefundId ? `Refund ${m.refund.paypalRefundId}` : "", m.refund.simulated ? "Simulated" : ""]} />
              )}
            </div>
          </div>
        )}

        {/* Deliveries */}
        {latest && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
              Delivery v{latest.version} · {ago(latest.createdAt)}
              {m.submissions.length > 1 && <span className="ml-1 normal-case tracking-normal">({m.submissions.length} versions)</span>}
            </p>
            {latest.note && <p className="mb-2 text-[13px] italic text-ink-2">“{latest.note}”</p>}
            <div className="flex flex-wrap gap-2">
              {latest.artifacts.map((a) => <ArtifactChip key={a.id} a={a} />)}
            </div>
          </div>
        )}

        {m.payment?.paypalDispute && <PayPalDisputeBanner info={m.payment.paypalDispute} />}
        {demo && m.payment?.paypalCaptureId && !m.payment.paypalDispute && ["in_review", "released", "settled", "funded"].includes(m.status) && (
          <div><SimulatePayPalDisputeButton milestoneId={m.id} /></div>
        )}

        {m.payment && (
          <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-ink-3">
            <Badge tone="neutral" className="py-0 text-[10px]">PayPal</Badge>
            Order <span className="font-mono">{m.payment.paypalOrderId}</span>
            {m.payment.paypalCaptureId && <>· capture <span className="font-mono">{m.payment.paypalCaptureId}</span></>}
            {m.payment.payerEmail && <>· paid by {m.payment.payerEmail}</>}
            {m.payment.simulated && <>· simulated</>}
          </p>
        )}
      </div>
    </section>
  );
}

function Callout({ icon, title, children, tone }: { icon: React.ReactNode; title: string; children: React.ReactNode; tone: "neutral" | "jade" }) {
  return (
    <div className={`flex gap-3 rounded-2xl border p-5 ${tone === "jade" ? "border-jade-100 bg-jade-50/50" : "border-line bg-paper/60"}`}>
      <span className={`mt-0.5 [&_svg]:size-4 ${tone === "jade" ? "text-jade-600" : "text-ink-3"}`}>{icon}</span>
      <div>
        <p className="text-[14px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">{children}</p>
      </div>
    </div>
  );
}

function Receipt({ icon, title, amount, lines }: { icon: React.ReactNode; title: string; amount: number; lines: string[] }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-ink-3 [&_svg]:size-3.5">{icon} {title}</p>
      <p className="num mt-1 text-[18px] font-semibold">{formatMoney(amount)}</p>
      {lines.filter(Boolean).map((l) => (
        <p key={l} className="truncate font-mono text-[11px] text-ink-3">{l}</p>
      ))}
    </div>
  );
}
