import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import { db } from "./client";

let migrated: Promise<void> | null = null;

/** Apply pending SQL migrations exactly once per process. */
export function ensureMigrated(): Promise<void> {
  if (!migrated) {
    migrated = migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") }).catch((err) => {
      migrated = null;
      throw err;
    });
  }
  return migrated;
}
