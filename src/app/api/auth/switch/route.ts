import { requireUser, setSessionCookie } from "@/lib/auth/session";
import { demoCounterpart } from "@/lib/demo";
import { AppError } from "@/lib/errors";
import { handler } from "@/lib/http";

/** Demo only: flip between Maya (client) and Ade (freelancer) in the same workspace. */
export const POST = handler(async () => {
  const user = await requireUser();
  const other = await demoCounterpart(user);
  if (!other) throw new AppError("forbidden", "Persona switching is only available in demo workspaces");
  await setSessionCookie(other.id);
  return { user: { id: other.id, name: other.name } };
});
