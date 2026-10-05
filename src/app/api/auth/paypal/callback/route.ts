import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser, setSessionCookie } from "@/lib/auth/session";
import { createUser } from "@/lib/auth/users";
import { db } from "@/lib/db/client";
import { ensureMigrated } from "@/lib/db/migrate";
import { users } from "@/lib/db/schema";
import { retryPayoutsForFreelancer } from "@/lib/domain/settlement";
import { env } from "@/lib/env";
import { exchangePayPalCode } from "@/lib/paypal/identity";

export async function GET(req: Request) {
  await ensureMigrated();
  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get("kept_oauth_state")?.value;
  jar.delete("kept_oauth_state");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!code || !state || state !== expected) {
    return NextResponse.redirect(`${env.appUrl}/login?error=paypal_state`);
  }
  try {
    const identity = await exchangePayPalCode(code);
    const patch = { paypalPayerId: identity.payerId, paypalEmail: identity.email, paypalVerified: identity.verified };

    if (state.startsWith("link.")) {
      const current = await getCurrentUser();
      if (!current) return NextResponse.redirect(`${env.appUrl}/login`);
      await db.update(users).set(patch).where(eq(users.id, current.id));
      if (identity.email) await retryPayoutsForFreelancer(current.id, identity.email);
      return NextResponse.redirect(`${env.appUrl}/app/settings?linked=paypal`);
    }

    const [byPayer] = await db.select().from(users).where(eq(users.paypalPayerId, identity.payerId)).limit(1);
    const [byEmail] = identity.email ? await db.select().from(users).where(eq(users.email, identity.email)).limit(1) : [];
    let user = byPayer ?? byEmail;
    if (user) {
      await db.update(users).set(patch).where(eq(users.id, user.id));
    } else {
      user = await createUser({
        name: identity.name,
        email: identity.email ?? `${identity.payerId.toLowerCase()}@paypal.kept.app`,
        paypalEmail: identity.email,
        paypalPayerId: identity.payerId,
        paypalVerified: identity.verified,
      });
    }
    await setSessionCookie(user.id);
    return NextResponse.redirect(`${env.appUrl}/app`);
  } catch (err) {
    console.error("[paypal-login]", err);
    return NextResponse.redirect(`${env.appUrl}/login?error=paypal_failed`);
  }
}
