import { requireUser } from "@/lib/auth/session";
import { declinePact } from "@/lib/domain/pacts";
import { handler } from "@/lib/http";

export const POST = handler<{ token: string }>(async (_req, { token }) => {
  await declinePact(await requireUser(), token);
  return { ok: true };
});
