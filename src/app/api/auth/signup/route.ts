import { setSessionCookie } from "@/lib/auth/session";
import { createUser, signupInput } from "@/lib/auth/users";
import { handler, readJson } from "@/lib/http";

export const POST = handler(async (req) => {
  const input = signupInput.parse(await readJson(req));
  const user = await createUser(input);
  await setSessionCookie(user.id);
  return { user: { id: user.id, name: user.name, email: user.email } };
});
