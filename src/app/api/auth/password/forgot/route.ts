import { z } from "zod";
import { requestPasswordReset } from "@/lib/auth/account";
import { emailConfigured } from "@/lib/env";
import { handler, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const body = z.object({ email: z.email("Enter a valid email") });

/** Email a reset link if an account exists. The response is the same either way. */
export const POST = handler(async (req) => {
  const { email } = body.parse(await readJson(req));
  rateLimit(`forgot:${await clientIp()}`, 10, 15 * 60_000);
  rateLimit(`forgot:${email.toLowerCase()}`, 3, 15 * 60_000);
  await requestPasswordReset(email);
  return { ok: true, emailConfigured: emailConfigured() };
});
