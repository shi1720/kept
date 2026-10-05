"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import {
  INSTANCE_LOADING_STATE,
  PayPalGuestPaymentButton,
  PayPalOneTimePaymentButton,
  PayPalProvider,
  usePayPal,
} from "@paypal/react-paypal-js/sdk-v6";
import { Lock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/client-api";
import { formatMoney } from "@/lib/money";

export interface FundQuote {
  milestoneCents: number;
  platformFeeCents: number;
  processingFeeCents: number;
  totalCents: number;
}

export interface PayPalClientConfig {
  mode: "sandbox" | "live" | "simulator";
  clientId: string;
  sdk: "v6" | "v5";
}

interface OrderResponse {
  orderId: string;
}

function useFunding(milestoneId: string) {
  const router = useRouter();
  const createOrder = async () => {
    const r = await api<OrderResponse>(`/api/milestones/${milestoneId}/order`, { body: {} });
    return r.orderId;
  };
  const capture = async (orderId: string) => {
    await api(`/api/milestones/${milestoneId}/capture`, { body: { orderId } });
    toast.success("Funded! The money is now held safely in escrow.");
    router.refresh();
  };
  return { createOrder, capture };
}

function V6Buttons({ milestoneId }: { milestoneId: string }) {
  const { loadingStatus, error } = usePayPal();
  const { createOrder, capture } = useFunding(milestoneId);
  if (loadingStatus === INSTANCE_LOADING_STATE.PENDING) return <Skeleton className="h-[96px] w-full rounded-full" />;
  if (loadingStatus === INSTANCE_LOADING_STATE.REJECTED) {
    return <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">PayPal couldn’t load: {error?.message ?? "unknown error"}</p>;
  }
  const handlers = {
    createOrder: async () => ({ orderId: await createOrder() }),
    onApprove: async ({ orderId }: { orderId?: string }) => {
      if (orderId) await capture(orderId);
    },
    onCancel: () => toast("Checkout cancelled — nothing was charged."),
    onError: (e: Error) => toast.error(e.message || "PayPal checkout failed"),
  };
  return (
    <div className="flex flex-col gap-2.5 [&_paypal-button]:w-full">
      <PayPalOneTimePaymentButton {...handlers} presentationMode="auto" />
      <PayPalGuestPaymentButton {...handlers} />
    </div>
  );
}

function V5Buttons({ milestoneId, clientId }: { milestoneId: string; clientId: string }) {
  const { createOrder, capture } = useFunding(milestoneId);
  return (
    <PayPalScriptProvider options={{ clientId, currency: "USD", intent: "capture" }}>
      <PayPalButtons
        style={{ layout: "vertical", shape: "pill", label: "pay" }}
        createOrder={createOrder}
        onApprove={async (data) => capture(data.orderID)}
        onCancel={() => toast("Checkout cancelled — nothing was charged.")}
        onError={(e) => toast.error(String(e))}
      />
    </PayPalScriptProvider>
  );
}

function SimulatedCheckout({ milestoneId, total }: { milestoneId: string; total: number }) {
  const { createOrder, capture } = useFunding(milestoneId);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        className="w-full bg-[#ffc439] font-semibold text-[#003087] hover:bg-[#f2ba36]"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const orderId = await createOrder();
            await api("/api/simulator/approve", { body: { orderId } });
            await capture(orderId);
          } finally {
            setBusy(false);
          }
        }}
      >
        Pay {formatMoney(total)} with <span className="italic">PayPal</span>
      </Button>
      <p className="text-center text-[11px] text-amber-700">Simulator mode — add PayPal sandbox keys to use real checkout.</p>
    </div>
  );
}

export function FundPanel({ milestoneId, quote, paypal }: { milestoneId: string; quote: FundQuote; paypal: PayPalClientConfig }) {
  const rows = [
    { label: "Milestone (held in escrow)", value: quote.milestoneCents, strong: true },
    { label: "Kept protection · AI referee & mediation", value: quote.platformFeeCents },
    { label: "PayPal processing, at cost", value: quote.processingFeeCents },
  ];
  return (
    <div className="rounded-2xl border border-amber-100 bg-gradient-to-b from-amber-50/70 to-card p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-amber-100 p-2 text-amber-700"><Lock className="size-4" /></span>
        <div>
          <p className="text-[14px] font-semibold">Fund this milestone</p>
          <p className="text-xs leading-relaxed text-ink-3">The money is held in escrow — not sent to the freelancer — until the work passes review or you approve it.</p>
        </div>
      </div>
      <dl className="mt-4 space-y-1.5 text-[13px]">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4">
            <dt className={r.strong ? "text-ink" : "text-ink-3"}>{r.label}</dt>
            <dd className="num">{formatMoney(r.value)}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t border-amber-100 pt-2 text-[14px] font-semibold">
          <dt>Total today</dt>
          <dd className="num">{formatMoney(quote.totalCents)}</dd>
        </div>
      </dl>
      <div className="mt-5">
        {paypal.mode === "simulator" ? (
          <SimulatedCheckout milestoneId={milestoneId} total={quote.totalCents} />
        ) : paypal.sdk === "v5" ? (
          <V5Buttons milestoneId={milestoneId} clientId={paypal.clientId} />
        ) : (
          <PayPalProvider clientId={paypal.clientId} environment={paypal.mode === "live" ? "production" : "sandbox"} components={["paypal-payments", "paypal-guest-payments"]} pageType="checkout">
            <V6Buttons milestoneId={milestoneId} />
          </PayPalProvider>
        )}
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-3">
        <ShieldCheck className="size-3.5 text-jade-600" /> Freelancer receives 100% of the milestone. Refundable if the work doesn’t pass.
      </p>
    </div>
  );
}
