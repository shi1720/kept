import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL || "file:./data/kept.db";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: { url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined },
});
