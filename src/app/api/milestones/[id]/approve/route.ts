import { requireUser } from "@/lib/auth/session";
import { approveMilestone } from "@/lib/domain/work";
import { handler } from "@/lib/http";

export const POST = handler<{ id: string }>(async (_req, { id }) => {
  await approveMilestone(await requireUser(), id);
  return { ok: true };
});
