"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";

/**
 * Completes checkout when the payer approved via a PayPal approval link (e.g. one an AI agent
 * handed them) and PayPal redirected back with ?paypal=return&token=<orderId>.
 */
export function ReturnCapture({ milestoneId, orderId, pactId }: { milestoneId: string; orderId: string; pactId: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState<"working" | "done" | "error">("working");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api(`/api/milestones/${milestoneId}/capture`, { body: { orderId } })
      .then(() => {
        setState("done");
        toast.success("Payment approved; the money is now held in escrow.");
      })
      .catch(() => setState("error"))
      .finally(() => {
        router.replace(`/app/pacts/${pactId}`);
        router.refresh();
      });
  }, [milestoneId, orderId, pactId, router]);
  if (state !== "working") return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-[14px]">
      <Loader2 className="size-4 animate-spin text-amber-700" /> Confirming your PayPal payment and moving it into escrow…
    </div>
  );
}
