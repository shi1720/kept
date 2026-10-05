import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import { db, getClient } from "./client";
import { env } from "@/lib/env";

let migrated: Promise<void> | null = null;

/** Apply pending SQL migrations exactly once per process. */
export function ensureMigrated(): Promise<void> {
  if (!migrated) {
    migrated = enableWal()
      .then(() => migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") }))
      .catch((err) => {
        migrated = null;
        throw err;
      });
  }
  return migrated;
}

/**
 * Local SQLite files run in WAL mode so that a commit never waits on readers holding the file
 * (the sweeper, a page render and a click on "Approve" all touch the same milestone). The mode is
 * stored in the database file, so setting it once is enough. Remote libSQL manages this itself.
 */
async function enableWal() {
  const url = env.databaseUrl;
  if (!url.startsWith("file:") || url.includes(":memory:")) return;
  await getClient().execute("PRAGMA journal_mode = WAL");
}
