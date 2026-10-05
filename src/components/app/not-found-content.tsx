import Link from "next/link";
import { Seal } from "@/components/brand/seal";
import { Button } from "@/components/ui/button";

/** Shared 404 body: used on its own at the top level and inside the app shell. */
export function NotFoundContent({ inApp = false }: { inApp?: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Seal size={88} label="NOT FOUND" tone="jade" className="opacity-90" />
      <h1 className="display text-[44px] sm:text-[48px]">This page broke its promise.</h1>
      <p className="max-w-md text-[15px] text-ink-3">
        The link may be old or mistyped, or it points to something that belongs to someone else. If you were in the middle of a pact, your money is fine: it lives
        in escrow, not on this page.
      </p>
      <div className="flex gap-2">
        <Button asChild variant="jade">
          <Link href="/app">{inApp ? "Back to your pacts" : "Go to your pacts"}</Link>
        </Button>
        {!inApp && (
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
