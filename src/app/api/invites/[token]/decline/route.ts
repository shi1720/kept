import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { declinePact } from "@/lib/domain/pacts";
import { handler } from "@/lib/http";

const body = z.object({ message: z.string().max(1000).nullish() });

/** Send the pact back to its author as a draft, optionally saying what should change. */
export const POST = handler<{ token: string }>(async (req, { token }) => {
  const { message } = body.parse(await req.json().catch(() => ({})));
  await declinePact(await requireUser(), token, message);
  return { ok: true };
});
