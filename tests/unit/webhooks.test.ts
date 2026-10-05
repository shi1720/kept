import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { ensureMigrated } from "@/lib/db/migrate";
import { webhookEvents } from "@/lib/db/schema";
import * as chargebacks from "@/lib/domain/chargebacks";
import { handlePayPalWebhook, type PayPalWebhookEvent } from "@/lib/domain/webhooks";

beforeAll(() => ensureMigrated());

const disputeEvent = (id: string) =>
  ({ id, event_type: "CUSTOMER.DISPUTE.CREATED", resource: { id: `PP-D-${id}`, disputed_transactions: [] } }) as unknown as PayPalWebhookEvent;

describe("PayPal webhook handling", () => {
  it("ignores unverified events without recording them", async () => {
    expect(await handlePayPalWebhook(disputeEvent("WH-unverified"), false)).toEqual({ ignored: "unverified" });
    expect(await db.select().from(webhookEvents).where(eq(webhookEvents.paypalEventId, "WH-unverified"))).toHaveLength(0);
  });

  it("processes a verified event once and acknowledges redeliveries as duplicates", async () => {
    const spy = vi.spyOn(chargebacks, "onPayPalDispute").mockResolvedValue(undefined as never);
    expect(await handlePayPalWebhook(disputeEvent("WH-once"), true)).toEqual({ processed: true });
    expect(await handlePayPalWebhook(disputeEvent("WH-once"), true)).toEqual({ duplicate: true });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("re-processes PayPal's retry of an event whose first attempt failed", async () => {
    const spy = vi.spyOn(chargebacks, "onPayPalDispute").mockRejectedValueOnce(new Error("database unavailable")).mockResolvedValue(undefined as never);
    await expect(handlePayPalWebhook(disputeEvent("WH-retry"), true)).rejects.toThrow("database unavailable");
    const [failed] = await db.select().from(webhookEvents).where(eq(webhookEvents.paypalEventId, "WH-retry"));
    expect(failed.processedAt).toBeNull();
    expect(failed.error).toMatch(/unavailable/);

    expect(await handlePayPalWebhook(disputeEvent("WH-retry"), true)).toEqual({ processed: true });
    const [done] = await db.select().from(webhookEvents).where(eq(webhookEvents.paypalEventId, "WH-retry"));
    expect(done.processedAt).not.toBeNull();
    expect(done.error).toBeNull();
    expect(await handlePayPalWebhook(disputeEvent("WH-retry"), true)).toEqual({ duplicate: true });
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
