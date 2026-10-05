import { BadgeCheck, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { verifyEmail } from "@/lib/auth/account";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { ensureMigrated } from "@/lib/db/migrate";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  await ensureMigrated();
  const { token = "" } = await searchParams;
  let verified: string | null = null;
  let error: string | null = null;
  try {
    verified = (await verifyEmail(token)).email;
  } catch (err) {
    error = err instanceof AppError ? err.message : "Something went wrong verifying your email. Please try again.";
  }
  const signedIn = Boolean(await getCurrentUser());

  return (
    <AuthLayout title={verified ? "Email confirmed." : "We couldn’t confirm that."} subtitle={verified ? "You’re all set." : "The link may have been used already or expired."} showDemo={false}>
      {verified ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-2xl border border-jade-100 bg-jade-50 p-4 text-[14px] text-jade-700" role="status">
            <BadgeCheck className="mt-0.5 size-5 shrink-0" />
            <p className="leading-relaxed">
              <b className="font-semibold">{verified}</b> is verified. Pacts that people send to this address now appear in your dashboard.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href={signedIn ? "/app" : "/login"}>{signedIn ? "Go to your dashboard" : "Sign in"}</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-[14px] text-rose-700" role="alert">
            <CircleAlert className="mt-0.5 size-5 shrink-0" />
            <p className="leading-relaxed">{error}</p>
          </div>
          <Button asChild size="lg" variant="outline">
            <Link href={signedIn ? "/app/settings#account" : "/login?next=/app/settings"}>{signedIn ? "Send a new link from Settings" : "Sign in to send a new link"}</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
