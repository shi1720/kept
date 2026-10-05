import { requireUser } from "@/lib/auth/session";
import { cancelPact } from "@/lib/domain/pacts";
import { handler } from "@/lib/http";

export const POST = handler<{ id: string }>(async (_req, { id }) => {
  await cancelPact(await requireUser(), id);
  return { ok: true };
});
