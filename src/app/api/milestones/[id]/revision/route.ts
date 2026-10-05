import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { requestRevision } from "@/lib/domain/work";
import { handler, readJson } from "@/lib/http";

const body = z.object({ note: z.string().max(2000) });

export const POST = handler<{ id: string }>(async (req, { id }) => {
  const { note } = body.parse(await readJson(req));
  await requestRevision(await requireUser(), id, note);
  return { ok: true };
});
