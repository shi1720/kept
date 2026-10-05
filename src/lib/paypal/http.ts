import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

export const PAYPAL_API_BASE =
  env.paypal.environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

export const PAYPAL_WEB_BASE =
  env.paypal.environment === "live" ? "https://www.paypal.com" : "https://www.sandbox.paypal.com";

interface CachedToken {
  value: string;
  expiresAt: number;
}

const g = globalThis as unknown as { __paypalToken?: CachedToken };

export function basicAuthHeader(): string {
  return `Basic ${Buffer.from(`${env.paypal.clientId}:${env.paypal.clientSecret}`).toString("base64")}`;
}

/** OAuth2 client-credentials token, cached until 60s before expiry. */
export async function getAccessToken(): Promise<string> {
  const cached = g.__paypalToken;
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.value;

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new AppError("payment_failed", `PayPal authentication failed (${res.status})`, await safeJson(res));
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  g.__paypalToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export interface PayPalErrorBody {
  name?: string;
  message?: string;
  debug_id?: string;
  details?: { issue?: string; description?: string; field?: string }[];
}

export class PayPalApiError extends AppError {
  constructor(
    public readonly httpStatus: number,
    public readonly body: PayPalErrorBody | unknown,
    public readonly debugId?: string,
  ) {
    const b = body as PayPalErrorBody;
    const issue = b?.details?.[0]?.issue;
    super("payment_failed", `PayPal ${b?.name ?? httpStatus}${issue ? `: ${issue}` : ""}; ${b?.message ?? "request failed"}`, {
      body,
      debugId,
    });
  }
  get issue(): string | undefined {
    return (this.body as PayPalErrorBody)?.details?.[0]?.issue;
  }
}

/**
 * Authenticated JSON request against the PayPal REST API with idempotency
 * (PayPal-Request-Id) and bounded retries on 5xx / network errors.
 */
export async function paypalRequest<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  opts: { body?: unknown; rawBody?: string; requestId?: string; headers?: Record<string, string>; retries?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${PAYPAL_API_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
          ...(opts.requestId ? { "PayPal-Request-Id": opts.requestId } : {}),
          ...opts.headers,
        },
        body: opts.rawBody ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
        cache: "no-store",
      });
      if (res.status === 401 && attempt < retries) {
        g.__paypalToken = undefined;
        continue;
      }
      if (res.status >= 500 && attempt < retries) {
        await sleep(300 * 2 ** attempt);
        continue;
      }
      const body = res.status === 204 ? {} : await safeJson(res);
      if (!res.ok) throw new PayPalApiError(res.status, body, res.headers.get("paypal-debug-id") ?? undefined);
      return body as T;
    } catch (err) {
      lastErr = err;
      if (err instanceof PayPalApiError) throw err;
      if (attempt < retries) await sleep(300 * 2 ** attempt);
    }
  }
  throw lastErr instanceof Error ? lastErr : new AppError("payment_failed", "PayPal request failed");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
