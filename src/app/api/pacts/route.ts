import { requireUser } from "@/lib/auth/session";
import { createPact, listPactsForUser } from "@/lib/domain/pacts";
import { handler, readJson } from "@/lib/http";

export const GET = handler(async () => {
  const user = await requireUser();
  return { pacts: await listPactsForUser(user) };
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  const pact = await createPact(user, await readJson(req), "web");
  return { pact };
});
