"use client";

import { BadgeCheck, CircleAlert, ExternalLink, MailWarning, PartyPopper, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/client-api";

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export function ProfileForm({ initialName, initialHeadline }: { initialName: string; initialHeadline: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [headline, setHeadline] = useState(initialHeadline ?? "");
  const [pending, start] = useTransition();
  const dirty = name.trim() !== initialName || headline.trim() !== (initialHeadline ?? "");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      try {
        await api("/api/me", { method: "PATCH", body: { name: name.trim(), headline: headline.trim() || null } });
        toast.success("Profile saved");
        router.refresh();
      } catch {
        /* toast shown by api() */
      }
    });
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={80} required autoComplete="name" />
        </Field>
        <Field label="Headline" hint={`${headline.length}/120 · shown on your public track record`}>
          <Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} placeholder="e.g. Brand designer for independent food brands" />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="sm" loading={pending} disabled={!dirty || name.trim().length < 2}>
          {!pending && <Save />} Save profile
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Payouts                                                             */
/* ------------------------------------------------------------------ */

export interface PayoutState {
  paypalEmail: string | null;
  paypalVerified: boolean;
  paypalPayerId: string | null;
}

export function PayoutStatus({ state }: { state: PayoutState }) {
  if (state.paypalVerified && state.paypalPayerId) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-jade-100 bg-jade-50 p-3.5">
        <BadgeCheck className="mt-0.5 size-5 shrink-0 text-jade-600" />
        <div className="min-w-0 text-[13px]">
          <p className="font-semibold text-jade-700">Verified with PayPal</p>
          <p className="mt-0.5 text-jade-700/80">
            Payouts go to <b className="font-medium">{state.paypalEmail ?? "your PayPal account"}</b> · Payer ID{" "}
            <code className="font-mono text-[12px]">{state.paypalPayerId}</code>
          </p>
        </div>
      </div>
    );
  }
  if (state.paypalEmail) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3.5">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="text-[13px] text-amber-700">
          <p className="font-semibold">Email on file · not verified</p>
          <p className="mt-0.5 opacity-90">
            Payouts will be sent to <b className="font-medium">{state.paypalEmail}</b>. If that isn’t a PayPal account, PayPal holds the money as unclaimed until one is opened
            with that address.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-paper p-3.5">
      <MailWarning className="mt-0.5 size-5 shrink-0 text-ink-3" />
      <div className="text-[13px] text-ink-2">
        <p className="font-semibold">No payout account yet</p>
        <p className="mt-0.5 text-ink-3">Only needed if you get paid through Kept. Money released to you waits safely until you add the PayPal email it should go to.</p>
      </div>
    </div>
  );
}

export function PayoutForm({ initialEmail }: { initialEmail: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [pending, start] = useTransition();
  const trimmed = email.trim().toLowerCase();
  const dirty = trimmed !== (initialEmail ?? "");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      try {
        await api("/api/me", { method: "PATCH", body: { paypalEmail: trimmed || null } });
        toast.success(trimmed ? "Payout email saved; any waiting payouts were retried" : "Payout email removed");
        router.refresh();
      } catch {
        /* toast shown by api() */
      }
    });
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <Field label="PayPal email for payouts" hint={initialEmail && dirty ? "Changing the email resets PayPal verification." : "We send released funds here with PayPal Payouts."}>
        <div className="flex gap-2">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          <Button type="submit" variant="primary" loading={pending} disabled={!dirty} className="shrink-0">
            {!pending && <Save />} Save
          </Button>
        </div>
      </Field>
    </form>
  );
}

export function VerifyWithPayPal({ enabled, verified }: { enabled: boolean; verified: boolean }) {
  if (!enabled) {
    return (
      <p className="rounded-xl border border-dashed border-line-2 bg-paper/60 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-3">
        <b className="font-medium text-ink-2">Verify with PayPal is turned off on this deployment.</b> It needs PayPal API credentials and “Log in with PayPal” enabled for the app
        (<code className="font-mono text-[11.5px]">PAYPAL_LOGIN_ENABLED=true</code>). Payouts still work with the email above.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper/60 px-3.5 py-3">
      <p className="max-w-md text-[12.5px] leading-relaxed text-ink-3">
        {verified
          ? "Linked through Log in with PayPal. Re-link if you want payouts to go to a different PayPal account."
          : "Sign in with PayPal once and we’ll use the verified email and Payer ID from your PayPal account; no typos, no unclaimed payouts."}
      </p>
      <Button asChild variant={verified ? "outline" : "jade"} size="sm">
        <a href="/api/auth/paypal/start?link=1">
          {verified ? "Re-link PayPal" : "Verify with PayPal"} <ExternalLink />
        </a>
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ?linked=paypal banner                                               */
/* ------------------------------------------------------------------ */

export function LinkedBanner({ email }: { email: string | null }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    // Drop the one-shot query param so a refresh doesn't replay the banner.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("linked");
      window.history.replaceState(null, "", url);
    } catch {
      /* non-critical */
    }
  }, []);
  if (!open) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-jade-100 bg-jade-50 px-4 py-3.5 text-[13.5px] text-jade-700 animate-fade-up" role="status">
      <PartyPopper className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1 leading-relaxed">
        <b className="font-semibold">PayPal account linked.</b> {email ? <>Payouts will go to {email}.</> : null} Any payouts that were waiting on a payout account have been retried.
      </p>
      <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-jade-100" aria-label="Dismiss">
        <X className="size-4" />
      </button>
    </div>
  );
}
