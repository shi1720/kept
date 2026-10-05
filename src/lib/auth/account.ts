import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db/client";
import { authTokens, users, type AuthToken, type User } from "@/lib/db/schema";
import { sendEmail, type SendResult } from "@/lib/email";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { hashPassword, verifyPassword } from "./password";

/**
 * Email verification, password reset and password change.
 *
 * Links carry a random 256-bit token; only its SHA-256 hash is stored, each token works once, and
 * issuing a new one cancels older unused ones of the same kind. Resetting or changing a password
 * bumps the user's sessionVersion, which signs out every other session.
 */

const TTL_MS: Record<AuthToken["kind"], number> = {
  verify_email: 48 * 3_600_000,
  reset_password: 3_600_000,
};

export const passwordSchemaMessage = "Use at least 8 characters";
const MIN_PASSWORD = 8;

const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Admin rights from ADMIN_EMAILS only ever attach to an address the user has proved they own. */
export const isAdminEmail = (email: string) => env.adminEmails.includes(email.toLowerCase());

async function issueToken(user: User, kind: AuthToken["kind"]): Promise<string> {
  const now = new Date();
  await db
    .update(authTokens)
    .set({ usedAt: now })
    .where(and(eq(authTokens.userId, user.id), eq(authTokens.kind, kind), isNull(authTokens.usedAt)));
  const raw = randomBytes(32).toString("base64url");
  await db.insert(authTokens).values({
    id: newId("atk"),
    userId: user.id,
    kind,
    tokenHash: hashToken(raw),
    email: user.email,
    expiresAt: new Date(now.getTime() + TTL_MS[kind]),
  });
  return raw;
}

/** Use a token exactly once (compare-and-set on usedAt). Returns null if unknown, used or expired. */
async function consumeToken(raw: string, kind: AuthToken["kind"]): Promise<AuthToken | null> {
  if (!raw || raw.length > 200) return null;
  const [row] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.tokenHash, hashToken(raw)), eq(authTokens.kind, kind), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .returning();
  return row ?? null;
}

/** Look at a token without using it (to decide what the reset page shows). */
export async function peekToken(raw: string, kind: AuthToken["kind"]): Promise<"valid" | "invalid"> {
  if (!raw || raw.length > 200) return "invalid";
  const [row] = await db
    .select({ id: authTokens.id })
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, hashToken(raw)), eq(authTokens.kind, kind), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .limit(1);
  return row ? "valid" : "invalid";
}

async function markVerified(userId: string, email: string) {
  await db
    .update(users)
    .set({ emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, ${Date.now()})`, ...(isAdminEmail(email) ? { role: "admin" as const } : {}) })
    .where(and(eq(users.id, userId), eq(users.email, email)));
}

/* ------------------------------------------------------------------ */
/* Email verification                                                   */
/* ------------------------------------------------------------------ */

export async function sendVerificationEmail(user: User): Promise<SendResult & { alreadyVerified?: boolean }> {
  if (user.emailVerifiedAt) return { delivered: false, via: "log", alreadyVerified: true };
  const raw = await issueToken(user, "verify_email");
  return sendEmail({
    to: user.email,
    subject: "Confirm your email for Kept",
    text: `Hi ${user.name.split(" ")[0]},\n\nConfirm that ${user.email} is yours. Once it's verified, pacts that people send to this address show up in your Kept dashboard automatically.\n\nThe link works once and expires in 48 hours. If you didn't create a Kept account, ignore this email.`,
    action: { label: "Confirm my email", url: `${env.appUrl}/verify-email?token=${raw}` },
  });
}

export async function verifyEmail(raw: string): Promise<User> {
  const token = await consumeToken(raw, "verify_email");
  if (!token) throw new AppError("invalid_request", "This verification link is invalid or has expired. Sign in and send a new one from Settings.");
  const [user] = await db.select().from(users).where(eq(users.id, token.userId)).limit(1);
  if (!user || user.email !== token.email) throw new AppError("invalid_request", "This link was for a different email address. Send a new one from Settings.");
  await markVerified(user.id, user.email);
  const [fresh] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return fresh;
}

/* ------------------------------------------------------------------ */
/* Password reset                                                       */
/* ------------------------------------------------------------------ */

/** Always succeeds from the caller's point of view, so it can't be used to find out who has an account. */
export async function requestPasswordReset(email: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  if (!user || user.demoWorkspace) return;
  const raw = await issueToken(user, "reset_password");
  await sendEmail({
    to: user.email,
    subject: "Reset your Kept password",
    text: `Hi ${user.name.split(" ")[0]},\n\nSomeone (hopefully you) asked to reset the password for ${user.email}. Choose a new password with the link below. It works once and expires in 1 hour, and it signs you out everywhere else.\n\nIf you didn't ask for this, you can ignore this email; your password stays the same.`,
    action: { label: "Choose a new password", url: `${env.appUrl}/reset-password?token=${raw}` },
  });
}

export async function resetPassword(raw: string, password: string): Promise<User> {
  assertPassword(password);
  const token = await consumeToken(raw, "reset_password");
  if (!token) throw new AppError("invalid_request", "This reset link is invalid or has expired. Ask for a new one.");
  const [user] = await db.select().from(users).where(eq(users.id, token.userId)).limit(1);
  if (!user) throw new AppError("invalid_request", "This reset link is invalid or has expired. Ask for a new one.");
  const [updated] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, user.id))
    .returning();
  // Opening a link sent to the inbox also proves the address belongs to them.
  if (user.email === token.email) await markVerified(user.id, user.email);
  return (await db.select().from(users).where(eq(users.id, updated.id)).limit(1))[0];
}

/* ------------------------------------------------------------------ */
/* Signed-in account changes                                            */
/* ------------------------------------------------------------------ */

export async function changePassword(user: User, current: string | undefined, next: string): Promise<User> {
  assertPassword(next);
  if (user.passwordHash && !(current && (await verifyPassword(current, user.passwordHash)))) {
    throw new AppError("unauthorized", "Your current password isn't right");
  }
  const [updated] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(next), sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, user.id))
    .returning();
  return updated;
}

/** Sign out every session; the caller re-issues a cookie for the current browser. */
export async function revokeSessions(user: User): Promise<User> {
  const [updated] = await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, user.id))
    .returning();
  return updated;
}

function assertPassword(password: string) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD || password.length > 200) {
    throw new AppError("invalid_request", passwordSchemaMessage);
  }
}
