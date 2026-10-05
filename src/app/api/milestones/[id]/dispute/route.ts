import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { openDispute } from "@/lib/domain/disputes";
import { handler, readJson } from "@/lib/http";

export const maxDuration = 120;
const body = z.object({ reason: z.string().max(4000) });

export const POST = handler<{ id: string }>(async (req, { id }) => {
  const { reason } = body.parse(await readJson(req));
  return { dispute: await openDispute(await requireUser(), id, reason) };
});
