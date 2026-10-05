import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { apiKeys } from "@/lib/db/schema";
import { handler } from "@/lib/http";

export const DELETE = handler<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  await db.update(apiKeys).set({ revokedAt: new Date() }).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id)));
  return { ok: true };
});
