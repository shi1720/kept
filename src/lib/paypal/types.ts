import type { Cents } from "@/lib/money";
import type { FeeQuote } from "@/lib/domain/fees";

export type GatewayMode = "sandbox" | "live" | "simulator";

export interface CreateOrderInput {
  milestoneId: string;
  pactId: string;
  pactTitle: string;
  milestoneTitle: string;
  currency: string;
  quote: FeeQuote;
  /** Idempotency key (PayPal-Request-Id). */
  requestId: string;
  /**
   * "sdk": approved in the JS SDK v6 buttons (PayPal or guest card) — plain order, as in PayPal's v6 samples.
   * "redirect": approved via the returned approval link (agents/MCP) — carries return/cancel URLs.
   */
  flow?: "sdk" | "redirect";
}

export interface CreatedOrder {
  orderId: string;
  status: string;
  approveUrl?: string;
  raw: unknown;
}

export interface CaptureResult {
  orderId: string;
  status: "COMPLETED" | "PENDING" | "DECLINED" | "FAILED" | string;
  captureId: string | null;
  amountCents: Cents;
  paypalFeeCents: Cents | null;
  payerEmail: string | null;
  payerId: string | null;
  customId: string | null;
  raw: unknown;
}

export interface RefundInput {
  captureId: string;
  amountCents: Cents;
  currency: string;
  note: string;
  requestId: string;
}

export interface RefundResult {
  refundId: string;
  status: string;
  raw: unknown;
}

export interface PayoutInput {
  senderBatchId: string;
  receiverEmail: string;
  amountCents: Cents;
  currency: string;
  note: string;
  subject: string;
  senderItemId: string;
}

export interface PayoutResult {
  batchId: string;
  itemId: string | null;
  /** Batch status (PENDING, PROCESSING, SUCCESS, DENIED…) */
  status: string;
  /** Item status (SUCCESS, UNCLAIMED, PENDING, FAILED…) when known. */
  itemStatus: string | null;
  feeCents: Cents | null;
  raw: unknown;
}

export interface WebhookVerificationInput {
  headers: Headers;
  rawBody: string;
}

export interface PayPalGateway {
  readonly mode: GatewayMode;
  createOrder(input: CreateOrderInput): Promise<CreatedOrder>;
  captureOrder(orderId: string, requestId: string): Promise<CaptureResult>;
  getOrder(orderId: string): Promise<CaptureResult>;
  refundCapture(input: RefundInput): Promise<RefundResult>;
  createPayout(input: PayoutInput): Promise<PayoutResult>;
  getPayoutBatch(batchId: string): Promise<PayoutResult>;
  verifyWebhook(input: WebhookVerificationInput): Promise<boolean>;
  /** Disputes API: submit seller evidence (notes) for a payer-filed PayPal dispute. */
  provideDisputeEvidence(disputeId: string, notes: string): Promise<void>;
}
