import { paypalConfigured } from "@/lib/env";
import { LivePayPalGateway } from "./live";
import { SimulatedPayPalGateway } from "./simulator";
import type { PayPalGateway } from "./types";

const g = globalThis as unknown as { __paypalGateway?: PayPalGateway };

export function getPayPal(): PayPalGateway {
  if (!g.__paypalGateway) {
    g.__paypalGateway = paypalConfigured() ? new LivePayPalGateway() : new SimulatedPayPalGateway();
  }
  return g.__paypalGateway;
}

const sim = new SimulatedPayPalGateway();

/** Payments created by the simulator (seeded demo history) must keep using it. */
export function gatewayFor(payment: { simulated: boolean }): PayPalGateway {
  return payment.simulated ? sim : getPayPal();
}

export function simulator(): SimulatedPayPalGateway {
  return sim;
}

/** Test hook: swap the gateway (e.g. force the simulator). */
export function setPayPalGateway(gateway: PayPalGateway) {
  g.__paypalGateway = gateway;
}

export type { PayPalGateway } from "./types";
