"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/client-api";

/**
 * One-click "Try the live demo": builds a private demo world (as Maya, the
 * client) and drops the visitor into the app. Same endpoint as DemoButtons.
 */
export function DemoLaunch({ className, label = "Try the live demo", tone = "ink" }: { className?: string; label?: React.ReactNode; tone?: "ink" | "paper" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const go = async () => {
    setLoading(true);
    try {
      await api("/api/auth/demo", { body: { as: "client" } });
      router.push("/app");
      router.refresh();
    } catch {
      setLoading(false);
    }
  };
  return (
    <button
      type="button"
      onClick={go}
      disabled={loading}
      className={cn(
        "group inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13.5px] font-medium transition-all active:scale-[0.98] disabled:opacity-70",
        tone === "ink"
          ? "bg-ink text-paper shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_1px_2px_rgba(0,0,0,0.2)] hover:bg-ink/90"
          : "bg-paper text-ink hover:bg-white",
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {loading ? "Building your demo…" : label}
      {!loading && <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />}
    </button>
  );
}
