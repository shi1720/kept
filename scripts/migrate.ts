import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const { ensureMigrated } = await import("../src/lib/db/migrate");
  await ensureMigrated();
  console.log("Database is up to date.");
}

main().then(() => process.exit(0), (e) => {
  console.error(e);
  process.exit(1);
});
