import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { addStatement } from "@/lib/domain/disputes";
import { handler, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;
const body = z.object({ statement: z.string().max(4000) });

export const POST = handler<{ id: string }>(async (req, { id }) => {
  rateLimit(`mediate:${(await requireUser()).id}`, 30, 3_600_000);
  const { statement } = body.parse(await readJson(req));
  return { dispute: await addStatement(await requireUser(), id, statement) };
});
