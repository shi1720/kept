/** `npm run doctor` — verify database, PayPal and AI integrations with the keys in your env. */
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const { runDoctor } = await import("../src/lib/doctor");
  const { checks } = await runDoctor();
  const icon = { ok: "✅", fail: "❌", skipped: "•" } as const;
  console.log("\nKept doctor\n");
  for (const c of checks) console.log(`  ${icon[c.status]} ${c.name.padEnd(16)} ${c.detail}`);
  console.log("");
  process.exit(checks.some((c) => c.status === "fail") ? 1 : 0);
}

main();
