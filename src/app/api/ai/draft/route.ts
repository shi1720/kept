import { z } from "zod";
import { draftPact } from "@/lib/ai/drafter";
import { requireUser } from "@/lib/auth/session";
import { draftToInput } from "@/lib/domain/pacts";
import { handler, readJson } from "@/lib/http";

export const maxDuration = 120;

const body = z.object({
  sourceText: z.string().trim().min(20, "Paste the conversation or describe the job in a few sentences").max(20_000),
  creatorRole: z.enum(["client", "freelancer"]),
  amount: z.number().positive().max(100_000).optional(),
});

/** Compile a DM thread / description into a structured, machine-checkable pact draft (not saved). */
export const POST = handler(async (req) => {
  await requireUser();
  const input = body.parse(await readJson(req));
  const started = Date.now();
  const { output, provider, model, degraded } = await draftPact({
    sourceText: input.sourceText,
    creatorRole: input.creatorRole,
    hints: input.amount ? { amount: input.amount } : undefined,
  });
  return {
    draft: draftToInput(output, { creatorRole: input.creatorRole, sourceText: input.sourceText }),
    ai: { provider, model, degraded, latencyMs: Date.now() - started },
  };
});
