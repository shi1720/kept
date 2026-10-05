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
  system: string;
  content: ContentPart[];
  schema: T;
  /** "low" for quick extraction, "high" for judgments that move money. */
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}

export interface AIProvider {
  readonly name: "anthropic" | "gemini";
  readonly model: string;
  generate<T extends z.ZodType>(req: GenerateRequest<T>): Promise<z.infer<T>>;
}

/* ------------------------------------------------------------------ */

class AnthropicProvider implements AIProvider {
  readonly name = "anthropic" as const;
  readonly model = env.ai.anthropicModel;
  private client = new Anthropic({ apiKey: env.ai.anthropicKey, maxRetries: 2, timeout: 120_000 });

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
  readonly model = env.ai.geminiModel;
  private client = new GoogleGenAI({ apiKey: env.ai.geminiKey });

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

const g = globalThis as unknown as { __aiProviders?: AIProvider[] };

/** Configured providers in priority order. Empty means offline mode. */
export function getProviders(): AIProvider[] {
  if (g.__aiProviders) return g.__aiProviders;
  const list: AIProvider[] = [];
  const forced = env.ai.provider;
  if (forced !== "offline") {
    const anthropic = env.ai.anthropicKey ? new AnthropicProvider() : null;
    const gemini = env.ai.geminiKey ? new GeminiProvider() : null;
    const ordered = forced === "gemini" ? [gemini, anthropic] : [anthropic, gemini];
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
 * waits on a flaky API — but a degraded result is always labelled as such.
 */
export async function generateWithFallback<T extends z.ZodType>(
  req: GenerateRequest<T>,
  offline: () => z.infer<T> | Promise<z.infer<T>>,
): Promise<Generated<z.infer<T>>> {
  const providers = getProviders();
  for (const p of providers) {
    try {
      const output = await p.generate(req);
      return { output, provider: p.name, model: p.model, degraded: false };
    } catch (err) {
      console.error(`[ai] ${p.name}/${p.model} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return {
    output: await offline(),
    provider: "offline",
    model: "kept-heuristic-v1",
    degraded: providers.length > 0,
  };
}
