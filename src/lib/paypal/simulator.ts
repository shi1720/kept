import { randomBytes } from "node:crypto";
import { AppError } from "@/lib/errors";
import type {
  CaptureResult,
  CreatedOrder,
  CreateOrderInput,
  PayoutInput,
  PayoutResult,
  PayPalGateway,
  RefundInput,
  RefundResult,
} from "./types";

/**
 * A faithful, in-process stand-in for the PayPal APIs used by Kept.
 *
 * It mirrors PayPal's behaviour where it matters for correctness — idempotent
 * request ids, ORDER_ALREADY_CAPTURED, refund ceilings, duplicate payout batch
 * ids — so the escrow state machine is exercised the same way in tests and in
 * keyless local runs as it is against the real sandbox.
 */
interface SimOrder {
  input: CreateOrderInput;
  status: "CREATED" | "APPROVED" | "COMPLETED";
  captureId?: string;
  refundedCents: number;
}

interface SimState {
  orders: Map<string, SimOrder>;
  captures: Map<string, string>; // captureId -> orderId
  payouts: Map<string, PayoutResult>;
  payoutsBySender: Map<string, string>;
  requestIds: Map<string, unknown>;
}

const g = globalThis as unknown as { __paypalSim?: SimState };
const state: SimState =
  g.__paypalSim ??
  (g.__paypalSim = {
    orders: new Map(),
    captures: new Map(),
    payouts: new Map(),
    payoutsBySender: new Map(),
    requestIds: new Map(),
  });

const simId = (prefix: string) => `${prefix}${randomBytes(8).toString("hex").toUpperCase()}`;

export class SimulatedPayPalGateway implements PayPalGateway {
  readonly mode = "simulator" as const;

  async createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
    const cached = state.requestIds.get(`order:${input.requestId}`) as CreatedOrder | undefined;
    if (cached) return cached;
    const orderId = simId("SIM-ORDER-");
    state.orders.set(orderId, { input, status: "CREATED", refundedCents: 0 });
    const created: CreatedOrder = { orderId, status: "CREATED", raw: { id: orderId, simulated: true } };
    state.requestIds.set(`order:${input.requestId}`, created);
    return created;
  }

  /** The simulator's equivalent of the buyer clicking "Pay" in the PayPal popup. */
  approve(orderId: string) {
    const order = state.orders.get(orderId);
    if (order && order.status === "CREATED") order.status = "APPROVED";
  }

  async captureOrder(orderId: string): Promise<CaptureResult> {
    const order = state.orders.get(orderId);
    if (!order) throw new AppError("payment_failed", "PayPal RESOURCE_NOT_FOUND: order does not exist");
    if (order.status === "CREATED") order.status = "APPROVED"; // simulator auto-approves
    if (order.status !== "COMPLETED") {
      order.status = "COMPLETED";
      order.captureId = simId("SIM-CAP-");
      state.captures.set(order.captureId, orderId);
    }
    return this.summarize(orderId, order);
  }

  async getOrder(orderId: string): Promise<CaptureResult> {
    const order = state.orders.get(orderId);
    if (!order) throw new AppError("payment_failed", "PayPal RESOURCE_NOT_FOUND: order does not exist");
    return this.summarize(orderId, order);
  }

  private summarize(orderId: string, order: SimOrder): CaptureResult {
    const total = order.input.quote.totalCents;
    return {
      orderId,
      status: order.status,
      captureId: order.captureId ?? null,
      amountCents: total,
      paypalFeeCents: order.captureId ? Math.round(total * 0.0349) + 49 : null,
      payerEmail: "sandbox-buyer@kept.simulator",
      payerId: "SIMPAYER0001",
      customId: order.input.milestoneId,
      raw: { id: orderId, status: order.status, simulated: true },
    };
  }

  async refundCapture(input: RefundInput): Promise<RefundResult> {
    const cached = state.requestIds.get(`refund:${input.requestId}`) as RefundResult | undefined;
    if (cached) return cached;
    const orderId = state.captures.get(input.captureId);
    const order = orderId ? state.orders.get(orderId) : undefined;
    if (!order) {
      // Captures from a previous process (seeded demo history): accept statelessly.
      if (!input.captureId.startsWith("SIM-CAP-")) throw new AppError("payment_failed", "PayPal RESOURCE_NOT_FOUND: capture does not exist");
      const result: RefundResult = { refundId: simId("SIM-RFD-"), status: "COMPLETED", raw: { simulated: true } };
      state.requestIds.set(`refund:${input.requestId}`, result);
      return result;
    }
    if (order.refundedCents + input.amountCents > order.input.quote.totalCents) {
      throw new AppError("payment_failed", "PayPal REFUND_AMOUNT_EXCEEDED");
    }
    order.refundedCents += input.amountCents;
    const result: RefundResult = { refundId: simId("SIM-RFD-"), status: "COMPLETED", raw: { simulated: true } };
    state.requestIds.set(`refund:${input.requestId}`, result);
    return result;
  }

  async createPayout(input: PayoutInput): Promise<PayoutResult> {
    if (state.payoutsBySender.has(input.senderBatchId)) {
      throw new AppError("payment_failed", "PayPal USER_BUSINESS_ERROR: Batch with given sender_batch_id already exists");
    }
    const batchId = simId("SIMBATCH");
    const result: PayoutResult = {
      batchId,
      itemId: simId("SIMITEM"),
      status: "SUCCESS",
      itemStatus: "SUCCESS",
      feeCents: 25,
      raw: { simulated: true, receiver: input.receiverEmail },
    };
    state.payouts.set(batchId, result);
    state.payoutsBySender.set(input.senderBatchId, batchId);
    return result;
  }

  async getPayoutBatch(batchId: string): Promise<PayoutResult> {
    const p = state.payouts.get(batchId);
    if (!p) throw new AppError("payment_failed", "PayPal RESOURCE_NOT_FOUND: batch does not exist");
    return p;
  }

  async verifyWebhook(): Promise<boolean> {
    return false;
  }
}
