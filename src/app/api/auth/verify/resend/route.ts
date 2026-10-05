import { sendVerificationEmail } from "@/lib/auth/account";
import { requireSessionUser } from "@/lib/auth/session";
import { emailConfigured } from "@/lib/env";
import { handler } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

/** Send (or re-send) the email-verification link to the signed-in user. */
export const POST = handler(async () => {
  const user = await requireSessionUser();
  if (user.emailVerifiedAt) return { alreadyVerified: true, sent: false, emailConfigured: emailConfigured() };
  rateLimit(`verify:${user.id}`, 5, 60 * 60_000);
  const res = await sendVerificationEmail(user);
  return { sent: res.delivered, emailConfigured: emailConfigured() };
});
