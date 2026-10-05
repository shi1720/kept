"use client";

import { BadgeCheck, KeyRound, LogOut, MailWarning, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/client-api";

/* ------------------------------------------------------------------ */
/* Email verification                                                   */
/* ------------------------------------------------------------------ */

export function EmailVerification({ email, verified, compact }: { email: string; verified: boolean; compact?: boolean }) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-jade-700">
        <BadgeCheck className="size-3.5" /> Verified
      </span>
    );
  }

  const resend = () =>
    start(async () => {
      try {
        const res = await api<{ sent: boolean; emailConfigured: boolean; alreadyVerified?: boolean }>("/api/auth/verify/resend", { body: {} });
        setSent(true);
        if (res.alreadyVerified) toast.success("Your email is already verified");
        else if (res.emailConfigured) toast.success(`Verification link sent to ${email}`);
        else toast.info("Email isn't configured on this deployment; the verification link was written to the server log.");
      } catch {
        /* toast shown by api() */
      }
    });

  if (compact) {
    return (
      <Button size="sm" variant="outline" onClick={resend} loading={pending} disabled={sent}>
        {!pending && <Send />} {sent ? "Link sent" : "Send verification link"}
      </Button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
      <span className="text-amber-700">Not verified</span>
      <button type="button" onClick={resend} disabled={pending || sent} className="font-medium text-jade-700 hover:underline disabled:text-ink-3 disabled:no-underline">
        {pending ? "Sending…" : sent ? "Link sent" : "Send link"}
      </button>
    </span>
  );
}

export function VerifyEmailBanner({ email }: { email: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-700" role="status">
      <MailWarning className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 basis-[260px] leading-relaxed">
        <b className="font-semibold">Confirm {email}.</b> Until you do, pacts people send to that address won’t show up here. You can still open them from the invite link.
      </p>
      <EmailVerification email={email} verified={false} compact />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Password                                                             */
/* ------------------------------------------------------------------ */

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const mismatch = confirm.length > 0 && confirm !== next;
  const ready = next.length >= 8 && next === confirm && (!hasPassword || current.length > 0);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    start(async () => {
      try {
        await api("/api/auth/password/change", { body: { currentPassword: hasPassword ? current : undefined, newPassword: next } });
        toast.success(hasPassword ? "Password changed. Other devices were signed out." : "Password set. You can now sign in with your email.");
        setCurrent("");
        setNext("");
        setConfirm("");
        router.refresh();
      } catch {
        /* toast shown by api() */
      }
    });
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      {hasPassword && (
        <Field label="Current password">
          <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={hasPassword ? "New password" : "Password"} hint="At least 8 characters.">
          <Input type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
        </Field>
        <Field label="Confirm" error={mismatch ? "The passwords don't match" : undefined}>
          <Input type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required aria-invalid={mismatch} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="sm" loading={pending} disabled={!ready}>
          {!pending && <KeyRound />} {hasPassword ? "Change password" : "Set password"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Sessions                                                             */
/* ------------------------------------------------------------------ */

export function SignOutEverywhere() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      try {
        await api("/api/auth/sessions/revoke", { body: {} });
        toast.success("Signed out on every other device");
        router.refresh();
      } catch {
        /* toast shown by api() */
      }
    });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-sm text-[12.5px] leading-relaxed text-ink-3">Lost a laptop or used a shared computer? End every other session. This browser stays signed in.</p>
      <Button variant="outline" size="sm" onClick={run} loading={pending}>
        {!pending && <LogOut />} Sign out other devices
      </Button>
    </div>
  );
}
