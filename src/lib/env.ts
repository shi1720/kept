/**
 * Centralised, typed access to environment configuration.
 *
 * Every integration degrades gracefully: with no PayPal credentials the app
 * runs against an in-process PayPal simulator, and with no AI key the referee
 * falls back to a deterministic offline engine. Both modes are surfaced in the
 * UI so nobody mistakes a simulation for the real thing.
 */

function str(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

function int(name: string, fallback: number): number {
  const v = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
}

export const env = {
  appUrl: (str("APP_URL") || str("RENDER_EXTERNAL_URL") || "http://localhost:3000").replace(/\/$/, ""),
  sessionSecret: str("SESSION_SECRET", "dev-only-insecure-secret-change-me-please-32b"),
  databaseUrl: str("DATABASE_URL", "file:./data/kept.db"),
  databaseAuthToken: str("DATABASE_AUTH_TOKEN"),
  cronSecret: str("CRON_SECRET", "dev-cron-secret"),
  adminEmails: str("ADMIN_EMAILS")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),

  paypal: {
    clientId: str("PAYPAL_CLIENT_ID"),
    clientSecret: str("PAYPAL_CLIENT_SECRET"),
    environment: str("PAYPAL_ENV", "sandbox") as "sandbox" | "live",
    webhookId: str("PAYPAL_WEBHOOK_ID"),
    /** Sandbox personal account that demo freelancers are paid out to. */
    demoPayoutEmail: str("PAYPAL_DEMO_PAYOUT_EMAIL"),
    loginEnabled: str("PAYPAL_LOGIN_ENABLED", "false") === "true",
    brandName: str("PAYPAL_BRAND_NAME", "Kept Escrow"),
  },

  ai: {
    anthropicKey: str("ANTHROPIC_API_KEY"),
    anthropicModel: str("ANTHROPIC_MODEL", "claude-opus-5-5"),
    geminiKey: str("GEMINI_API_KEY") || str("GOOGLE_API_KEY"),
    geminiModel: str("GEMINI_MODEL", "gemini-2.5-flash"),
    /** Force a provider: "anthropic" | "gemini" | "offline". Defaults to the first configured. */
    provider: str("AI_PROVIDER"),
    /** Reasoning effort for money-moving judgments (referee, mediator): low | medium | high. */
    judgeEffort: (["low", "medium", "high"].includes(str("AI_JUDGE_EFFORT")) ? str("AI_JUDGE_EFFORT") : "medium") as "low" | "medium" | "high",
  },

  github: {
    token: str("GITHUB_EVIDENCE_TOKEN"),
  },

  fees: {
    /** Kept protection fee in basis points, charged to the client on top of the milestone. */
    platformFeeBps: int("PLATFORM_FEE_BPS", 290),
    platformFeeMinCents: int("PLATFORM_FEE_MIN_CENTS", 100),
  },

  email: {
    /** Resend (https://resend.com, free tier) API key. Without it, emails are logged instead of sent. */
    resendKey: str("RESEND_API_KEY"),
    from: str("EMAIL_FROM", "Kept <onboarding@resend.dev>"),
    /** Tests/local dev only: also write every email as a JSON file into this folder. */
    outboxDir: str("EMAIL_OUTBOX_DIR"),
  },

  demo: {
    enabled: str("DEMO_MODE", "true") === "true",
  },
} as const;

if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  env.sessionSecret === "dev-only-insecure-secret-change-me-please-32b"
) {
  throw new Error("SESSION_SECRET must be set in production");
}

export const emailConfigured = () => Boolean(env.email.resendKey);

export const paypalConfigured = () => Boolean(env.paypal.clientId && env.paypal.clientSecret);

export const isProduction = process.env.NODE_ENV === "production";
