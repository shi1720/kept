import { sql } from "drizzle-orm";
import { blob, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey();
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);
const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export const users = sqliteTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    headline: text("headline"),
    passwordHash: text("password_hash"),
    role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
    /** Where released funds are sent (PayPal Payouts recipient). */
    paypalEmail: text("paypal_email"),
    paypalPayerId: text("paypal_payer_id"),
    paypalVerified: integer("paypal_verified", { mode: "boolean" }).notNull().default(false),
    avatarHue: integer("avatar_hue").notNull().default(160),
    /** Demo workspaces are isolated so every visitor gets their own sandbox story. */
    demoWorkspace: text("demo_workspace"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email), uniqueIndex("users_handle_uq").on(t.handle)],
);

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    lastUsedAt: ts("last_used_at"),
    revokedAt: ts("revoked_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("api_keys_hash_uq").on(t.keyHash), index("api_keys_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Pacts                                                               */
/* ------------------------------------------------------------------ */

export type PactStatus = "draft" | "pending_acceptance" | "active" | "completed" | "cancelled";

export interface PactTerms {
  revisionsIncluded: number;
  reviewWindowHours: number;
  ipTransfer: string;
  communication?: string;
  extra?: string[];
}

export interface Ambiguity {
  quote: string;
  issue: string;
  suggestion: string;
  resolved?: boolean;
}

export interface RiskFlag {
  severity: "low" | "medium" | "high";
  signal: string;
  explanation: string;
}

export const pacts = sqliteTable(
  "pacts",
  {
    id: id(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    currency: text("currency").notNull().default("USD"),
    status: text("status").$type<PactStatus>().notNull().default("draft"),
    creatorId: text("creator_id")
      .notNull()
      .references(() => users.id),
    creatorRole: text("creator_role", { enum: ["client", "freelancer"] }).notNull(),
    clientId: text("client_id").references(() => users.id),
    freelancerId: text("freelancer_id").references(() => users.id),
    counterpartyName: text("counterparty_name"),
    counterpartyEmail: text("counterparty_email"),
    inviteToken: text("invite_token").notNull(),
    sourceText: text("source_text"),
    terms: json<PactTerms>("terms").notNull(),
    clarityScore: integer("clarity_score"),
    ambiguities: json<Ambiguity[]>("ambiguities").notNull().default(sql`'[]'`),
    riskFlags: json<RiskFlag[]>("risk_flags").notNull().default(sql`'[]'`),
    clientSignedAt: ts("client_signed_at"),
    freelancerSignedAt: ts("freelancer_signed_at"),
    /** Agent that created this pact via the API/MCP, if any. */
    createdVia: text("created_via", { enum: ["web", "api", "mcp", "seed"] }).notNull().default("web"),
    demoWorkspace: text("demo_workspace"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("pacts_invite_uq").on(t.inviteToken),
    index("pacts_client_idx").on(t.clientId),
    index("pacts_freelancer_idx").on(t.freelancerId),
  ],
);

export type MilestoneStatus =
  | "draft"
  | "awaiting_funding"
  | "funded"
  | "submitted"
  | "in_review"
  | "released"
  | "disputed"
  | "settled"
  | "refunded"
  | "cancelled";

export const milestones = sqliteTable(
  "milestones",
  {
    id: id(),
    pactId: text("pact_id")
      .notNull()
      .references(() => pacts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    amountCents: integer("amount_cents").notNull(),
    dueAt: ts("due_at"),
    status: text("status").$type<MilestoneStatus>().notNull().default("draft"),
    revisionsUsed: integer("revisions_used").notNull().default(0),
    fundedAt: ts("funded_at"),
    submittedAt: ts("submitted_at"),
    reviewDeadlineAt: ts("review_deadline_at"),
    resolvedAt: ts("resolved_at"),
    /** Final outcome: share of the milestone released to the freelancer. */
    releasedPct: integer("released_pct"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("milestones_pact_idx").on(t.pactId), index("milestones_status_idx").on(t.status)],
);

export type CheckType =
  | "none"
  | "min_words"
  | "max_words"
  | "min_files"
  | "file_types"
  | "url_reachable"
  | "page_contains"
  | "repo_has_path"
  | "keywords_present"
  | "min_image_resolution";

export interface MachineCheck {
  type: CheckType;
  value?: number;
  values?: string[];
  width?: number;
  height?: number;
}

export const criteria = sqliteTable(
  "criteria",
  {
    id: id(),
    milestoneId: text("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    text: text("text").notNull(),
    kind: text("kind", { enum: ["objective", "subjective"] }).notNull().default("objective"),
    check: json<MachineCheck>("check").notNull().default(sql`'{"type":"none"}'`),
  },
  (t) => [index("criteria_milestone_idx").on(t.milestoneId)],
);

/* ------------------------------------------------------------------ */
/* Work & evidence                                                     */
/* ------------------------------------------------------------------ */

export const submissions = sqliteTable(
  "submissions",
  {
    id: id(),
    milestoneId: text("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    note: text("note").notNull().default(""),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("submissions_milestone_idx").on(t.milestoneId)],
);

export type ArtifactKind = "text" | "file" | "url" | "github";

export const artifacts = sqliteTable(
  "artifacts",
  {
    id: id(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ArtifactKind>().notNull(),
    name: text("name").notNull(),
    mime: text("mime"),
    sizeBytes: integer("size_bytes"),
    /** Inline text deliverables, or a URL / repo slug. */
    content: text("content"),
    data: blob("data", { mode: "buffer" }),
    sha256: text("sha256"),
    createdAt: createdAt(),
  },
  (t) => [index("artifacts_submission_idx").on(t.submissionId)],
);

export interface EvidenceFact {
  artifactId?: string;
  probe: string;
  label: string;
  detail: string;
  ok?: boolean;
}

export interface CriterionResult {
  criterionId: string;
  result: "met" | "partially_met" | "not_met" | "cannot_verify";
  confidence: number;
  evidence: string;
  reasoning: string;
  machineCheck?: { type: CheckType; passed: boolean; detail: string } | null;
}

export const verdicts = sqliteTable(
  "verdicts",
  {
    id: id(),
    milestoneId: text("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    overall: text("overall", { enum: ["pass", "partial", "fail"] }).notNull(),
    score: integer("score").notNull(),
    recommendedReleasePct: integer("recommended_release_pct").notNull(),
    summary: text("summary").notNull(),
    notesForClient: text("notes_for_client").notNull().default(""),
    notesForFreelancer: text("notes_for_freelancer").notNull().default(""),
    criteriaResults: json<CriterionResult[]>("criteria_results").notNull(),
    evidence: json<EvidenceFact[]>("evidence").notNull(),
    injectionDetected: integer("injection_detected", { mode: "boolean" }).notNull().default(false),
    latencyMs: integer("latency_ms").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("verdicts_milestone_idx").on(t.milestoneId)],
);

export interface Ruling {
  releasePct: number;
  rationale: string;
  findings: { point: string; favors: "client" | "freelancer" | "neutral" }[];
  messageToParties: string;
  provider: string;
  model: string;
}

export const disputes = sqliteTable(
  "disputes",
  {
    id: id(),
    milestoneId: text("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    openedById: text("opened_by_id").references(() => users.id),
    reason: text("reason").notNull(),
    clientStatement: text("client_statement"),
    freelancerStatement: text("freelancer_statement"),
    status: text("status", { enum: ["open", "ruling_proposed", "escalated", "resolved"] })
      .notNull()
      .default("open"),
    ruling: json<Ruling>("ruling"),
    clientAcceptedAt: ts("client_accepted_at"),
    freelancerAcceptedAt: ts("freelancer_accepted_at"),
    rejectedById: text("rejected_by_id"),
    finalReleasePct: integer("final_release_pct"),
    resolvedAt: ts("resolved_at"),
    createdAt: createdAt(),
  },
  (t) => [index("disputes_milestone_idx").on(t.milestoneId)],
);

/* ------------------------------------------------------------------ */
/* Money movement (PayPal)                                             */
/* ------------------------------------------------------------------ */

export interface PayPalDisputeInfo {
  id: string;
  reason: string;
  status: string;
  stage: string | null;
  amountCents: number | null;
  openedAt: string;
  evidenceSubmittedAt?: string | null;
  evidenceError?: string | null;
  outcome?: string | null;
  simulated?: boolean;
}

export const payments = sqliteTable(
  "payments",
  {
    id: id(),
    milestoneId: text("milestone_id")
      .notNull()
      .references(() => milestones.id),
    paypalOrderId: text("paypal_order_id").notNull(),
    paypalCaptureId: text("paypal_capture_id"),
    status: text("status", { enum: ["created", "approved", "completed", "failed", "refunded", "partially_refunded"] })
      .notNull()
      .default("created"),
    milestoneCents: integer("milestone_cents").notNull(),
    platformFeeCents: integer("platform_fee_cents").notNull(),
    processingFeeCents: integer("processing_fee_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    /** Fee PayPal actually charged, read back from seller_receivable_breakdown. */
    paypalFeeCents: integer("paypal_fee_cents"),
    payerEmail: text("payer_email"),
    payerId: text("payer_id"),
    refundedCents: integer("refunded_cents").notNull().default(0),
    simulated: integer("simulated", { mode: "boolean" }).notNull().default(false),
    /** A dispute/chargeback the payer filed with PayPal directly, if any. */
    paypalDispute: json<PayPalDisputeInfo>("paypal_dispute"),
    raw: json<unknown>("raw"),
    capturedAt: ts("captured_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("payments_order_uq").on(t.paypalOrderId), index("payments_milestone_idx").on(t.milestoneId)],
);

export const payouts = sqliteTable(
  "payouts",
  {
    id: id(),
    milestoneId: text("milestone_id")
      .notNull()
      .references(() => milestones.id),
    senderBatchId: text("sender_batch_id").notNull(),
    paypalBatchId: text("paypal_batch_id"),
    paypalItemId: text("paypal_item_id"),
    receiverEmail: text("receiver_email").notNull(),
    amountCents: integer("amount_cents").notNull(),
    feeCents: integer("fee_cents"),
    status: text("status").notNull().default("PENDING"),
    simulated: integer("simulated", { mode: "boolean" }).notNull().default(false),
    raw: json<unknown>("raw"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("payouts_sender_batch_uq").on(t.senderBatchId)],
);

export const refunds = sqliteTable("refunds", {
  id: id(),
  paymentId: text("payment_id")
    .notNull()
    .references(() => payments.id),
  milestoneId: text("milestone_id")
    .notNull()
    .references(() => milestones.id),
  paypalRefundId: text("paypal_refund_id"),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull(),
  reason: text("reason").notNull().default(""),
  simulated: integer("simulated", { mode: "boolean" }).notNull().default(false),
  raw: json<unknown>("raw"),
  createdAt: createdAt(),
});

/**
 * Double-entry ledger. Each `txnId` groups lines whose amounts sum to zero.
 * Positive = debit, negative = credit.
 */
export type LedgerAccount =
  | "paypal_cash"
  | "escrow_liability"
  | "fee_revenue"
  | "processing_collected"
  | "processing_expense"
  | "payout_expense";

export const ledgerEntries = sqliteTable(
  "ledger_entries",
  {
    id: id(),
    txnId: text("txn_id").notNull(),
    pactId: text("pact_id").references(() => pacts.id),
    milestoneId: text("milestone_id").references(() => milestones.id),
    account: text("account").$type<LedgerAccount>().notNull(),
    amountCents: integer("amount_cents").notNull(),
    memo: text("memo").notNull(),
    reference: text("reference"),
    demoWorkspace: text("demo_workspace"),
    createdAt: createdAt(),
  },
  (t) => [index("ledger_txn_idx").on(t.txnId), index("ledger_pact_idx").on(t.pactId)],
);

/* ------------------------------------------------------------------ */
/* Audit trail & integrations                                          */
/* ------------------------------------------------------------------ */

export const events = sqliteTable(
  "events",
  {
    id: id(),
    pactId: text("pact_id").references(() => pacts.id, { onDelete: "cascade" }),
    milestoneId: text("milestone_id"),
    actorId: text("actor_id"),
    actorKind: text("actor_kind", { enum: ["user", "ai", "system", "paypal", "agent"] }).notNull(),
    type: text("type").notNull(),
    message: text("message").notNull(),
    data: json<Record<string, unknown>>("data"),
    createdAt: createdAt(),
  },
  (t) => [index("events_pact_idx").on(t.pactId)],
);

export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    id: id(),
    paypalEventId: text("paypal_event_id").notNull(),
    eventType: text("event_type").notNull(),
    resourceId: text("resource_id"),
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
    payload: json<unknown>("payload").notNull(),
    processedAt: ts("processed_at"),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("webhook_events_event_uq").on(t.paypalEventId)],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pactId: text("pact_id"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type Pact = typeof pacts.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Criterion = typeof criteria.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type Verdict = typeof verdicts.$inferSelect;
export type Dispute = typeof disputes.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type EventRow = typeof events.$inferSelect;
