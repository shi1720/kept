import { revokeSessions } from "@/lib/auth/account";
import { requireSessionUser, setSessionCookie } from "@/lib/auth/session";
import { handler } from "@/lib/http";

/** Sign out every other browser; this one stays signed in. */
export const POST = handler(async () => {
  const user = await requireSessionUser();
  const updated = await revokeSessions(user);
  await setSessionCookie(updated);
  return { ok: true };
});
