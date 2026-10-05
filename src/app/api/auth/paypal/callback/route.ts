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
    const patch = {
      paypalPayerId: identity.payerId,
      paypalVerified: identity.verified,
      ...(identity.email ? { paypalEmail: identity.email } : {}),
    };

    if (state.startsWith("link.")) {
      const current = await getCurrentUser();
      if (!current) return NextResponse.redirect(`${env.appUrl}/login`);
      await db.update(users).set(patch).where(eq(users.id, current.id));
      if (identity.email) await retryPayoutsForFreelancer(current.id, identity.email);
      return NextResponse.redirect(`${env.appUrl}/app/settings?linked=paypal`);
    }

    // Sign in only by PayPal payer id. We never attach a PayPal identity to an existing account by
    // email at login (that would let someone take over an account and redirect its payouts);
    // linking happens explicitly from Settings while signed in.
    const [byPayer] = identity.payerId ? await db.select().from(users).where(eq(users.paypalPayerId, identity.payerId)).limit(1) : [];
    let user = byPayer;
    if (!user && identity.email) {
      const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, identity.email)).limit(1);
      if (taken) return NextResponse.redirect(`${env.appUrl}/login?error=paypal_link_required`);
    }
    if (!user) {
      user = await createUser({
        name: identity.name,
        email: identity.email ?? `${identity.payerId.toLowerCase()}@paypal.kept.app`,
        paypalEmail: identity.email,
        paypalPayerId: identity.payerId,
        paypalVerified: identity.verified,
        // PayPal only gives us emails the account holder has confirmed with PayPal.
        emailVerified: Boolean(identity.email),
      });
    }
    await setSessionCookie(user);
    return NextResponse.redirect(`${env.appUrl}/app`);
  } catch (err) {
    console.error("[paypal-login]", err);
    return NextResponse.redirect(`${env.appUrl}/login?error=paypal_failed`);
  }
}
