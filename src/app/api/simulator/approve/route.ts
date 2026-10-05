import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { handler, readJson } from "@/lib/http";
import { getPayPal } from "@/lib/paypal";
import { SimulatedPayPalGateway } from "@/lib/paypal/simulator";

const body = z.object({ orderId: z.string() });

/** Keyless local mode only: stands in for the buyer clicking "Pay" in PayPal's popup. */
export const POST = handler(async (req) => {
  await requireUser();
  const gw = getPayPal();
  if (!(gw instanceof SimulatedPayPalGateway)) throw new AppError("forbidden", "The simulator is disabled when PayPal is configured");
  const { orderId } = body.parse(await readJson(req));
  gw.approve(orderId);
  return { ok: true };
});
