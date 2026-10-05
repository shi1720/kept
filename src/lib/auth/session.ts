import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies, headers } from "next/headers";
import { createHash } from "node:crypto";
import { db } from "@/lib/db/client";
import { apiKeys, users, type User } from "@/lib/db/schema";
import { ensureMigrated } from "@/lib/db/migrate";
import { env, isProduction } from "@/lib/env";
import { AppError } from "@/lib/errors";

export const SESSION_COOKIE = "kept_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

const secretKey = () => new TextEncoder().encode(env.sessionSecret);

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export const hashApiKey = (key: string) => createHash("sha256").update(key).digest("hex");

export interface Actor {
  user: User;
  via: "session" | "api_key";
}

/** Resolve the current user from a session cookie or a `Bearer kept_sk_…` API key. */
export async function getActor(): Promise<Actor | null> {
  await ensureMigrated();
  const h = await headers();
  const auth = h.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const key = auth.slice(7).trim();
    const [row] = await db
      .select({ user: users, keyId: apiKeys.id, revokedAt: apiKeys.revokedAt })
      .from(apiKeys)
      .innerJoin(users, eq(users.id, apiKeys.userId))
      .where(eq(apiKeys.keyHash, hashApiKey(key)))
      .limit(1);
    if (!row || row.revokedAt) return null;
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.keyId));
    return { user: row.user, via: "api_key" };
  }

  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const uid = await verifySessionToken(token);
  if (!uid) return null;
  const [user] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  return user ? { user, via: "session" } : null;
}

export async function getCurrentUser(): Promise<User | null> {
  return (await getActor())?.user ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("unauthorized", "Please sign in to continue");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") throw new AppError("forbidden", "Admins only");
  return user;
}
