import { z } from "zod";
import { setSessionCookie } from "@/lib/auth/session";
import { createDemoWorkspace } from "@/lib/demo";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { handler } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const body = z.object({ as: z.enum(["client", "freelancer"]).default("client") });

/** One click → a private demo world (Maya the client ⇄ Ade the freelancer). */
export const POST = handler(async (req) => {
  if (!env.demo.enabled) throw new AppError("forbidden", "Demo mode is disabled on this deployment");
  rateLimit(`demo:${await clientIp()}`, 20, 3_600_000);
  const { as } = body.parse(await req.json().catch(() => ({})));
  const { client, freelancer } = await createDemoWorkspace();
  const user = as === "client" ? client : freelancer;
  await setSessionCookie(user.id);
  return { user: { id: user.id, name: user.name } };
});
