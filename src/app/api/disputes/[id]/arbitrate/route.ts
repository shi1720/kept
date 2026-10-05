import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { arbitrate } from "@/lib/domain/disputes";
import { handler, readJson } from "@/lib/http";

const body = z.object({ releasePct: z.number().int().min(0).max(100), note: z.string().max(2000).default("") });

export const POST = handler<{ id: string }>(async (req, { id }) => {
  const admin = await requireUser();
  const { releasePct, note } = body.parse(await readJson(req));
  await arbitrate(admin, id, releasePct, note);
  return { ok: true };
});
