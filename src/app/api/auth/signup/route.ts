import { sendVerificationEmail } from "@/lib/auth/account";
import { setSessionCookie } from "@/lib/auth/session";
import { createUser, signupInput } from "@/lib/auth/users";
import { handler, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const POST = handler(async (req) => {
  rateLimit(`signup:${await clientIp()}`, 10, 60 * 60_000);
  const input = signupInput.parse(await readJson(req));
  const user = await createUser(input);
  await setSessionCookie(user);
  // Best effort: the account works without it; Settings and the dashboard offer a resend.
  const email = await sendVerificationEmail(user).catch((err) => {
    console.error("[signup] verification email failed", err);
    return { delivered: false };
  });
  return { user: { id: user.id, name: user.name, email: user.email }, verificationEmailSent: email.delivered };
});
