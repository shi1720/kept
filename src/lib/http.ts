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
          message: first ? describeIssue(first) : "Invalid request",
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

/* ------------------------------------------------------------------ */
/* Human-readable validation messages                                   */
/* ------------------------------------------------------------------ */

const FIELD_LABELS: Record<string, string> = {
  title: "title",
  summary: "summary",
  description: "description",
  amount: "amount",
  dueInDays: "due date",
  criteria: "acceptance criteria",
  text: "",
  email: "Email",
  password: "Password",
  name: "Name",
  counterpartyEmail: "The other person's email",
  counterpartyName: "The other person's name",
  sourceText: "The conversation",
  statement: "Your statement",
  reason: "The reason",
  revisionsIncluded: "Revisions included",
  reviewWindowHours: "Review window",
  ipTransfer: "Ownership terms",
};

function fieldLabel(path: PropertyKey[]): string {
  const parts: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const key = String(path[i]);
    const next = path[i + 1];
    if (key === "milestones" && typeof next === "number") {
      parts.push(`Milestone ${next + 1}`);
      i++;
    } else if (key === "criteria" && typeof next === "number") {
      parts.push(`criterion ${next + 1}`);
      i++;
    } else if (key === "terms") {
      continue;
    } else if (FIELD_LABELS[key] !== undefined) {
      if (FIELD_LABELS[key]) parts.push(FIELD_LABELS[key]);
    } else {
      parts.push(key.replace(/([A-Z])/g, " $1").toLowerCase());
    }
  }
  const label = parts.join(", ").replace(/, (title|summary|description|amount|due date|acceptance criteria)$/, " $1");
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "This field";
}

/** "milestones.0.title: Too small: expected string to have >=2 characters" → "Milestone 1 title is too short (at least 2 characters)". */
export function describeIssue(issue: ZodError["issues"][number]): string {
  const isDefault = /^(Too small|Too big|Invalid|Expected)/.test(issue.message);
  if (!isDefault) return issue.message;
  const label = fieldLabel(issue.path);
  const i = issue as unknown as { code: string; origin?: string; minimum?: number | bigint; maximum?: number | bigint; inclusive?: boolean; format?: string; input?: unknown };
  switch (i.code) {
    case "too_small":
      if (i.origin === "string") return Number(i.minimum) <= 1 ? `${label} can't be empty` : `${label} is too short (at least ${i.minimum} characters)`;
      if (i.origin === "array") return label.endsWith("acceptance criteria") ? `${label.replace(/ acceptance criteria$/, "")} needs at least ${i.minimum} acceptance criterion` : `${label} needs at least ${i.minimum}`;
      return i.inclusive === false ? `${label} must be more than ${i.minimum}` : `${label} must be at least ${i.minimum}`;
    case "too_big":
      if (i.origin === "string") return `${label} is too long (at most ${i.maximum} characters)`;
      if (i.origin === "array") return `${label} can have at most ${i.maximum}`;
      return i.inclusive === false ? `${label} must be less than ${i.maximum}` : `${label} must be at most ${i.maximum}`;
    case "invalid_format":
      if (i.format === "email") return label === "Email" ? "Enter a valid email address" : `${label} isn't a valid email address`;
      return `${label} isn't in the right format`;
    case "invalid_type":
      return i.input === undefined ? `${label} is required` : `${label} has the wrong type`;
    default:
      return `${label} isn't valid`;
  }
}
