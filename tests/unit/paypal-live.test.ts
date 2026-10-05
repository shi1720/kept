/**
 * Contract tests for the live PayPal gateway (Orders v2 via the Server SDK, Payments v2 refunds,
 * Payouts v1 and webhook verification over REST), with PayPal's sandbox API mocked at the HTTP
 * layer. They pin the request shapes Kept sends and how it reads PayPal's responses.
 */
import nock from "nock";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { LivePayPalGateway } from "@/lib/paypal/live";

const API = "https://api-m.sandbox.paypal.com";
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- captured request bodies are inspected loosely
type Body = Record<string, any>;
let gw: LivePayPalGateway;

beforeAll(async () => {
  process.env.PAYPAL_CLIENT_ID = "test-client";
  process.env.PAYPAL_CLIENT_SECRET = "test-secret";
  process.env.PAYPAL_ENV = "sandbox";
  process.env.PAYPAL_WEBHOOK_ID = "WH-CONFIG-1";
  nock.disableNetConnect();
  const { LivePayPalGateway } = await import("@/lib/paypal/live");
  gw = new LivePayPalGateway();
});

afterEach(() => {
  expect(nock.pendingMocks()).toEqual([]);
  nock.cleanAll();
});

afterAll(() => nock.enableNetConnect());

const token = () =>
  nock(API).post("/v1/oauth2/token").optionally().reply(200, { access_token: "A21-test", token_type: "Bearer", expires_in: 32400 });

const quote = { milestoneCents: 30000, platformFeeCents: 870, processingFeeCents: 1167, totalCents: 32037 };

describe("LivePayPalGateway (sandbox contract)", () => {
  it("creates an order with the milestone and one protection-fee line, idempotently", async () => {
    token();
    let body: Body = {};
    const scope = nock(API)
      .post("/v2/checkout/orders", (b) => ((body = b), true))
      .matchHeader("paypal-request-id", "kept-order-req-1")
      .reply(201, { id: "5O190127TN364715T", status: "CREATED", links: [{ rel: "payer-action", href: "https://www.sandbox.paypal.com/checkoutnow?token=5O1" }] });

    const order = await gw.createOrder({
      milestoneId: "mst_1",
      pactId: "pct_1",
      pactTitle: "Holiday Blend packaging",
      milestoneTitle: "Two concepts",
      quote,
      currency: "USD",
      requestId: "kept-order-req-1",
      flow: "redirect",
    } as never);

    scope.done();
    expect(order).toMatchObject({ orderId: "5O190127TN364715T", approveUrl: expect.stringContaining("checkoutnow") });
    const unit = body.purchase_units[0];
    expect(body.intent).toBe("CAPTURE");
    expect(unit.custom_id).toBe("mst_1");
    expect(unit.amount).toMatchObject({ currency_code: "USD", value: "320.37", breakdown: { item_total: { value: "320.37" } } });
    expect(unit.items.map((i: { unit_amount: { value: string } }) => i.unit_amount.value)).toEqual(["300.00", "20.37"]);
    expect(body.payment_source.paypal.experience_context).toMatchObject({ shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" });
  });

  it("sends a plain order (no experience_context) for the JS SDK buttons", async () => {
    token();
    let body: Body = {};
    nock(API).post("/v2/checkout/orders", (b) => ((body = b), true)).reply(201, { id: "ORDER-SDK", status: "CREATED", links: [] });
    await gw.createOrder({ milestoneId: "mst_2", pactId: "pct_2", pactTitle: "P", milestoneTitle: "M", quote, currency: "USD", requestId: "r2", flow: "sdk" } as never);
    expect(body.payment_source).toBeUndefined();
  });

  it("reads the capture id, amount, PayPal fee and payer from a capture", async () => {
    token();
    nock(API)
      .post("/v2/checkout/orders/ORDER-1/capture")
      .matchHeader("paypal-request-id", "kept-capture-1")
      .reply(201, {
        id: "ORDER-1",
        status: "COMPLETED",
        payer: { email_address: "buyer@personal.example.com", payer_id: "BUYER123" },
        purchase_units: [
          {
            custom_id: "mst_1",
            payments: {
              captures: [
                {
                  id: "3C679366HH908993F",
                  status: "COMPLETED",
                  custom_id: "mst_1",
                  amount: { currency_code: "USD", value: "320.37" },
                  seller_receivable_breakdown: { gross_amount: { currency_code: "USD", value: "320.37" }, paypal_fee: { currency_code: "USD", value: "11.67" } },
                },
              ],
            },
          },
        ],
      });

    const c = await gw.captureOrder("ORDER-1", "kept-capture-1");
    expect(c).toMatchObject({ status: "COMPLETED", captureId: "3C679366HH908993F", amountCents: 32037, paypalFeeCents: 1167, customId: "mst_1", payerEmail: "buyer@personal.example.com", payerId: "BUYER123" });
  });

  it("treats ORDER_ALREADY_CAPTURED as success and reads the order instead", async () => {
    token();
    nock(API)
      .post("/v2/checkout/orders/ORDER-2/capture")
      .reply(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }], debug_id: "dbg" })
      .get("/v2/checkout/orders/ORDER-2")
      .reply(200, { id: "ORDER-2", status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAP-2", status: "COMPLETED", amount: { currency_code: "USD", value: "10.00" } }] } }] });
    expect(await gw.captureOrder("ORDER-2", "r")).toMatchObject({ captureId: "CAP-2", amountCents: 1000 });
  });

  it("refunds part of a capture for a split", async () => {
    token();
    let body: Body = {};
    nock(API)
      .post("/v2/payments/captures/CAP-9/refund", (b) => ((body = b), true))
      .matchHeader("paypal-request-id", "kept-refund-1")
      .reply(201, { id: "1JU08902781691411", status: "COMPLETED" });
    const r = await gw.refundCapture({ captureId: "CAP-9", amountCents: 8400, currency: "USD", note: "35% back to the client", requestId: "kept-refund-1" });
    expect(r).toMatchObject({ refundId: "1JU08902781691411", status: "COMPLETED" });
    expect(body.amount).toEqual({ currency_code: "USD", value: "84.00" });
  });

  it("pays out to a linked PayPal account by payer id, with the batch id as idempotency key", async () => {
    token();
    let body: Body = {};
    nock(API)
      .post("/v1/payments/payouts", (b) => ((body = b), true))
      .matchHeader("paypal-request-id", "kept-mst_1")
      .reply(201, { batch_header: { payout_batch_id: "BATCH-1", batch_status: "PENDING" } })
      .get("/v1/payments/payouts/BATCH-1")
      .reply(200, { batch_header: { payout_batch_id: "BATCH-1", batch_status: "SUCCESS", fees: { currency: "USD", value: "0.25" } }, items: [{ payout_item_id: "ITEM-1", transaction_status: "SUCCESS" }] });

    const p = await gw.createPayout({ senderBatchId: "kept-mst_1", senderItemId: "mst_1", receiverEmail: "payer:ANA123", amountCents: 15600, currency: "USD", subject: "Paid", note: "Released" });
    expect(p).toMatchObject({ batchId: "BATCH-1", itemId: "ITEM-1", status: "SUCCESS", itemStatus: "SUCCESS", feeCents: 25 });
    expect(body.sender_batch_header.sender_batch_id).toBe("kept-mst_1");
    expect(body.items[0]).toMatchObject({ recipient_type: "PAYPAL_ID", receiver: "ANA123", amount: { value: "156.00", currency: "USD" } });
  });

  it("verifies webhooks through verify-webhook-signature with the configured webhook id", async () => {
    token();
    const rawBody = '{"id":"WH-1","event_type":"PAYMENT.CAPTURE.COMPLETED","resource":{"amount":{"value":"320.370"},"note":"caf\\u00e9"}}';
    let sent = "";
    nock(API)
      .post("/v1/notifications/verify-webhook-signature", (b) => ((sent = JSON.stringify(b)), true))
      .reply(200, { verification_status: "SUCCESS" });
    const headers = new Headers({
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT",
      "paypal-transmission-id": "t-1",
      "paypal-transmission-sig": "sig",
      "paypal-transmission-time": "2026-10-05T06:00:00Z",
    });
    expect(await gw.verifyWebhook({ headers, rawBody })).toBe(true);
    const parsed = JSON.parse(sent);
    expect(parsed).toMatchObject({ webhook_id: "WH-CONFIG-1", transmission_id: "t-1", webhook_event: { id: "WH-1" } });

    nock(API).post("/v1/notifications/verify-webhook-signature").reply(200, { verification_status: "FAILURE" });
    expect(await gw.verifyWebhook({ headers, rawBody })).toBe(false);
  });
});
