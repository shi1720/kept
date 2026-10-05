import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { basicAuthHeader, PAYPAL_API_BASE, PAYPAL_WEB_BASE } from "./http";

/**
 * "Log in with PayPal" (OpenID Connect). Used both to sign in and to link a
 * verified PayPal account as a freelancer's payout destination; Kept then
 * knows the money is going to an account the freelancer actually controls.
 */
export const PAYPAL_LOGIN_SCOPES = "openid email profile https://uri.paypal.com/services/paypalattributes";

export const paypalLoginRedirectUri = () => `${env.appUrl}/api/auth/paypal/callback`;

export function paypalAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    flowEntry: "static",
    client_id: env.paypal.clientId,
    response_type: "code",
    scope: PAYPAL_LOGIN_SCOPES,
    redirect_uri: paypalLoginRedirectUri(),
    state,
  });
  return `${PAYPAL_WEB_BASE}/signin/authorize?${params}`;
}

export interface PayPalIdentity {
  payerId: string;
  name: string;
  email: string | null;
  verified: boolean;
}

export async function exchangePayPalCode(code: string): Promise<PayPalIdentity> {
  const tokenRes = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: basicAuthHeader(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code }).toString(),
    cache: "no-store",
  });
  if (!tokenRes.ok) throw new AppError("unauthorized", "PayPal sign-in failed; please try again");
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const infoRes = await fetch(`${PAYPAL_API_BASE}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, {
    headers: { Authorization: `Bearer ${access_token}` },
    cache: "no-store",
  });
  if (!infoRes.ok) throw new AppError("unauthorized", "Could not read your PayPal profile");
  const info = (await infoRes.json()) as {
    user_id?: string;
    payer_id?: string;
    name?: string;
    emails?: { value: string; primary?: boolean; confirmed?: boolean }[];
    verified_account?: string | boolean;
  };
  // Only trust an email PayPal says the user has confirmed.
  const confirmed = (info.emails ?? []).filter((e) => e.confirmed === true || (e.confirmed as unknown) === "true");
  const email = confirmed.find((e) => e.primary)?.value ?? confirmed[0]?.value ?? null;
  return {
    payerId: info.payer_id ?? info.user_id ?? "",
    name: info.name ?? email?.split("@")[0] ?? "PayPal user",
    email: email?.toLowerCase() ?? null,
    verified: info.verified_account === true || info.verified_account === "true",
  };
}
