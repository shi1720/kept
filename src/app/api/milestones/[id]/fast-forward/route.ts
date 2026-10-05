import { requireUser } from "@/lib/auth/session";
import { fastForwardReview } from "@/lib/domain/sweep";
import { handler } from "@/lib/http";

export const maxDuration = 120;

export const POST = handler<{ id: string }>(async (_req, { id }) => {
  return { report: await fastForwardReview(await requireUser(), id) };
});
