import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { env, paypalConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <AuthLayout title="Make it a promise." subtitle="Free to start. You only pay when a pact is funded.">
      <Suspense>
        <AuthForm mode="signup" paypalLogin={paypalConfigured() && env.paypal.loginEnabled} />
      </Suspense>
    </AuthLayout>
  );
}
