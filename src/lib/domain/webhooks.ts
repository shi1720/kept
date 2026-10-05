import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { payments, payouts, refunds, webhookEvents } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { loadMilestone } from "./context";
import { recordEvent } from "./events";
import { captureFunding } from "./funding";

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type?: string;
  summary?: string;
  resource: Record<string, unknown> & {
    id?: string;
    status?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
    payout_item_id?: string;
    payout_batch_id?: string;
    transaction_status?: string;
    batch_header?: { payout_batch_id?: string; batch_status?: string };
  };
}

/**
 * Process a verified PayPal webhook exactly once. PayPal retries deliveries
 * for up to 3 days, so events are de-duplicated on their id.
 */
export async function handlePayPalWebhook(event: PayPalWebhookEvent, verified: boolean) {
  const [inserted] = await db
    .insert(webhookEvents)
    .values({
      id: newId("whk"),
      paypalEventId: event.id,
      eventType: event.event_type,
      resourceId: event.resource?.id ?? null,
      verified,
      payload: event,
    })
    .onConflictDoNothing()
    .returning();
  if (!inserted) return { duplicate: true };
  if (!verified) return { ignored: "unverified" };

  try {
    await dispatch(event);
    await db.update(webhookEvents).set({ processedAt: new Date() }).where(eq(webhookEvents.id, inserted.id));
    return { processed: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(webhookEvents).set({ error: message }).where(eq(webhookEvents.id, inserted.id));
    throw err;
  }
}

async function dispatch(event: PayPalWebhookEvent) {
  const r = event.resource;
  switch (event.event_type) {
    // Buyer approved but the browser never called onApprove (closed tab, lost
    // connection): capture server-side so the money still lands in escrow.
    case "CHECKOUT.ORDER.APPROVED": {
      if (r.id && (await knownOrder(r.id))) await captureFunding(r.id, { source: "checkout" }).catch(ignoreState);
      return;
    }
    case "PAYMENT.CAPTURE.COMPLETED": {
      const orderId = r.supplementary_data?.related_ids?.order_id;
      if (orderId && (await knownOrder(orderId))) await captureFunding(orderId, { source: "webhook" }).catch(ignoreState);
      return;
    }
    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.REVERSED": {
      const orderId = r.supplementary_data?.related_ids?.order_id;
      const [p] = orderId ? await db.select().from(payments).where(eq(payments.paypalOrderId, orderId)).limit(1) : [];
      if (p) {
        const { pact } = await loadMilestone(p.milestoneId);
        await recordEvent(db, {
          pactId: pact.id,
          milestoneId: p.milestoneId,
          actorKind: "paypal",
          type: "payment.reversed",
          message: `PayPal reported ${event.event_type.split(".").pop()?.toLowerCase()} on the escrow payment — flagged for review`,
          data: { eventId: event.id },
        });
      }
      return;
    }
    case "PAYMENT.CAPTURE.REFUNDED": {
      // The resource is the refund itself.
      if (r.id) await db.update(refunds).set({ status: r.status ?? "COMPLETED" }).where(eq(refunds.paypalRefundId, r.id));
      return;
    }
    default: {
      if (event.event_type.startsWith("PAYMENT.PAYOUTS-ITEM.") && r.payout_batch_id) {
        await db
          .update(payouts)
          .set({ status: r.transaction_status ?? event.event_type.split(".").pop()!, paypalItemId: r.payout_item_id, updatedAt: new Date() })
          .where(eq(payouts.paypalBatchId, r.payout_batch_id));
      } else if (event.event_type.startsWith("PAYMENT.PAYOUTSBATCH.") && r.batch_header?.payout_batch_id) {
        const [p] = await db.select().from(payouts).where(eq(payouts.paypalBatchId, r.batch_header.payout_batch_id)).limit(1);
        // Batch status is only informative; item-level status wins when we have it.
        if (p && ["QUEUED", "PENDING", "PROCESSING"].includes(p.status) && r.batch_header.batch_status === "DENIED") {
          await db.update(payouts).set({ status: "FAILED", updatedAt: new Date() }).where(eq(payouts.id, p.id));
        }
      }
    }
  }
}

async function knownOrder(orderId: string) {
  const [p] = await db.select({ id: payments.id }).from(payments).where(eq(payments.paypalOrderId, orderId)).limit(1);
  return Boolean(p);
}

function ignoreState(err: unknown) {
  // Another path (browser capture) already moved the milestone — that's fine.
  if (err instanceof Error && /updated by someone else|not funded yet/.test(err.message)) return;
  throw err;
}
