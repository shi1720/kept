import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ensureMigrated } from "@/lib/db/migrate";
import { AppError } from "@/lib/errors";

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function errorResponse(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof AppError) {
    const details = err.code === "payment_failed" ? undefined : err.details;
    return NextResponse.json({ error: { code: err.code, message: err.message, details } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid request",
          details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      },
      { status: 400 },
    );
  }
  console.error("[api] unhandled error", err);
  return NextResponse.json({ error: { code: "internal", message: "Something went wrong on our side" } }, { status: 500 });
}

type Ctx<P> = { params: Promise<P> };

/** Wrap a route handler with migrations, JSON parsing and uniform error responses. */
export function handler<P = Record<string, never>>(
  fn: (req: Request, params: P) => Promise<unknown>,
) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      await ensureMigrated();
      const params = ctx?.params ? await ctx.params : ({} as P);
      const result = await fn(req, params);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new AppError("invalid_request", "Request body must be valid JSON");
  }
}
