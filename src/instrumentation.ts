/**
 * Next.js instrumentation hook: runs once per server process.
 * Applies migrations and starts the in-process sweeper so review windows,
 * stuck reviews and payout reconciliation progress even without an external cron.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureMigrated } = await import("@/lib/db/migrate");
  await ensureMigrated();
  if (process.env.DISABLE_INPROCESS_SWEEPER === "true") return;
  const { sweep } = await import("@/lib/domain/sweep");
  const g = globalThis as unknown as { __keptSweeper?: NodeJS.Timeout };
  if (g.__keptSweeper) return;
  let running = false;
  g.__keptSweeper = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const r = await sweep();
      const n = r.autoReleased.length + r.autoDisputed.length + r.reviewsRetried.length;
      if (n || r.errors.length) console.log("[sweeper]", JSON.stringify(r));
    } catch (err) {
      console.error("[sweeper] failed", err);
    } finally {
      running = false;
    }
  }, 60_000);
}
