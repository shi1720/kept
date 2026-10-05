import { z } from "zod";
import { setSessionCookie } from "@/lib/auth/session";
import { authenticate } from "@/lib/auth/users";
import { handler, readJson } from "@/lib/http";

const body = z.object({ email: z.string().min(3), password: z.string().min(1) });

export const POST = handler(async (req) => {
  const { email, password } = body.parse(await readJson(req));
  const user = await authenticate(email, password);
  await setSessionCookie(user.id);
  return { user: { id: user.id, name: user.name, email: user.email } };
});
