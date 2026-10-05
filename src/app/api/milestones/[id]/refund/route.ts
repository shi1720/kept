import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { refundByFreelancer } from "@/lib/domain/work";
import { handler, readJson } from "@/lib/http";

const body = z.object({ reason: z.string().max(1000).default("") });

export const POST = handler<{ id: string }>(async (req, { id }) => {
  const { reason } = body.parse(await readJson(req));
  await refundByFreelancer(await requireUser(), id, reason);
  return { ok: true };
});
