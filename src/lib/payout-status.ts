/**
 * What a payout's PayPal status means to a person. Shared by the server (stats) and the UI
 * (receipts), so "paid" always means PayPal actually delivered the money.
 */
export type PayoutState = "paid" | "in_flight" | "needs_email" | "unclaimed" | "failed";

export function payoutState(status: string): PayoutState {
  const s = status.toUpperCase();
  if (s === "SUCCESS" || s === "COMPLETED") return "paid";
  if (s === "NEEDS_PAYOUT_EMAIL") return "needs_email";
  if (s === "UNCLAIMED" || s === "ONHOLD") return "unclaimed";
  if (["FAILED", "RETURNED", "BLOCKED", "REFUNDED", "REVERSED", "DENIED", "RETURNED_TO_ESCROW", "NEEDS_RECONCILIATION"].includes(s)) return "failed";
  return "in_flight";
}

export const isPaidOut = (status: string) => payoutState(status) === "paid";

export function payoutStatusLabel(status: string, freelancer = "the freelancer"): string {
  switch (payoutState(status)) {
    case "paid":
      return "Delivered by PayPal";
    case "needs_email":
      return `Reserved for ${freelancer}: waiting for a PayPal payout email`;
    case "unclaimed":
      return `Sent; PayPal is holding it until ${freelancer} claims it`;
    case "failed":
      return status.toUpperCase() === "RETURNED_TO_ESCROW" ? "Returned to escrow; Kept will retry" : "Not delivered yet; Kept is retrying";
    default:
      return "On its way through PayPal Payouts";
  }
}
