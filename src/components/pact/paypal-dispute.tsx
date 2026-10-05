"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client-api";
import type { PayPalDisputeInfo } from "@/lib/db/schema";

export function PayPalDisputeBanner({ info }: { info: PayPalDisputeInfo }) {
  const open = info.status !== "RESOLVED";
  return (
    <div className={`flex gap-3 rounded-2xl border p-5 ${open ? "border-rose-100 bg-rose-50/60" : "border-line bg-paper/60"}`}>
      {open ? <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-600" /> : <ShieldCheck className="mt-0.5 size-5 shrink-0 text-jade-600" />}
      <div className="min-w-0 text-[13px] leading-relaxed">
        <p className="text-[14px] font-semibold">
          {open ? "The payer opened a dispute with PayPal" : "PayPal dispute resolved"}
          <span className="ml-2 font-mono text-[11px] font-normal text-ink-3">{info.id}</span>
        </p>
        <p className="text-ink-2">
          Reason: {info.reason.replace(/_/g, " ").toLowerCase()} · status {info.status.replace(/_/g, " ").toLowerCase()}
          {info.stage ? ` · ${info.stage.toLowerCase()} stage` : ""}
          {info.outcome ? ` · outcome ${info.outcome.replace(/_/g, " ").toLowerCase()}` : ""}
          {info.simulated ? " · simulated" : ""}
        </p>
        <p className="mt-1 text-ink-3">
          {info.evidenceSubmittedAt
            ? "Chargeback shield: Kept submitted the signed criteria, delivery record, the referee’s verdict and the full audit trail to PayPal’s Disputes API as seller evidence."
            : info.evidenceError
              ? `Kept couldn’t submit evidence automatically (${info.evidenceError}). It will be included when PayPal requests a response.`
              : "Kept is assembling evidence from the signed pact."}
          {open && " Automatic release is frozen until PayPal decides."}
        </p>
      </div>
    </div>
  );
}

export function SimulatePayPalDisputeButton({ milestoneId }: { milestoneId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="border-dashed border-rose-100 text-rose-700"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api(`/api/milestones/${milestoneId}/simulate-paypal-dispute`, { body: {} });
          toast.success("Simulated a PayPal dispute; see the chargeback shield respond.");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      <ShieldAlert /> Client disputes with PayPal instead
    </Button>
  );
}
