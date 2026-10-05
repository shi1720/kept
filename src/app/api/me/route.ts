import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSessionUser, requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { retryPayoutsForFreelancer } from "@/lib/domain/settlement";
import { handler, readJson } from "@/lib/http";

const patch = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  headline: z.string().trim().max(120).nullable().optional(),
  paypalEmail: z.email().nullable().optional(),
});

export const GET = handler(async () => {
  const u = await requireUser();
  return { user: { id: u.id, name: u.name, email: u.email, handle: u.handle, headline: u.headline, paypalEmail: u.paypalEmail, paypalVerified: u.paypalVerified, role: u.role, demo: Boolean(u.demoWorkspace) } };
});

/** Profile and payout email: browser sessions only, so an agent's API key can't redirect payouts. */
export const PATCH = handler(async (req) => {
  const u = await requireSessionUser();
  const input = patch.parse(await readJson(req));
  const changes: Partial<typeof users.$inferInsert> = { ...input };
  if (input.paypalEmail !== undefined && input.paypalEmail?.toLowerCase() !== u.paypalEmail) {
    changes.paypalEmail = input.paypalEmail?.toLowerCase() ?? null;
    changes.paypalVerified = false;
    changes.paypalPayerId = null;
  }
  await db.update(users).set(changes).where(eq(users.id, u.id));
  if (changes.paypalEmail) await retryPayoutsForFreelancer(u.id, changes.paypalEmail);
  return { ok: true };
});
