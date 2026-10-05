import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { payments, type User } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { AppError, invalidState } from "@/lib/errors";
import { newId, newToken } from "@/lib/ids";
import { formatMoney } from "@/lib/money";
import { gatewayFor, getPayPal, type PayPalGateway } from "@/lib/paypal";
import { assertParty, casMilestone, loadMilestone } from "./context";
import { notify, recordEvent } from "./events";
import { quoteFunding } from "./fees";
import { postJournal } from "./ledger";
import { refreshPactStatus } from "./pacts";
import { assertTransition } from "./state";

export function quoteForMilestone(amountCents: number) {
  return quoteFunding(amountCents, {
    platformFeeBps: env.fees.platformFeeBps,
    platformFeeMinCents: env.fees.platformFeeMinCents,
    processingBps: 349,
    processingFixedCents: 49,
  });
}

/** Step 1 of PayPal Checkout: create an Orders v2 order for the milestone. */
export async function createFundingOrder(user: User, milestoneId: string, opts: { gateway?: PayPalGateway } = {}) {
  const { milestone, pact } = await loadMilestone(milestoneId);
  assertParty(user, pact, "client");
  assertTransition(milestone.status, "fund");

  const quote = quoteForMilestone(milestone.amountCents);
  const gateway = opts.gateway ?? getPayPal();
  const requestId = `kept-order-${milestoneId}-${newToken().slice(0, 10)}`;
  const order = await gateway.createOrder({
    milestoneId,
    pactId: pact.id,
    pactTitle: pact.title,
    milestoneTitle: milestone.title,
    currency: pact.currency,
    quote,
    requestId,
  });
  await db.insert(payments).values({
    id: newId("pay"),
    milestoneId,
    paypalOrderId: order.orderId,
    status: "created",
    milestoneCents: quote.milestoneCents,
    platformFeeCents: quote.platformFeeCents,
    processingFeeCents: quote.processingFeeCents,
    totalCents: quote.totalCents,
    simulated: gateway.mode === "simulator",
    raw: order.raw,
  });
  return { orderId: order.orderId, approveUrl: order.approveUrl, quote, mode: gateway.mode };
}

/**
 * Step 2: capture the approved order and move the money into escrow.
 *
 * Idempotent and race-safe: the browser's onApprove callback and PayPal's
 * PAYMENT.CAPTURE.COMPLETED webhook can both arrive; whichever is first wins
 * and the other becomes a no-op.
 */
export async function captureFunding(orderId: string, opts: { user?: User; source: "checkout" | "webhook" | "reconcile" }) {
  const [payment] = await db.select().from(payments).where(eq(payments.paypalOrderId, orderId)).limit(1);
  if (!payment) throw new AppError("not_found", "Unknown PayPal order");
  const { milestone, pact } = await loadMilestone(payment.milestoneId);
  if (opts.user) assertParty(opts.user, pact, "client");
  if (payment.status === "completed") return { milestone, pact, payment, alreadyCaptured: true };

  const gateway = gatewayFor(payment);
  const capture =
    opts.source === "checkout"
      ? await gateway.captureOrder(orderId, `kept-capture-${payment.id}`)
      : await gateway.getOrder(orderId);

  if (capture.status !== "COMPLETED" || !capture.captureId) {
    if (capture.status === "DECLINED" || capture.status === "FAILED") {
      await db.update(payments).set({ status: "failed", raw: capture.raw }).where(eq(payments.id, payment.id));
      await recordEvent(db, { pactId: pact.id, milestoneId: milestone.id, actorKind: "paypal", type: "payment.failed", message: "PayPal declined the payment. No money moved." });
    }
    throw new AppError("payment_failed", `PayPal payment is ${capture.status.toLowerCase()} — the milestone is not funded yet`);
  }
  if (capture.customId && capture.customId !== milestone.id) {
    throw new AppError("payment_failed", "Captured payment does not belong to this milestone");
  }
  if (capture.amountCents !== payment.totalCents) {
    throw new AppError("payment_failed", `Captured amount ${capture.amountCents} does not match expected ${payment.totalCents}`);
  }

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(payments)
      .set({
        status: "completed",
        paypalCaptureId: capture.captureId,
        paypalFeeCents: capture.paypalFeeCents,
        payerEmail: capture.payerEmail,
        payerId: capture.payerId,
        capturedAt: new Date(),
        raw: capture.raw,
      })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "created")))
      .returning();
    if (!updated) return { milestone, payment, alreadyCaptured: true };

    const funded = await casMilestone(tx, milestone.id, ["awaiting_funding"], { status: "funded", fundedAt: new Date() });

    // Cash in; the milestone amount is owed to the parties, the fee is ours,
    // the processing gross-up offsets what PayPal actually charged.
    await postJournal(tx, {
      pactId: pact.id,
      milestoneId: milestone.id,
      memo: `Escrow funded via PayPal capture ${capture.captureId}`,
      reference: capture.captureId!,
      demoWorkspace: pact.demoWorkspace,
      lines: [
        { account: "paypal_cash", amountCents: payment.totalCents },
        { account: "escrow_liability", amountCents: -payment.milestoneCents },
        { account: "fee_revenue", amountCents: -payment.platformFeeCents },
        { account: "processing_collected", amountCents: -payment.processingFeeCents },
      ],
    });
    if (capture.paypalFeeCents) {
      await postJournal(tx, {
        pactId: pact.id,
        milestoneId: milestone.id,
        memo: "PayPal processing fee (from seller_receivable_breakdown)",
        reference: capture.captureId!,
        demoWorkspace: pact.demoWorkspace,
        lines: [
          { account: "processing_expense", amountCents: capture.paypalFeeCents },
          { account: "paypal_cash", amountCents: -capture.paypalFeeCents },
        ],
      });
    }
    await recordEvent(tx, {
      pactId: pact.id,
      milestoneId: milestone.id,
      actorId: opts.user?.id,
      actorKind: opts.user ? "user" : "paypal",
      type: "milestone.funded",
      message: `${formatMoney(payment.milestoneCents, pact.currency)} is now held in escrow for “${milestone.title}”`,
      data: { orderId, captureId: capture.captureId, source: opts.source, simulated: payment.simulated },
    });
    await notify(tx, [pact.freelancerId], {
      pactId: pact.id,
      title: "Milestone funded — start work",
      body: `${formatMoney(payment.milestoneCents, pact.currency)} for “${milestone.title}” is secured in escrow.`,
    });
    return { milestone: funded, payment: updated, alreadyCaptured: false };
  });
  await refreshPactStatus(pact.id);
  return { ...result, pact };
}

export async function latestPayment(milestoneId: string) {
  const [p] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.milestoneId, milestoneId), eq(payments.status, "completed")))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  if (!p) throw invalidState("No completed payment found for this milestone");
  return p;
}
