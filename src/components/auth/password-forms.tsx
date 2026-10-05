"use client";

import { ArrowRight, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/client-api";

export function ForgotPasswordForm({ emailConfigured }: { emailConfigured: boolean }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/api/auth/password/forgot", { body: { email } });
      setSentTo(email.trim());
    } catch {
      /* toast shown by api() */
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <div className="flex flex-col gap-5" role="status">
        <div className="flex items-start gap-3 rounded-2xl border border-jade-100 bg-jade-50 p-4 text-[14px] text-jade-700">
          <MailCheck className="mt-0.5 size-5 shrink-0" />
          <p className="leading-relaxed">
            If an account exists for <b className="font-semibold">{sentTo}</b>, we’ve emailed it a link to choose a new password. The link works once and expires in an hour.
          </p>
        </div>
        {!emailConfigured && (
          <p className="rounded-xl border border-dashed border-line-2 bg-paper/60 px-4 py-3 text-[12.5px] leading-relaxed text-ink-3">
            This deployment has no email provider configured (<code className="font-mono text-[11.5px]">RESEND_API_KEY</code>), so the link was written to the server log
            instead of being emailed.
          </p>
        )}
        <Link href="/login" className="text-sm font-medium text-jade-700 hover:underline">
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Email">
        <Input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" autoFocus />
      </Field>
      <Button type="submit" size="lg" loading={loading} className="mt-1">
        Email me a reset link <ArrowRight />
      </Button>
      <p className="text-center text-sm text-ink-3">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-jade-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return;
    setLoading(true);
    try {
      await api("/api/auth/password/reset", { body: { token, password } });
      router.push("/app?password=reset");
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="New password" hint="At least 8 characters. This signs you out on every other device.">
        <Input required type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      </Field>
      <Field label="Confirm new password" error={mismatch ? "The passwords don't match" : undefined}>
        <Input required type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={mismatch} />
      </Field>
      <Button type="submit" size="lg" loading={loading} disabled={password.length < 8 || password !== confirm} className="mt-1">
        Set new password <ArrowRight />
      </Button>
    </form>
  );
}
