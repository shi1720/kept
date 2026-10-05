import { requireUser } from "@/lib/auth/session";
import { createFundingOrder } from "@/lib/domain/funding";
import { handler } from "@/lib/http";

/** PayPal Checkout step 1 — called by the PayPal button's createOrder callback. */
export const POST = handler<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  return createFundingOrder(user, id);
});
