import { and, desc, eq, inArray } from "drizzle-orm";
import { proposeRuling } from "@/lib/ai/mediator";
import { db } from "@/lib/db/client";
import { disputes, type Dispute, type User } from "@/lib/db/schema";
import { badRequest, forbidden, invalidState, notFound } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { assertParty, casMilestone, latestVerdict, loadMilestone, roleOf } from "./context";
import { notify, recordEvent } from "./events";
import { refreshPactStatus } from "./pacts";
import { settleMilestone } from "./settlement";
import { assertTransition } from "./state";

export async function loadDispute(disputeId: string): Promise<Dispute> {
  const [d] = await db.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
  if (!d) throw notFound("Dispute");
  return d;
}

export async function activeDispute(milestoneId: string) {
  const [d] = await db
    .select()
    .from(disputes)
    .where(and(eq(disputes.milestoneId, milestoneId), inArray(disputes.status, ["open", "ruling_proposed", "escalated"])))
    .orderBy(desc(disputes.createdAt))
    .limit(1);
  return d ?? null;
}

/** Client (or the system, when a failing submission times out) opens mediation. */
export async function openDispute(user: User | null, milestoneId: string, reason: string) {
  const { milestone, pact } = await loadMilestone(milestoneId);
  if (user) assertParty(user, pact);
  assertTransition(milestone.status, "dispute");
  if (reason.trim().length < 10) throw badRequest("Describe the problem in a sentence or two");
  const role = user ? roleOf(user, pact) : null;
  const id = newId("dsp");
  await db.transaction(async (tx) => {
    await casMilestone(tx, milestoneId, ["in_review", "submitted"], { status: "disputed" });
    await tx.insert(disputes).values({
      id,
      milestoneId,
      openedById: user?.id ?? null,
      reason: reason.trim(),
      clientStatement: role === "client" ? reason.trim() : null,
      freelancerStatement: role === "freelancer" ? reason.trim() : null,
    });
    await recordEvent(tx, {
      pactId: pact.id,
      milestoneId,
      actorId: user?.id,
      actorKind: user ? "user" : "system",
      type: "dispute.opened",
      message: user
        ? `${user.name} raised an issue: “${reason.trim().slice(0, 200)}”. Funds stay frozen in escrow during mediation.`
        : `Review window ended on a failing verdict — mediation opened automatically. Funds stay in escrow.`,
    });
    await notify(tx, [pact.clientId, pact.freelancerId].filter((x) => x !== user?.id), {
      pactId: pact.id,
      title: "Mediation opened",
      body: `An issue was raised on “${milestone.title}”. Add your side of the story — the AI mediator will propose a fair split.`,
    });
  });
  await mediate(id);
  return loadDispute(id);
}

/** (Re)run the AI mediator with everything known so far. */
export async function mediate(disputeId: string) {
  const dispute = await loadDispute(disputeId);
  if (dispute.status === "resolved") return dispute;
  const { milestone, pact, criteria } = await loadMilestone(dispute.milestoneId);
  const verdict = await latestVerdict(milestone.id);
  const ruling = await proposeRuling({ pact, milestone, criteria, verdict, dispute });
  await db
    .update(disputes)
    .set({
      ruling,
      status: dispute.status === "escalated" ? "escalated" : "ruling_proposed",
      clientAcceptedAt: null,
      freelancerAcceptedAt: null,
    })
    .where(eq(disputes.id, disputeId));
  await recordEvent(db, {
    pactId: pact.id,
    milestoneId: milestone.id,
    actorKind: "ai",
    type: "dispute.ruling_proposed",
    message: `AI mediator proposed releasing ${ruling.releasePct}% to the freelancer and refunding ${100 - ruling.releasePct}% to the client`,
    data: { releasePct: ruling.releasePct, provider: ruling.provider, model: ruling.model },
  });
  return loadDispute(disputeId);
}

export async function addStatement(user: User, disputeId: string, statement: string) {
  const dispute = await loadDispute(disputeId);
  const { pact, milestone } = await loadMilestone(dispute.milestoneId);
  const role = assertParty(user, pact);
  if (dispute.status === "resolved") throw invalidState("This dispute is already resolved");
  // Once escalated, the human arbitrator decides on the record as it stands; a new statement would
  // re-run the mediator and pull the case back from them.
  if (dispute.status === "escalated") throw invalidState("This dispute is with the arbitrator now, so statements are closed");
  if (statement.trim().length < 10) throw badRequest("Your statement is too short");
  await db
    .update(disputes)
    .set(role === "client" ? { clientStatement: statement.trim() } : { freelancerStatement: statement.trim() })
    .where(eq(disputes.id, disputeId));
  await recordEvent(db, {
    pactId: pact.id,
    milestoneId: milestone.id,
    actorId: user.id,
    actorKind: "user",
    type: "dispute.statement",
    message: `${user.name} (${role}) added their side of the story`,
  });
  return mediate(disputeId);
}

export async function respondToRuling(user: User, disputeId: string, accept: boolean) {
  const dispute = await loadDispute(disputeId);
  const { pact, milestone } = await loadMilestone(dispute.milestoneId);
  const role = roleOf(user, pact);
  if (!role) throw forbidden();
  if (dispute.status !== "ruling_proposed" || !dispute.ruling) throw invalidState("There is no proposal to respond to");

  if (!accept) {
    await db.update(disputes).set({ status: "escalated", rejectedById: user.id }).where(eq(disputes.id, disputeId));
    await recordEvent(db, {
      pactId: pact.id,
      milestoneId: milestone.id,
      actorId: user.id,
      actorKind: "user",
      type: "dispute.escalated",
      message: `${user.name} rejected the proposal. Escalated to a human arbitrator; funds remain in escrow.`,
    });
    return loadDispute(disputeId);
  }

  const now = new Date();
  const patch = role === "client" ? { clientAcceptedAt: now } : { freelancerAcceptedAt: now };
  const [updated] = await db.update(disputes).set(patch).where(eq(disputes.id, disputeId)).returning();
  await recordEvent(db, {
    pactId: pact.id,
    milestoneId: milestone.id,
    actorId: user.id,
    actorKind: "user",
    type: "dispute.accepted",
    message: `${user.name} accepted the ${dispute.ruling.releasePct}/${100 - dispute.ruling.releasePct} proposal`,
  });
  if (updated.clientAcceptedAt && updated.freelancerAcceptedAt) {
    await resolveDispute(disputeId, dispute.ruling.releasePct, { actorId: null, how: "both parties accepted the AI mediator's proposal" });
  } else {
    const other = role === "client" ? pact.freelancerId : pact.clientId;
    await notify(db, [other], {
      pactId: pact.id,
      title: "Settlement accepted by the other party",
      body: `${user.name} accepted releasing ${dispute.ruling.releasePct}% — accept to settle instantly via PayPal.`,
    });
  }
  return loadDispute(disputeId);
}

export async function resolveDispute(disputeId: string, releasePct: number, opts: { actorId: string | null; how: string }) {
  const dispute = await loadDispute(disputeId);
  if (dispute.status === "resolved") throw invalidState("Already resolved");
  const [claimed] = await db
    .update(disputes)
    .set({ status: "resolved", finalReleasePct: releasePct, resolvedAt: new Date() })
    .where(and(eq(disputes.id, disputeId), inArray(disputes.status, ["open", "ruling_proposed", "escalated"])))
    .returning();
  if (!claimed) throw invalidState("Already resolved");
  await settleMilestone(dispute.milestoneId, releasePct, {
    from: ["disputed"],
    actorId: opts.actorId,
    actorKind: opts.actorId ? "user" : "system",
    reason: opts.how,
  });
  const { pact } = await loadMilestone(dispute.milestoneId);
  await refreshPactStatus(pact.id);
}

/** Human arbitrator (admin) decides an escalated dispute. */
export async function arbitrate(admin: User, disputeId: string, releasePct: number, note: string) {
  const dispute = await loadDispute(disputeId);
  const { pact } = await loadMilestone(dispute.milestoneId);
  // Admins arbitrate everything; demo visitors may play arbitrator inside their own sandbox world.
  const demoArbiter = Boolean(admin.demoWorkspace && pact.demoWorkspace === admin.demoWorkspace);
  if (admin.role !== "admin" && !demoArbiter) throw forbidden("Arbitrators only");
  await resolveDispute(disputeId, releasePct, { actorId: admin.id, how: `human arbitrator decision: ${note || "see ruling"}` });
}
