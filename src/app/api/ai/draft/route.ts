import { z } from "zod";
import { draftPact } from "@/lib/ai/drafter";
import { exampleDraft } from "@/lib/ai/examples";
import { requireUser } from "@/lib/auth/session";
import { draftToInput } from "@/lib/domain/pacts";
import { handler, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

const body = z.object({
  sourceText: z.string().trim().min(20, "Paste the conversation or describe the job in a few sentences").max(20_000),
  creatorRole: z.enum(["client", "freelancer"]),
  amount: z.number().positive().max(100_000).optional(),
});

/** Compile a DM thread / description into a structured, machine-checkable pact draft (not saved). */
export const POST = handler(async (req) => {
  const user = await requireUser();
  rateLimit(`draft:${user.id}`, 30, 3_600_000);
  const input = body.parse(await readJson(req));
  const started = Date.now();
  const result = await draftPact({
    userId: user.id,
    sourceText: input.sourceText,
    creatorRole: input.creatorRole,
    hints: input.amount ? { amount: input.amount } : undefined,
  });
  let { output, provider, model } = result;
  const { degraded } = result;
  // Keyless runs: the composer's example chips get a pre-compiled draft, labelled as such in the UI.
  const example = provider === "offline" && !input.amount ? exampleDraft(input.sourceText) : null;
  if (example) ({ output, provider, model } = { output: example, provider: "example", model: "pre-compiled example" });
  return {
    draft: draftToInput(output, { creatorRole: input.creatorRole, sourceText: input.sourceText }),
    ai: { provider, model, degraded, latencyMs: Date.now() - started },
  };
});
