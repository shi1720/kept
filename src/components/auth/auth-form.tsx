"use client";

import { ArrowRight, Briefcase, Palette } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/client-api";

export function DemoButtons({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"client" | "freelancer" | null>(null);
  const go = async (as: "client" | "freelancer") => {
    setLoading(as);
    try {
      await api("/api/auth/demo", { body: { as } });
      router.push("/app");
      router.refresh();
    } catch {
      setLoading(null);
    }
  };
  return (
    <div className={compact ? "flex flex-wrap gap-2" : "grid gap-2.5 sm:grid-cols-2"}>
      <button
        onClick={() => go("client")}
        disabled={loading !== null}
        className="group flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 text-left transition-all hover:-translate-y-px hover:border-jade-300 hover:shadow-card disabled:opacity-60"
      >
        <span className="rounded-lg bg-ember-50 p-2 text-ember-700"><Briefcase className="size-4" /></span>
        <span className="min-w-0">
          <span className="block text-[13.5px] font-medium">{loading === "client" ? "Building your demo…" : "Try as Maya"}</span>
          <span className="block text-xs text-ink-3">Client · coffee roastery owner</span>
        </span>
      </button>
      <button
        onClick={() => go("freelancer")}
        disabled={loading !== null}
        className="group flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 text-left transition-all hover:-translate-y-px hover:border-jade-300 hover:shadow-card disabled:opacity-60"
      >
        <span className="rounded-lg bg-jade-50 p-2 text-jade-700"><Palette className="size-4" /></span>
        <span className="min-w-0">
          <span className="block text-[13.5px] font-medium">{loading === "freelancer" ? "Building your demo…" : "Try as Ade"}</span>
          <span className="block text-xs text-ink-3">Freelancer · brand designer</span>
        </span>
      </button>
    </div>
  );
}

function PayPalLoginButton() {
  return (
    <a
      href="/api/auth/paypal/start"
      className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#ffc439] text-sm font-semibold text-[#003087] transition-colors hover:bg-[#f2ba36]"
    >
      Log in with <span className="font-bold italic">PayPal</span>
    </a>
  );
}

export function AuthForm({ mode, paypalLogin }: { mode: "login" | "signup"; paypalLogin: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api(mode === "login" ? "/api/auth/login" : "/api/auth/signup", { body: form });
      router.push(next.startsWith("/") ? next : "/app");
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <Field label="Your name">
            <Input required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Shivam Gupta" />
          </Field>
        )}
        <Field label="Email">
          <Input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@studio.com" />
        </Field>
        <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
          <Input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "signup" ? 8 : 1} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
        </Field>
        <Button type="submit" size="lg" loading={loading} className="mt-1">
          {mode === "login" ? "Sign in" : "Create account"} <ArrowRight />
        </Button>
      </form>
      {paypalLogin && (
        <>
          <div className="flex items-center gap-3 text-xs text-ink-3">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <PayPalLoginButton />
        </>
      )}
      <p className="text-center text-sm text-ink-3">
        {mode === "login" ? (
          <>New to Kept? <Link href={`/signup${next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-jade-700 hover:underline">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href={`/login${next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-jade-700 hover:underline">Sign in</Link></>
        )}
      </p>
    </div>
  );
}
