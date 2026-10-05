import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type DB = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __keptDb?: DB; __keptClient?: Client };

function makeClient(url: string, authToken?: string): Client {
  if (url.startsWith("file:")) {
    const path = url.slice("file:".length);
    if (path && path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  }
  const client = createClient({ url, authToken: authToken || undefined });
  return client;
}

export function getClient(): Client {
  if (!globalForDb.__keptClient) {
    globalForDb.__keptClient = makeClient(env.databaseUrl, env.databaseAuthToken);
  }
  return globalForDb.__keptClient;
}

export const db: DB = globalForDb.__keptDb ?? drizzle(getClient(), { schema });
globalForDb.__keptDb = db;

export { schema };
