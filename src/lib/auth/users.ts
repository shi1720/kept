import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { users, type User } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { hashPassword, verifyPassword } from "./password";

export const signupInput = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(80),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  headline: z.string().trim().max(120).optional(),
});

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .slice(0, 24) || "user"
  );
}

async function uniqueHandle(base: string): Promise<string> {
  const root = slugify(base);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const [hit] = await db.select({ id: users.id }).from(users).where(eq(users.handle, candidate)).limit(1);
    if (!hit) return candidate;
  }
  return `${root}-${newId("usr").slice(4)}`;
}

export async function createUser(input: {
  name: string;
  email: string;
  password?: string;
  headline?: string;
  paypalEmail?: string | null;
  paypalPayerId?: string | null;
  paypalVerified?: boolean;
  demoWorkspace?: string | null;
  avatarHue?: number;
  handle?: string;
}): Promise<User> {
  const email = input.email.toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) throw new AppError("conflict", "An account with this email already exists — sign in instead");
  const id = newId("usr");
  const [user] = await db
    .insert(users)
    .values({
      id,
      email,
      name: input.name,
      handle: input.handle ?? (await uniqueHandle(input.name)),
      headline: input.headline ?? null,
      passwordHash: input.password ? await hashPassword(input.password) : null,
      role: env.adminEmails.includes(email) ? "admin" : "user",
      paypalEmail: input.paypalEmail ?? null,
      paypalPayerId: input.paypalPayerId ?? null,
      paypalVerified: input.paypalVerified ?? false,
      demoWorkspace: input.demoWorkspace ?? null,
      avatarHue: input.avatarHue ?? Math.floor(Math.random() * 360),
    })
    .returning();
  return user;
}

export async function authenticate(email: string, password: string): Promise<User> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError("unauthorized", "That email and password don't match");
  }
  return user;
}
