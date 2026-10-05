import { headers } from "next/headers";
import { AppError } from "@/lib/errors";

/**
 * Fixed-window in-memory rate limiter. Protects the AI budget and the demo
 * seeder on a single-instance deployment; swap for Redis when scaling out.
 */
const g = globalThis as unknown as { __keptRate?: Map<string, { count: number; resetAt: number }> };
const buckets = g.__keptRate ?? (g.__keptRate = new Map());

const disabled = () => process.env.NODE_ENV !== "production" || process.env.RATE_LIMIT_DISABLED === "true";

export function rateLimit(key: string, limit: number, windowMs: number) {
  if (disabled()) return;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    return;
  }
  b.count += 1;
  if (b.count > limit) {
    const mins = Math.ceil((b.resetAt - now) / 60_000);
    throw new AppError("rate_limited", `Slow down a little — try again in ${mins} minute${mins === 1 ? "" : "s"}`);
  }
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
