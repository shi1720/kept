/**
 * Money is always stored and computed as integer minor units (cents).
 * Never use floating point for balances.
 */

export type Cents = number;

export function toCents(amount: number | string): Cents {
  const n = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (!Number.isFinite(n)) throw new Error(`Invalid amount: ${amount}`);
  return Math.round(n * 100);
}

/** Format cents as a PayPal API decimal string, e.g. 30750 -> "307.50". */
export function toPayPalValue(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function formatMoney(cents: Cents, currency = "USD", opts: { compact?: boolean } = {}): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: opts.compact ? "compact" : "standard",
    minimumFractionDigits: opts.compact ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Split `total` into two integer parts by percentage without losing a cent. */
export function splitByPct(total: Cents, pct: number): [Cents, Cents] {
  const clamped = Math.min(100, Math.max(0, pct));
  const first = Math.round((total * clamped) / 100);
  return [first, total - first];
}
