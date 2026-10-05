import { and, desc, eq, isNull } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { handler } from "@/lib/http";

export const GET = handler(async () => {
  const user = await requireUser();
  const items = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(30);
  return { items, unread: items.filter((n) => !n.readAt).length };
});

export const POST = handler(async () => {
  const user = await requireUser();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  return { ok: true };
});
