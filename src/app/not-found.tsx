import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Seal } from "@/components/brand/seal";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Seal size={88} label="NOT FOUND" tone="jade" className="opacity-90" />
      <h1 className="display text-[48px]">This page broke its promise.</h1>
      <p className="max-w-md text-[15px] text-ink-3">The link may be old, or the pact may belong to someone else. Your money is fine — it lives in escrow, not on this page.</p>
      <div className="flex gap-2">
        <Button asChild variant="jade"><Link href="/app">Go to your pacts</Link></Button>
        <Button asChild variant="outline"><Link href="/">Home</Link></Button>
      </div>
      <Logo className="mt-8 opacity-60" />
    </main>
  );
}
