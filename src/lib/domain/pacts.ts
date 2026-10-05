import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import type { DraftOutput } from "@/lib/ai/schemas";
import { db } from "@/lib/db/client";
import {
  criteria,
  milestones,
  pacts,
  users,
  type MachineCheck,
  type Pact,
  type PactTerms,
  type User,
} from "@/lib/db/schema";
import { badRequest, forbidden, invalidState, notFound } from "@/lib/errors";
import { newId, newToken } from "@/lib/ids";
import { toCents } from "@/lib/money";
import { assertParty, loadPact, roleOf } from "./context";
import { notify, recordEvent } from "./events";

/* ------------------------------------------------------------------ */
/* Input contracts (shared by the web UI, REST API and MCP server)      */
/* ------------------------------------------------------------------ */

export const checkInput = z.object({
  type: z
    .enum(["none", "min_words", "max_words", "min_files", "file_types", "url_reachable", "page_contains", "repo_has_path", "keywords_present", "min_image_resolution"])
    .default("none"),
  value: z.number().nullish(),
  values: z.array(z.string()).nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
});

export const pactInput = z.object({
  title: z.string().trim().min(3).max(140),
  summary: z.string().trim().max(2000).default(""),
  // MVP settles in USD (fees, rounding and payouts are USD-calibrated).
  currency: z.literal("USD").default("USD"),
  creatorRole: z.enum(["client", "freelancer"]),
  counterpartyName: z.string().trim().max(120).nullish(),
  counterpartyEmail: z.email().nullish(),
  sourceText: z.string().max(40_000).nullish(),
  terms: z.object({
    revisionsIncluded: z.number().int().min(0).max(20),
    reviewWindowHours: z.number().int().min(1).max(720),
    ipTransfer: z.string().max(500),
    communication: z.string().max(500).nullish(),
  }),
  clarityScore: z.number().int().min(0).max(100).nullish(),
  ambiguities: z.array(z.object({ quote: z.string(), issue: z.string(), suggestion: z.string() })).default([]),
  riskFlags: z
    .array(z.object({ severity: z.enum(["low", "medium", "high"]), signal: z.string(), explanation: z.string() }))
    .default([]),
  milestones: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(140),
        description: z.string().max(4000).default(""),
        amount: z.number().positive().max(100_000),
        dueInDays: z.number().int().min(1).max(730).nullish(),
        criteria: z
          .array(
            z.object({
              text: z.string().trim().min(3).max(600),
              kind: z.enum(["objective", "subjective"]).default("objective"),
              check: checkInput.default({ type: "none" }),
            }),
          )
          .min(1)
          .max(12),
      }),
    )
    .min(1)
    .max(8),
});
export type PactInput = z.infer<typeof pactInput>;

export function draftToInput(
  draft: DraftOutput,
  extra: { creatorRole: "client" | "freelancer"; sourceText?: string; counterpartyEmail?: string | null; counterpartyName?: string | null },
): PactInput {
  return {
    title: draft.title.slice(0, 140),
    summary: draft.summary,
    currency: "USD",
    creatorRole: extra.creatorRole,
    counterpartyEmail: extra.counterpartyEmail ?? null,
    counterpartyName:
      extra.counterpartyName ?? (extra.creatorRole === "client" ? draft.freelancerName : draft.clientName) ?? null,
    sourceText: extra.sourceText ?? null,
    terms: { ...draft.terms, communication: draft.terms.communication ?? null },
    clarityScore: draft.clarityScore,
    ambiguities: draft.ambiguities,
    riskFlags: draft.riskFlags,
    milestones: draft.milestones.map((m) => ({
      title: m.title,
      description: m.description,
      amount: m.amount,
      dueInDays: m.dueInDays,
      criteria: m.criteria.map((c) => ({ text: c.text, kind: c.kind, check: c.check })),
    })),
  };
}

function cleanCheck(c: z.infer<typeof checkInput>): MachineCheck {
  const out: MachineCheck = { type: c.type };
  if (c.value != null) out.value = c.value;
  if (c.values?.length) out.values = c.values;
  if (c.width != null) out.width = c.width;
  if (c.height != null) out.height = c.height;
  return out;
}

async function writeMilestones(pactId: string, input: PactInput["milestones"]) {
  const now = Date.now();
  let offset = 0;
  for (const [i, m] of input.entries()) {
    const id = newId("mst");
    offset += m.dueInDays ?? 0;
    await db.insert(milestones).values({
      id,
      pactId,
      position: i,
      title: m.title,
      description: m.description,
      amountCents: toCents(m.amount),
      dueAt: m.dueInDays ? new Date(now + offset * 86_400_000) : null,
      status: "draft",
    });
    if (m.criteria.length) {
      await db.insert(criteria).values(
        m.criteria.map((c, j) => ({ id: newId("crt"), milestoneId: id, position: j, text: c.text, kind: c.kind, check: cleanCheck(c.check) })),
      );
    }
  }
}

/* ------------------------------------------------------------------ */

export async function createPact(user: User, raw: unknown, via: Pact["createdVia"] = "web"): Promise<Pact> {
  const input = pactInput.parse(raw);
  const id = newId("pct");
  const terms: PactTerms = {
    revisionsIncluded: input.terms.revisionsIncluded,
    reviewWindowHours: input.terms.reviewWindowHours,
    ipTransfer: input.terms.ipTransfer,
    communication: input.terms.communication ?? undefined,
  };
  await db.insert(pacts).values({
    id,
    title: input.title,
    summary: input.summary,
    currency: input.currency,
    status: "draft",
    creatorId: user.id,
    creatorRole: input.creatorRole,
    clientId: input.creatorRole === "client" ? user.id : null,
    freelancerId: input.creatorRole === "freelancer" ? user.id : null,
    counterpartyName: input.counterpartyName ?? null,
    counterpartyEmail: input.counterpartyEmail?.toLowerCase() ?? null,
    inviteToken: newToken(),
    sourceText: input.sourceText ?? null,
    terms,
    clarityScore: input.clarityScore ?? null,
    ambiguities: input.ambiguities,
    riskFlags: input.riskFlags,
    createdVia: via,
    demoWorkspace: user.demoWorkspace,
  });
  await writeMilestones(id, input.milestones);
  await recordEvent(db, {
    pactId: id,
    actorId: user.id,
    actorKind: via === "mcp" || via === "api" ? "agent" : "user",
    type: "pact.created",
    message: `${user.name} drafted the pact${via === "mcp" ? " via an AI agent (MCP)" : via === "api" ? " via the API" : ""}`,
  });
  return loadPact(id);
}

export async function updatePact(user: User, pactId: string, raw: unknown): Promise<Pact> {
  const pact = await loadPact(pactId);
  if (pact.creatorId !== user.id) throw forbidden("Only the pact's author can edit it");
  if (pact.status !== "draft" && pact.status !== "pending_acceptance") {
    throw invalidState("Signed pacts can't be edited");
  }
  const input = pactInput.parse({ ...raw as object, creatorRole: pact.creatorRole });
  await db
    .update(pacts)
    .set({
      title: input.title,
      summary: input.summary,
      currency: input.currency,
      counterpartyName: input.counterpartyName ?? null,
      counterpartyEmail: input.counterpartyEmail?.toLowerCase() ?? null,
      terms: { ...input.terms, communication: input.terms.communication ?? undefined },
      ambiguities: input.ambiguities,
      riskFlags: input.riskFlags,
      // Editing invalidates any signature already given.
      status: "draft",
      clientSignedAt: null,
      freelancerSignedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(pacts.id, pactId));
  await db.delete(milestones).where(eq(milestones.pactId, pactId));
  await writeMilestones(pactId, input.milestones);
  await recordEvent(db, { pactId, actorId: user.id, actorKind: "user", type: "pact.edited", message: `${user.name} edited the terms` });
  return loadPact(pactId);
}

/** Author signs and shares the invite link. */
export async function sendPact(user: User, pactId: string): Promise<Pact> {
  const pact = await loadPact(pactId);
  if (pact.creatorId !== user.id) throw forbidden("Only the pact's author can send it");
  if (pact.status !== "draft") throw invalidState("This pact has already been sent");
  const now = new Date();
  await db
    .update(pacts)
    .set({
      status: "pending_acceptance",
      ...(pact.creatorRole === "client" ? { clientSignedAt: now } : { freelancerSignedAt: now }),
      updatedAt: now,
    })
    .where(eq(pacts.id, pactId));
  await recordEvent(db, {
    pactId,
    actorId: user.id,
    actorKind: "user",
    type: "pact.signed",
    message: `${user.name} signed as ${pact.creatorRole} and sent the pact for countersignature`,
  });
  if (pact.counterpartyEmail) {
    const [cp] = await db.select().from(users).where(eq(users.email, pact.counterpartyEmail)).limit(1);
    // Only a verified owner of the address hears about the invite inside Kept; the link is shared directly.
    if (cp?.emailVerifiedAt) await notify(db, [cp.id], { pactId, title: "You've been invited to a pact", body: `${user.name} sent you “${pact.title}” to review and sign.` });
  }
  return loadPact(pactId);
}

export async function getPactByInvite(token: string) {
  const [pact] = await db.select().from(pacts).where(eq(pacts.inviteToken, token)).limit(1);
  if (!pact) throw notFound("Invitation");
  return pact;
}

/** Counterparty countersigns: the pact becomes active and milestones await funding. */
export async function acceptPact(user: User, token: string): Promise<Pact> {
  const pact = await getPactByInvite(token);
  if (pact.status !== "pending_acceptance") throw invalidState("This invitation is no longer open");
  if (pact.creatorId === user.id) throw badRequest("You can't countersign your own pact — share the link with the other party");
  const now = new Date();
  const side = pact.creatorRole === "client" ? "freelancer" : "client";
  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(pacts)
      .set({
        status: "active",
        ...(side === "client" ? { clientId: user.id, clientSignedAt: now } : { freelancerId: user.id, freelancerSignedAt: now }),
        counterpartyName: user.name,
        counterpartyEmail: user.email,
        updatedAt: now,
      })
      .where(and(eq(pacts.id, pact.id), eq(pacts.status, "pending_acceptance")))
      .returning();
    if (!claimed) throw invalidState("This invitation was just accepted or withdrawn — refresh to see the pact");
    await tx
      .update(milestones)
      .set({ status: "awaiting_funding", updatedAt: now })
      .where(and(eq(milestones.pactId, pact.id), eq(milestones.status, "draft")));
    await recordEvent(tx, {
      pactId: pact.id,
      actorId: user.id,
      actorKind: "user",
      type: "pact.activated",
      message: `${user.name} countersigned as ${side}. The pact is sealed.`,
    });
    await notify(tx, [pact.creatorId], { pactId: pact.id, title: "Pact sealed", body: `${user.name} countersigned “${pact.title}”.` });
  });
  return loadPact(pact.id);
}

export async function declinePact(user: User, token: string) {
  const pact = await getPactByInvite(token);
  if (pact.status !== "pending_acceptance") throw invalidState("This invitation is no longer open");
  await db.update(pacts).set({ status: "draft", clientSignedAt: null, freelancerSignedAt: null, updatedAt: new Date() }).where(eq(pacts.id, pact.id));
  await recordEvent(db, { pactId: pact.id, actorId: user.id, actorKind: "user", type: "pact.declined", message: `${user.name} asked for changes before signing` });
  await notify(db, [pact.creatorId], { pactId: pact.id, title: "Changes requested", body: `${user.name} wants changes to “${pact.title}” before signing.` });
}

export async function cancelPact(user: User, pactId: string) {
  const pact = await loadPact(pactId);
  assertParty(user, pact);
  const ms = await db.select().from(milestones).where(eq(milestones.pactId, pactId));
  if (ms.some((m) => !["draft", "awaiting_funding", "cancelled"].includes(m.status))) {
    throw invalidState("Funded milestones must be released or refunded before the pact can be cancelled");
  }
  await db.update(milestones).set({ status: "cancelled", updatedAt: new Date() }).where(eq(milestones.pactId, pactId));
  await db.update(pacts).set({ status: "cancelled", updatedAt: new Date() }).where(eq(pacts.id, pactId));
  await recordEvent(db, { pactId, actorId: user.id, actorKind: "user", type: "pact.cancelled", message: `${user.name} cancelled the pact` });
}

export async function listPactsForUser(user: User) {
  const rows = await db
    .select()
    .from(pacts)
    .where(
      or(
        eq(pacts.clientId, user.id),
        eq(pacts.freelancerId, user.id),
        eq(pacts.creatorId, user.id),
        // Invitations addressed to this user's email that they haven't answered yet, but only once
        // they've proved the address is theirs; otherwise anyone could register it to intercept invites.
        user.emailVerifiedAt ? and(eq(pacts.status, "pending_acceptance"), eq(pacts.counterpartyEmail, user.email)) : undefined,
      ),
    )
    .orderBy(desc(pacts.updatedAt));
  if (!rows.length) return [];
  const ms = await db.select().from(milestones).where(inArray(milestones.pactId, rows.map((r) => r.id))).orderBy(asc(milestones.position));
  return rows.map((p) => {
    const invited = p.creatorId !== user.id && !roleOf(user, p);
    const role = roleOf(user, p) ?? (invited ? (p.creatorRole === "client" ? "freelancer" : "client") : p.creatorRole);
    return { ...p, role, invited, milestones: ms.filter((m) => m.pactId === p.id) };
  });
}

export async function refreshPactStatus(pactId: string) {
  const { derivePactStatus } = await import("./state");
  const pact = await loadPact(pactId);
  const ms = await db.select({ status: milestones.status }).from(milestones).where(eq(milestones.pactId, pactId));
  const next = derivePactStatus(pact.status, ms.map((m) => m.status));
  if (next !== pact.status) {
    await db.update(pacts).set({ status: next, updatedAt: new Date() }).where(eq(pacts.id, pactId));
    if (next === "completed") {
      await recordEvent(db, { pactId, actorKind: "system", type: "pact.completed", message: "All milestones resolved. Promise kept." });
    }
  } else {
    await db.update(pacts).set({ updatedAt: new Date() }).where(eq(pacts.id, pactId));
  }
}
