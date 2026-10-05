import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { captureFunding } from "@/lib/domain/funding";
import { handler, readJson } from "@/lib/http";

const body = z.object({ orderId: z.string().min(5) });

/** PayPal Checkout step 2 — called by the PayPal button's onApprove callback. */
export const POST = handler<{ id: string }>(async (req) => {
  const user = await requireUser();
  const { orderId } = body.parse(await readJson(req));
  const res = await captureFunding(orderId, { user, source: "checkout" });
  return { status: res.milestone.status, alreadyCaptured: res.alreadyCaptured };
});
