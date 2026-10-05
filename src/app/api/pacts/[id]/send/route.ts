import { requireUser } from "@/lib/auth/session";
import { sendPact } from "@/lib/domain/pacts";
import { env } from "@/lib/env";
import { handler } from "@/lib/http";

export const POST = handler<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  const pact = await sendPact(user, id);
  return { pact, inviteUrl: `${env.appUrl}/invite/${pact.inviteToken}` };
});
