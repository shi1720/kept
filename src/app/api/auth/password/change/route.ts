import { z } from "zod";
import { changePassword, passwordSchemaMessage } from "@/lib/auth/account";
import { requireSessionUser, setSessionCookie } from "@/lib/auth/session";
import { handler, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

const body = z.object({
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(8, passwordSchemaMessage).max(200),
});

/** Change (or, for PayPal-only accounts, set) the password. Other sessions are signed out. */
export const POST = handler(async (req) => {
  const user = await requireSessionUser();
  rateLimit(`pwchange:${user.id}`, 10, 15 * 60_000);
  const { currentPassword, newPassword } = body.parse(await readJson(req));
  const updated = await changePassword(user, currentPassword, newPassword);
  await setSessionCookie(updated);
  return { ok: true };
});
