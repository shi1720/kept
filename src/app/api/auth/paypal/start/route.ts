import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env, isProduction, paypalConfigured } from "@/lib/env";
import { newToken } from "@/lib/ids";
import { paypalAuthorizeUrl } from "@/lib/paypal/identity";

/** Begin "Log in with PayPal" (sign in, or link a payout account when ?link=1). */
export async function GET(req: Request) {
  if (!paypalConfigured() || !env.paypal.loginEnabled) {
    return NextResponse.redirect(`${env.appUrl}/login?error=paypal_login_disabled`);
  }
  const link = new URL(req.url).searchParams.get("link") === "1";
  const state = `${link ? "link" : "login"}.${newToken()}`;
  const jar = await cookies();
  jar.set("kept_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: isProduction, path: "/", maxAge: 600 });
  return NextResponse.redirect(paypalAuthorizeUrl(state));
}
