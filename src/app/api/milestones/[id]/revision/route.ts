import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { requestRevision } from "@/lib/domain/work";
import { handler, readJson } from "@/lib/http";

const body = z.object({ note: z.string().max(4000), feedbackToken:z.string().min(1) });

export const POST = handler<{ id: string }>(async (req, { id }) => {
  const { note, feedbackToken } = body.parse(await readJson(req));
  await requestRevision(await requireUser(), id, note, feedbackToken);
  return { ok: true };
});
