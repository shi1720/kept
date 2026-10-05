"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      <h1 className="display text-[44px]">Something went wrong on our side.</h1>
      <p className="max-w-md text-[15px] text-ink-3">
        No money moves without a completed step, so nothing was lost. Try again — and if it keeps happening, mention reference <span className="font-mono text-ink-2">{error.digest ?? "n/a"}</span>.
      </p>
      <div className="flex gap-2">
        <Button variant="jade" onClick={reset}><RotateCcw /> Try again</Button>
        <Button asChild variant="outline"><Link href="/app">Back to your pacts</Link></Button>
      </div>
    </main>
  );
}
