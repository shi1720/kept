import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { respondToRuling } from "@/lib/domain/disputes";
import { handler, readJson } from "@/lib/http";

const body = z.object({ accept: z.boolean(), revision: z.number().int().nonnegative().optional() });

export const POST = handler<{ id: string }>(async (req, { id }) => {
  const { accept, revision } = body.parse(await readJson(req));
  return { dispute: await respondToRuling(await requireUser(), id, accept, revision) };
});
