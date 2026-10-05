import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { env, paypalConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  paypal_login_disabled: "Log in with PayPal isn't enabled on this deployment.",
  paypal_state: "That PayPal sign-in link expired. Please try again.",
  paypal_failed: "PayPal sign-in failed. Please try again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthLayout title="Welcome back." subtitle="Sign in to your pacts.">
      {error && ERRORS[error] && <p className="mb-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{ERRORS[error]}</p>}
      <Suspense>
        <AuthForm mode="login" paypalLogin={paypalConfigured() && env.paypal.loginEnabled} />
      </Suspense>
    </AuthLayout>
  );
}
