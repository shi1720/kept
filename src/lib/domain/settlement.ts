import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { payouts, payments, refunds, type MilestoneStatus, type Payout, type Refund } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { newId } from "@/lib/ids";
import { formatMoney, splitByPct } from "@/lib/money";
import { gatewayFor } from "@/lib/paypal";
import { casMilestone, loadMilestone, loadUser } from "./context";
import { notify, recordEvent, type ActorKind } from "./events";
import { postJournal } from "./ledger";
import { refreshPactStatus } from "./pacts";
import { settledStatus } from "./state";

export interface SettleOptions {
  from: MilestoneStatus[];
  actorId?: string | null;
  actorKind: ActorKind;
  reason: string;
}

/**
 * Resolve a funded milestone: `releasePct` of the escrowed amount goes to the
 * freelancer via PayPal Payouts, the rest is refunded to the client against
 * the original PayPal capture. The status flip is a compare-and-set, so the
 * same milestone can never be paid out twice.
 */
export async function settleMilestone(milestoneId: string, releasePct: number, opts: SettleOptions) {
  const { milestone, pact } = await loadMilestone(milestoneId);
  const pct = Math.round(Math.min(100, Math.max(0, releasePct)));
  const [toFreelancer, toClient] = splitByPct(milestone.amountCents, pct);
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.milestoneId, milestoneId), eq(payments.status, "completed")))
    .limit(1);
  if (!payment) throw new Error("Milestone has no completed payment to settle");

  const freelancer = await loadUser(pact.freelancerId);
  const receiver =
    (freelancer?.demoWorkspace && env.paypal.demoPayoutEmail) || freelancer?.paypalEmail || null;

  const { payoutRow, refundRow } = await db.transaction(async (tx) => {
    await casMilestone(tx, milestoneId, opts.from, {
      status: settledStatus(pct),
      releasedPct: pct,
      resolvedAt: new Date(),
    });
    let payoutRow: Payout | null = null;
    let refundRow: Refund | null = null;
    if (toFreelancer > 0) {
      [payoutRow] = await tx
        .insert(payouts)
        .values({
          id: newId("pyo"),
          milestoneId,
          senderBatchId: `kept-${milestoneId}`,
          receiverEmail: receiver ?? "",
          amountCents: toFreelancer,
          status: receiver ? "QUEUED" : "NEEDS_PAYOUT_EMAIL",
        })
        .returning();
    }
    if (toClient > 0) {
      [refundRow] = await tx
        .insert(refunds)
        .values({ id: newId("rfd"), paymentId: payment.id, milestoneId, amountCents: toClient, status: "QUEUED", reason: opts.reason })
        .returning();
    }
    const message =
      pct === 100
        ? `${formatMoney(toFreelancer, pact.currency)} released to the freelancer — ${opts.reason}`
        : pct === 0
          ? `${formatMoney(toClient, pact.currency)} refunded to the client — ${opts.reason}`
          : `Settled ${pct}/${100 - pct}: ${formatMoney(toFreelancer, pact.currency)} to the freelancer, ${formatMoney(toClient, pact.currency)} back to the client — ${opts.reason}`;
    await recordEvent(tx, {
      pactId: pact.id,
      milestoneId,
      actorId: opts.actorId,
      actorKind: opts.actorKind,
      type: pct === 100 ? "milestone.released" : pct === 0 ? "milestone.refunded" : "milestone.settled",
      message,
      data: { releasePct: pct, toFreelancer, toClient },
    });
    await notify(tx, [pact.clientId, pact.freelancerId], { pactId: pact.id, title: `“${milestone.title}” resolved`, body: message });
    return { payoutRow, refundRow };
  });

  // Money movement happens outside the DB transaction; failures are recorded
  // on the row and retried by the sweeper, never silently dropped.
  if (payoutRow && payoutRow.status === "QUEUED") await executePayout(payoutRow.id);
  if (refundRow) await executeRefund(refundRow.id);
  await refreshPactStatus(pact.id);
}

export async function executePayout(payoutId: string) {
  const [p] = await db.select().from(payouts).where(eq(payouts.id, payoutId)).limit(1);
  if (!p || !["QUEUED", "FAILED"].includes(p.status)) return p;
  const { milestone, pact } = await loadMilestone(p.milestoneId);
  const [funding] = await db
    .select({ simulated: payments.simulated })
    .from(payments)
    .where(and(eq(payments.milestoneId, p.milestoneId), inArray(payments.status, ["completed", "partially_refunded", "refunded"])))
    .limit(1);
  // Escrow funded through the simulator (seeded demo history) settles through it too.
  const gateway = gatewayFor({ simulated: funding?.simulated ?? false });
  try {
    const res = await gateway.createPayout({
      senderBatchId: p.senderBatchId,
      senderItemId: p.milestoneId,
      receiverEmail: p.receiverEmail,
      amountCents: p.amountCents,
      currency: pact.currency,
      subject: `You've been paid for “${milestone.title}”`,
      note: `Released from Kept escrow for “${pact.title}”. Promise kept.`,
    });
    const status = res.itemStatus ?? res.status;
    await db.transaction(async (tx) => {
      await tx
        .update(payouts)
        .set({
          paypalBatchId: res.batchId,
          paypalItemId: res.itemId,
          status,
          feeCents: res.feeCents,
          simulated: gateway.mode === "simulator",
          raw: res.raw,
          updatedAt: new Date(),
        })
        .where(eq(payouts.id, p.id));
      await postJournal(tx, {
        pactId: pact.id,
        milestoneId: milestone.id,
        memo: `PayPal payout ${res.batchId} to freelancer`,
        reference: res.batchId,
        demoWorkspace: pact.demoWorkspace,
        lines: [
          { account: "escrow_liability", amountCents: p.amountCents },
          { account: "paypal_cash", amountCents: -p.amountCents },
        ],
      });
      if (res.feeCents) {
        await postJournal(tx, {
          pactId: pact.id,
          milestoneId: milestone.id,
          memo: "PayPal payout fee",
          reference: res.batchId,
          demoWorkspace: pact.demoWorkspace,
          lines: [
            { account: "payout_expense", amountCents: res.feeCents },
            { account: "paypal_cash", amountCents: -res.feeCents },
          ],
        });
      }
      await recordEvent(tx, {
        pactId: pact.id,
        milestoneId: milestone.id,
        actorKind: "paypal",
        type: "payout.sent",
        message: `PayPal payout ${status === "SUCCESS" ? "delivered" : "initiated"}: ${formatMoney(p.amountCents, pact.currency)} → ${p.receiverEmail}`,
        data: { batchId: res.batchId, itemId: res.itemId, status },
      });
    });
  } catch (err) {
    // A duplicate sender_batch_id means a previous attempt actually reached PayPal.
    const msg = err instanceof Error ? err.message : String(err);
    // PayPal refuses a reused sender_batch_id for 30 days: an earlier attempt reached PayPal even
    // though we never saw the response. Never retry blindly — flag it for reconciliation.
    const duplicate = /sender_batch_id.*already|DUPLICATE/i.test(msg);
    await db
      .update(payouts)
      .set({ status: duplicate ? "NEEDS_RECONCILIATION" : "FAILED", raw: { error: msg }, updatedAt: new Date() })
      .where(eq(payouts.id, p.id));
    await recordEvent(db, {
      pactId: pact.id,
      milestoneId: milestone.id,
      actorKind: "paypal",
      type: "payout.failed",
      message: duplicate
        ? "PayPal reports this payout batch already exists — flagged for reconciliation instead of paying twice"
        : `Payout attempt failed and will be retried automatically: ${msg}`,
    });
  }
}

export async function executeRefund(refundId: string) {
  const [r] = await db.select().from(refunds).where(eq(refunds.id, refundId)).limit(1);
  if (!r || !["QUEUED", "FAILED"].includes(r.status)) return;
  const [payment] = await db.select().from(payments).where(eq(payments.id, r.paymentId)).limit(1);
  const { milestone, pact } = await loadMilestone(r.milestoneId);
  const gateway = gatewayFor(payment);
  try {
    const res = await gateway.refundCapture({
      captureId: payment.paypalCaptureId!,
      amountCents: r.amountCents,
      currency: pact.currency,
      note: `Refund from Kept escrow for “${milestone.title}”: ${r.reason}`,
      requestId: `kept-refund-${r.id}`,
    });
    await db.transaction(async (tx) => {
      await tx
        .update(refunds)
        .set({ paypalRefundId: res.refundId, status: res.status, simulated: gateway.mode === "simulator", raw: res.raw })
        .where(eq(refunds.id, r.id));
      const refunded = payment.refundedCents + r.amountCents;
      await tx
        .update(payments)
        .set({ refundedCents: refunded, status: refunded >= payment.totalCents ? "refunded" : "partially_refunded" })
        .where(eq(payments.id, payment.id));
      await postJournal(tx, {
        pactId: pact.id,
        milestoneId: milestone.id,
        memo: `PayPal refund ${res.refundId} to client`,
        reference: res.refundId,
        demoWorkspace: pact.demoWorkspace,
        lines: [
          { account: "escrow_liability", amountCents: r.amountCents },
          { account: "paypal_cash", amountCents: -r.amountCents },
        ],
      });
      await recordEvent(tx, {
        pactId: pact.id,
        milestoneId: milestone.id,
        actorKind: "paypal",
        type: "refund.sent",
        message: `PayPal refund ${res.status.toLowerCase()}: ${formatMoney(r.amountCents, pact.currency)} back to the client`,
        data: { refundId: res.refundId, captureId: payment.paypalCaptureId },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.update(refunds).set({ status: "FAILED", raw: { error: msg } }).where(eq(refunds.id, r.id));
    await recordEvent(db, {
      pactId: pact.id,
      milestoneId: milestone.id,
      actorKind: "paypal",
      type: "refund.failed",
      message: `Refund attempt failed and will be retried automatically: ${msg}`,
    });
  }
}

/** Called when a freelancer adds a payout email after funds were released. */
export async function retryPayoutsForFreelancer(freelancerId: string, email: string) {
  const rows = await db
    .select({ payout: payouts, pact: { freelancerId: payouts.milestoneId } })
    .from(payouts)
    .where(eq(payouts.status, "NEEDS_PAYOUT_EMAIL"));
  for (const { payout } of rows) {
    const { pact } = await loadMilestone(payout.milestoneId);
    if (pact.freelancerId !== freelancerId) continue;
    await db.update(payouts).set({ receiverEmail: email, status: "QUEUED", updatedAt: new Date() }).where(eq(payouts.id, payout.id));
    await executePayout(payout.id);
  }
}

/** Sweeper hook: retry failed money movement and refresh in-flight payout statuses. */
export async function reconcileMoneyMovement() {
  const stale = new Date(Date.now() - 60_000);
  const failedPayouts = await db.select().from(payouts).where(and(inArray(payouts.status, ["QUEUED", "FAILED"]), lt(payouts.updatedAt, stale)));
  for (const p of failedPayouts) await executePayout(p.id);
  const failedRefunds = await db.select().from(refunds).where(inArray(refunds.status, ["QUEUED", "FAILED"]));
  for (const r of failedRefunds) await executeRefund(r.id);

  const inflight = await db.select().from(payouts).where(inArray(payouts.status, ["PENDING", "PROCESSING", "ONHOLD"]));
  for (const p of inflight) {
    if (!p.paypalBatchId) continue;
    try {
      const res = await gatewayFor({ simulated: p.simulated }).getPayoutBatch(p.paypalBatchId);
      const status = res.itemStatus ?? res.status;
      if (status !== p.status) {
        await db.update(payouts).set({ status, paypalItemId: res.itemId, raw: res.raw, updatedAt: new Date() }).where(eq(payouts.id, p.id));
      }
    } catch {
      /* try again next sweep */
    }
  }
}
