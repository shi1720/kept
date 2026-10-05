import type { Cents } from "@/lib/money";

/**
 * Pricing model
 * -------------
 * - Freelancers keep 100% of the agreed milestone amount.
 * - Clients pay a Kept protection fee (default 2.9%, min $1.00) which funds the
 *   AI referee, dispute mediation and payout costs.
 * - PayPal processing is passed through at cost. We gross the order total up so
 *   that, after PayPal's standard fee (3.49% + $0.49 in the US), escrow still
 *   holds exactly the milestone amount plus the Kept fee. The actual fee PayPal
 *   charged is read back from the capture and booked in the ledger.
 */

export interface FeeConfig {
  platformFeeBps: number;
  platformFeeMinCents: Cents;
  /** PayPal standard checkout rate used for the gross-up estimate. */
  processingBps: number;
  processingFixedCents: Cents;
}

export const DEFAULT_FEES: FeeConfig = {
  platformFeeBps: 290,
  platformFeeMinCents: 100,
  processingBps: 349,
  processingFixedCents: 49,
};

export interface FeeQuote {
  milestoneCents: Cents;
  platformFeeCents: Cents;
  processingFeeCents: Cents;
  totalCents: Cents;
}

export function quoteFunding(milestoneCents: Cents, cfg: FeeConfig = DEFAULT_FEES): FeeQuote {
  if (!Number.isInteger(milestoneCents) || milestoneCents <= 0) {
    throw new Error("Milestone amount must be a positive integer number of cents");
  }
  const platformFeeCents = Math.max(
    cfg.platformFeeMinCents,
    Math.round((milestoneCents * cfg.platformFeeBps) / 10_000),
  );
  const net = milestoneCents + platformFeeCents;
  // total - (total * rate + fixed) = net  =>  total = (net + fixed) / (1 - rate)
  const totalCents = Math.ceil((net + cfg.processingFixedCents) / (1 - cfg.processingBps / 10_000));
  return {
    milestoneCents,
    platformFeeCents,
    processingFeeCents: totalCents - net,
    totalCents,
  };
}
