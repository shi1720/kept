import { requireUser } from "@/lib/auth/session";
import { acceptPact } from "@/lib/domain/pacts";
import { handler } from "@/lib/http";

export const POST = handler<{ token: string }>(async (_req, { token }) => {
  const pact = await acceptPact(await requireUser(), token);
  return { pact };
});
