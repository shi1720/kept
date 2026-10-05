import { accountAI, decryptKey, reserveFreeRequest, refundFreeRequest } from "./account";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; mime: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; base64: string }
  | { type: "pdf"; base64: string };

export interface GenerateRequest<T extends z.ZodType> {
  userId?: string;
  system: string;
  content: ContentPart[];
  schema: T;
  /** "low" for quick extraction, "high" for judgments that move money. */
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}

export interface AIProvider {
  readonly name: "anthropic" | "gemini" | "openai";
  readonly model: string;
  generate<T extends z.ZodType>(req: GenerateRequest<T>): Promise<z.infer<T>>;
}

/* ------------------------------------------------------------------ */

class AnthropicProvider implements AIProvider {
  readonly name = "anthropic" as const;
  private client: Anthropic;
  constructor(apiKey = env.ai.anthropicKey, readonly model = env.ai.anthropicModel) { this.client = new Anthropic({ apiKey, maxRetries: 1, timeout: 120_000 }); }

  async generate<T extends z.ZodType>(req: GenerateRequest<T>): Promise<z.infer<T>> {
    const content: Anthropic.Beta.BetaContentBlockParam[] = req.content.map((p) => {
      if (p.type === "text") return { type: "text", text: p.text };
      if (p.type === "image")
        return { type: "image", source: { type: "base64", media_type: p.mime, data: p.base64 } };
      return { type: "document", source: { type: "base64", media_type: "application/pdf", data: p.base64 } };
    });

    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: req.maxTokens ?? 16000,
      // Server-side refusal fallback: if the primary model declines, the API
      // re-runs the request on a fallback model inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: req.effort ?? "medium", format: betaZodOutputFormat(req.schema) },
      system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") {
      throw new AppError("ai_unavailable", "The AI referee declined to evaluate this content");
    }
    if (response.parsed_output == null) {
      throw new AppError("ai_unavailable", `AI returned an unparseable response (stop: ${response.stop_reason})`);
    }
    return response.parsed_output as z.infer<T>;
  }
}

/* ------------------------------------------------------------------ */

class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;
  private client: GoogleGenAI;
  constructor(apiKey = env.ai.geminiKey, readonly model = env.ai.geminiModel, vertex = false) { this.client = new GoogleGenAI(vertex ? {vertexai:true, project:env.ai.vertexProject, location:"global"} : { apiKey }); }

  async generate<T extends z.ZodType>(req: GenerateRequest<T>): Promise<z.infer<T>> {
    const parts = req.content.map((p) => {
      if (p.type === "text") return { text: p.text };
      if (p.type === "image") return { inlineData: { mimeType: p.mime, data: p.base64 } };
      return { inlineData: { mimeType: "application/pdf", data: p.base64 } };
    });
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: req.system,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(req.schema, { target: "draft-7" }),
        maxOutputTokens: req.maxTokens ?? 16000,
        temperature: 0.2,
      },
    });
    const text = response.text;
    if (!text) throw new AppError("ai_unavailable", "Gemini returned an empty response");
    const parsed = req.schema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new AppError("ai_unavailable", "Gemini response did not match the schema");
    return parsed.data;
  }
}

/* ------------------------------------------------------------------ */

class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;
  constructor(private apiKey: string, readonly model: string) {}
  async generate<T extends z.ZodType>(req: GenerateRequest<T>): Promise<z.infer<T>> {
    const content = req.content.map(p => p.type === "text" ? { type: "input_text", text: p.text } : p.type === "image" ? { type: "input_image", image_url: `data:${p.mime};base64,${p.base64}` } : { type: "input_file", filename: "evidence.pdf", file_data: `data:application/pdf;base64,${p.base64}` });
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", signal: AbortSignal.timeout(120000),
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, instructions: req.system, input: [{ role: "user", content }], max_output_tokens: req.maxTokens ?? 16000, text: { format: { type: "json_schema", name: "kept_result", strict: true, schema: z.toJSONSchema(req.schema) } } }),
    });
    if (!response.ok) throw new AppError("ai_unavailable", `OpenAI request failed (${response.status})`);
    const data = await response.json();
    const text = data.output?.flatMap((item: {content?: {type: string; text?: string}[]}) => item.content ?? []).filter((part: {type: string}) => part.type === "output_text").map((part: {text: string}) => part.text).join("");
    if (!text) throw new AppError("ai_unavailable", "OpenAI returned no review");
    return req.schema.parse(JSON.parse(text));
  }
}

const g = globalThis as unknown as { __aiProviders?: AIProvider[] };

/** Configured providers in priority order. Empty means offline mode. */
export function getProviders(): AIProvider[] {
  if (g.__aiProviders) return g.__aiProviders;
  const list: AIProvider[] = [];
  const forced = env.ai.provider;
  if (forced !== "offline") {
    const anthropic = env.ai.anthropicKey ? new AnthropicProvider() : null;
    const gemini = env.ai.vertexProject ? new GeminiProvider(undefined, env.ai.geminiModel, true) : env.ai.geminiKey ? new GeminiProvider() : null;
    const ordered = forced === "anthropic" ? [anthropic, gemini] : [gemini, anthropic];
    for (const p of ordered) if (p) list.push(p);
  }
  g.__aiProviders = list;
  return list;
}

export function setProviders(providers: AIProvider[]) {
  g.__aiProviders = providers;
}

export function aiStatus() {
  const [primary] = getProviders();
  return primary
    ? { mode: "live" as const, provider: primary.name, model: primary.model }
    : { mode: "offline" as const, provider: "offline", model: "kept-heuristic-v1" };
}

export interface Generated<T> {
  output: T;
  provider: string;
  model: string;
  degraded: boolean;
}

/**
 * Run a task against each configured provider in turn, falling back to the
 * deterministic offline implementation if every provider fails. Money never
 * waits on a flaky API; but a degraded result is always labelled as such.
 */
export async function generateWithFallback<T extends z.ZodType>(
  req: GenerateRequest<T>,
  offline: () => z.infer<T> | Promise<z.infer<T>>,
): Promise<Generated<z.infer<T>>> {
  let providers = getProviders();
  let reserved = false;
  if (req.userId) {
    const settings = await accountAI(req.userId);
    if (settings.encryptedKey) {
      const apiKey = decryptKey(settings.encryptedKey);
      providers = [settings.provider === "gemini" ? new GeminiProvider(apiKey, settings.model) : settings.provider === "anthropic" ? new AnthropicProvider(apiKey, settings.model) : new OpenAIProvider(apiKey, settings.model)];
    } else if (providers.length) {
      await reserveFreeRequest(req.userId);
      reserved = true;
    }
  }
  for (const p of providers) {
    try {
      const output = await p.generate(req);
      return { output, provider: p.name, model: p.model, degraded: false };
    } catch (err) {
      console.error(`[ai] ${p.name}/${p.model} failed (${err instanceof Error ? err.name : "unknown"})`);
    }
  }
  if (reserved && req.userId) await refundFreeRequest(req.userId);
  return {
    output: await offline(),
    provider: "offline",
    model: "kept-heuristic-v1",
    degraded: providers.length > 0,
  };
}
