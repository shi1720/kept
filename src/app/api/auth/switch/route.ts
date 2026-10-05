import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, requireUser, setSessionCookie } from "@/lib/auth/session";
import type { User } from "@/lib/db/schema";
import { ensureMigrated } from "@/lib/db/migrate";
import { demoCounterpart } from "@/lib/demo";
import { loadPact, roleOf } from "@/lib/domain/context";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { handler } from "@/lib/http";

/**
 * Where should this persona land? If the page they were on isn't theirs to see (e.g. a pact the
 * other persona hasn't countersigned yet), send them to their invitation or the dashboard instead
 * of a 404.
 */
async function safeDestination(user: User, path: string | null | undefined): Promise<string> {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/app";
  const m = path.match(/^\/app\/pacts\/(pct_[a-z0-9]+)/);
  if (!m) return path;
  const pact = await loadPact(m[1]).catch(() => null);
  if (!pact) return "/app";
  if (roleOf(user, pact) || pact.creatorId === user.id) return path;
  // Same rule as everywhere else: an email-addressed invite only opens for a verified owner of that address.
  if (pact.status === "pending_acceptance" && user.emailVerifiedAt && pact.counterpartyEmail === user.email) return `/invite/${pact.inviteToken}`;
  return "/app";
}

const body = z.object({ path: z.string().max(500).optional() });

/** Demo only: flip between Maya (client) and Ana (freelancer) in the same workspace. */
export const POST = handler(async (req) => {
  const user = await requireUser();
  const other = await demoCounterpart(user);
  if (!other) throw new AppError("forbidden", "Persona switching is only available in demo workspaces");
  const { path } = body.parse(await req.json().catch(() => ({})));
  await setSessionCookie(other);
  return { user: { id: other.id, name: other.name }, redirect: await safeDestination(other, path) };
});

/** Link form used by the guided tour: /api/auth/switch?as=Ana&next=/app/pacts/… */
export async function GET(req: Request) {
  await ensureMigrated();
  const url = new URL(req.url);
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${env.appUrl}/login`);
  let target = user;
  const want = url.searchParams.get("as");
  if (want && !user.name.startsWith(want)) {
    const other = await demoCounterpart(user);
    if (other) {
      await setSessionCookie(other);
      target = other;
    }
  }
  return NextResponse.redirect(`${env.appUrl}${await safeDestination(target, url.searchParams.get("next"))}`);
}
