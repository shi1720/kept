import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/password-forms";
import { emailConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Forgot it? Happens." subtitle="Enter your email and we’ll send you a link to choose a new password." showDemo={false}>
      <ForgotPasswordForm emailConfigured={emailConfigured()} />
    </AuthLayout>
  );
}
