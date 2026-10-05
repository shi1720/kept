import { z } from "zod";
import { passwordSchemaMessage, resetPassword } from "@/lib/auth/account";
import { setSessionCookie } from "@/lib/auth/session";
import { handler, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const body = z.object({ token: z.string().min(10).max(200), password: z.string().min(8, passwordSchemaMessage).max(200) });

/** Set a new password from an emailed link; signs out every other session and signs this browser in. */
export const POST = handler(async (req) => {
  rateLimit(`reset:${await clientIp()}`, 20, 15 * 60_000);
  const { token, password } = body.parse(await readJson(req));
  const user = await resetPassword(token, password);
  await setSessionCookie(user);
  return { ok: true };
});
