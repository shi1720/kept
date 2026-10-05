import { clearSessionCookie } from "@/lib/auth/session";
import { handler } from "@/lib/http";

export const POST = handler(async () => {
  await clearSessionCookie();
  return { ok: true };
});
