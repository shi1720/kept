import { requireUser } from "@/lib/auth/session";
import { updatePact } from "@/lib/domain/pacts";
import { getPactDetail } from "@/lib/domain/queries";
import { handler, readJson } from "@/lib/http";

export const GET = handler<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  return getPactDetail(user, id);
});

export const PATCH = handler<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  return { pact: await updatePact(user, id, await readJson(req)) };
});
