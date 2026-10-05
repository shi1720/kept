import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { accountAI, saveAccountAI } from "@/lib/ai/account";
import { handler, readJson } from "@/lib/http";
const input = z.object({ provider: z.enum(["gemini", "anthropic", "openai"]), model: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9._:-]+$/), apiKey: z.string().trim().max(500).optional(), remove: z.boolean().optional() });
export const GET = handler(async () => {
 const user = await requireSessionUser();
 const settings = await accountAI(user.id);
 return { provider: settings.provider, model: settings.model, used: settings.used, remaining: 5-settings.used, hasKey: Boolean(settings.encryptedKey) };
});
export const PUT = handler(async req => {
 const user = await requireSessionUser();
 const body = input.parse(await readJson(req));
 await saveAccountAI(user.id, body.provider, body.model, body.apiKey, body.remove);
 return { ok: true };
});
