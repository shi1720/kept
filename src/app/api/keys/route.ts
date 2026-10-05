import { and, desc, eq, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { hashApiKey, requireSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { apiKeys } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { handler, readJson } from "@/lib/http";
import { newId } from "@/lib/ids";

const body = z.object({ name: z.string().trim().min(1).max(60).default("My agent") });

// Keys are managed from a signed-in browser only: an agent's key can't list, mint or replace keys.
export const GET = handler(async () => {
  const user = await requireSessionUser();
  const keys = await db
    .select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, lastUsedAt: apiKeys.lastUsedAt, revokedAt: apiKeys.revokedAt, createdAt: apiKeys.createdAt })
    .from(apiKeys)
    .where(eq(apiKeys.userId, user.id))
    .orderBy(desc(apiKeys.createdAt));
  return { keys };
});

/** Create an API key for agents (REST + MCP). The secret is shown exactly once. */
export const POST = handler(async (req) => {
  const user = await requireSessionUser();
  const { name } = body.parse(await readJson(req).catch(() => ({})));
  const active = await db.select({ id: apiKeys.id }).from(apiKeys).where(and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)));
  if (active.length >= 10) throw new AppError("rate_limited", "You can have at most 10 active API keys — revoke one first");
  const secret = `kept_sk_${randomBytes(24).toString("base64url")}`;
  await db.insert(apiKeys).values({ id: newId("key"), userId: user.id, name, prefix: secret.slice(0, 14), keyHash: hashApiKey(secret) });
  return { key: secret };
});
