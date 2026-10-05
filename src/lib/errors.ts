export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_request"
  | "invalid_state"
  | "conflict"
  | "payment_failed"
  | "ai_unavailable"
  | "rate_limited"
  | "internal";

const STATUS: Record<ErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  invalid_request: 400,
  invalid_state: 409,
  conflict: 409,
  payment_failed: 402,
  ai_unavailable: 503,
  rate_limited: 429,
  internal: 500,
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
  get status() {
    return STATUS[this.code];
  }
}

export const notFound = (what: string) => new AppError("not_found", `${what} not found`);
export const forbidden = (msg = "You don't have access to this resource") => new AppError("forbidden", msg);
export const invalidState = (msg: string) => new AppError("invalid_state", msg);
export const badRequest = (msg: string, details?: unknown) => new AppError("invalid_request", msg, details);
