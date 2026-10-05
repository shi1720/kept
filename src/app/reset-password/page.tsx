import type { Metadata } from "next";
import Link from "next/link";
import { peekToken } from "@/lib/auth/account";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ResetPasswordForm } from "@/components/auth/password-forms";
import { Button } from "@/components/ui/button";
import { ensureMigrated } from "@/lib/db/migrate";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  await ensureMigrated();
  const { token = "" } = await searchParams;
  // Only look at the token here; it is used when the form is submitted (so link scanners can't burn it).
  const valid = (await peekToken(token, "reset_password")) === "valid";
  return (
    <AuthLayout
      title={valid ? "Choose a new password." : "That link has expired."}
      subtitle={valid ? "Pick something you don’t use anywhere else." : "Reset links work once and only for an hour. Ask for a fresh one."}
      showDemo={false}
    >
      {valid ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Button asChild size="lg">
          <Link href="/forgot-password">Send me a new link</Link>
        </Button>
      )}
    </AuthLayout>
  );
}
