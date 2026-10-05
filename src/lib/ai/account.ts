import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getClient } from "@/lib/db/client";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

export type ProviderName = "gemini" | "anthropic" | "openai";
const key = () => createHash("sha256").update(env.sessionSecret + ":ai-settings:v1").digest();
export function encryptKey(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  return Buffer.concat([iv, cipher.update(value), cipher.final(), cipher.getAuthTag()]).toString("base64");
}
export function decryptKey(value: string) {
  const data = Buffer.from(value, "base64");
  const cipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  cipher.setAuthTag(data.subarray(-16));
  return Buffer.concat([cipher.update(data.subarray(12, -16)), cipher.final()]).toString();
}
export async function accountAI(userId: string) {
  const result = await getClient().execute({ sql: "SELECT * FROM ai_accounts WHERE user_id = ?", args: [userId] });
  const row = result.rows[0];
  return { provider: (row?.provider || "gemini") as ProviderName, model: String(row?.model || env.ai.geminiModel), used: Number(row?.requests_used || 0), encryptedKey: row?.encrypted_key ? String(row.encrypted_key) : null };
}
export async function saveAccountAI(userId: string, provider: ProviderName, model: string, apiKey?: string, remove = false) {
  const current = await accountAI(userId);
  const encrypted = remove ? null : apiKey ? encryptKey(apiKey) : current.encryptedKey;
  if (!apiKey && !remove && current.encryptedKey && provider !== current.provider) throw new AppError("invalid_request", "Enter a key for the new provider");
  await getClient().execute({ sql: "INSERT INTO ai_accounts (user_id, provider, model, encrypted_key) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET provider=excluded.provider, model=excluded.model, encrypted_key=excluded.encrypted_key", args: [userId, provider, model, encrypted] });
}
export async function reserveFreeRequest(userId: string) {
  await getClient().execute({sql: "INSERT OR IGNORE INTO ai_accounts (user_id) VALUES (?)", args: [userId]});
  const result = await getClient().execute({sql: "UPDATE ai_accounts SET requests_used=requests_used+1 WHERE user_id=? AND requests_used<5 RETURNING requests_used", args: [userId]});
  if (!result.rows.length) throw new AppError("ai_unavailable", "Your included AI credits are used. Add your provider API key in Settings to continue.");
}
export async function refundFreeRequest(userId: string) {
  await getClient().execute({sql: "UPDATE ai_accounts SET requests_used=MAX(0, requests_used-1) WHERE user_id=?", args: [userId]});
}
