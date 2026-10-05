import { z } from "zod";
import { setSessionCookie } from "@/lib/auth/session";
import { authenticate } from "@/lib/auth/users";
import { handler, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const body = z.object({ email: z.string().min(3), password: z.string().min(1) });

export const POST = handler(async (req) => {
  const { email, password } = body.parse(await readJson(req));
  rateLimit(`login:${await clientIp()}`, 30, 15 * 60_000);
  const user = await authenticate(email, password);
  await setSessionCookie(user);
  return { user: { id: user.id, name: user.name, email: user.email } };
});
