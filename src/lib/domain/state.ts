import type { MilestoneStatus, PactStatus } from "@/lib/db/schema";
import { invalidState } from "@/lib/errors";

/**
 * The escrow state machine. Every money-moving action is a transition, and
 * every transition is checked here before anything touches PayPal.
 *
 *  awaiting_funding ──fund──▶ funded ──submit──▶ submitted ──AI review──▶ in_review
 *                                ▲                                         │
 *                                └────────── request_revision ─────────────┤
 *                                                                          ├─approve / auto-release──▶ released
 *                                                                          └─dispute──▶ disputed ──ruling──▶ settled | released | refunded
 *  funded ──refund (freelancer cancels / mutual)──▶ refunded
 */
export type MilestoneAction =
  | "activate"
  | "fund"
  | "submit"
  | "review_complete"
  | "approve"
  | "auto_release"
  | "request_revision"
  | "dispute"
  | "settle"
  | "refund"
  | "cancel";

const TRANSITIONS: Record<MilestoneAction, { from: MilestoneStatus[]; to: MilestoneStatus | "computed" }> = {
  activate: { from: ["draft"], to: "awaiting_funding" },
  fund: { from: ["awaiting_funding"], to: "funded" },
  submit: { from: ["funded"], to: "submitted" },
  review_complete: { from: ["submitted"], to: "in_review" },
  approve: { from: ["in_review", "submitted"], to: "released" },
  auto_release: { from: ["in_review"], to: "released" },
  request_revision: { from: ["in_review"], to: "funded" },
  dispute: { from: ["in_review", "submitted"], to: "disputed" },
  settle: { from: ["disputed"], to: "computed" },
  refund: { from: ["funded", "in_review", "submitted", "disputed"], to: "refunded" },
  cancel: { from: ["draft", "awaiting_funding"], to: "cancelled" },
};

export function canTransition(status: MilestoneStatus, action: MilestoneAction): boolean {
  return TRANSITIONS[action].from.includes(status);
}

export function assertTransition(status: MilestoneStatus, action: MilestoneAction): void {
  if (!canTransition(status, action)) {
    throw invalidState(`Can't ${action.replace(/_/g, " ")} a milestone that is ${status.replace(/_/g, " ")}`);
  }
}

/** Status after a dispute settles at `releasePct`. */
export function settledStatus(releasePct: number): MilestoneStatus {
  if (releasePct >= 100) return "released";
  if (releasePct <= 0) return "refunded";
  return "settled";
}

export const TERMINAL: MilestoneStatus[] = ["released", "settled", "refunded", "cancelled"];
export const HOLDING_FUNDS: MilestoneStatus[] = ["funded", "submitted", "in_review", "disputed"];

export function derivePactStatus(current: PactStatus, statuses: MilestoneStatus[]): PactStatus {
  if (current === "draft" || current === "pending_acceptance" || current === "cancelled") return current;
  if (statuses.length > 0 && statuses.every((s) => TERMINAL.includes(s))) {
    return statuses.every((s) => s === "cancelled") ? "cancelled" : "completed";
  }
  return "active";
}

export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  draft: "Draft",
  awaiting_funding: "Awaiting funding",
  funded: "Funded · in progress",
  submitted: "Submitted · AI reviewing",
  in_review: "In client review",
  released: "Released",
  disputed: "In mediation",
  settled: "Settled (split)",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export const PACT_STATUS_LABEL: Record<PactStatus, string> = {
  draft: "Draft",
  pending_acceptance: "Awaiting signature",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};
