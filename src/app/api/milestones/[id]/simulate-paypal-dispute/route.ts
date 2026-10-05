import { requireUser } from "@/lib/auth/session";
import { simulatePayPalDispute } from "@/lib/domain/chargebacks";
import { assertParty, loadMilestone } from "@/lib/domain/context";
import { AppError } from "@/lib/errors";
import { handler } from "@/lib/http";

/** Demo only: simulate the client filing a dispute with PayPal directly. */
export const POST = handler<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  const { pact } = await loadMilestone(id);
  assertParty(user, pact);
  if (!pact.demoWorkspace || pact.demoWorkspace !== user.demoWorkspace) throw new AppError("forbidden", "Only available in demo workspaces");
  return simulatePayPalDispute(id);
});
