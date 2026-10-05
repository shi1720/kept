import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  artifacts,
  criteria,
  disputes,
  events,
  milestones,
  payments,
  payouts,
  refunds,
  submissions,
  verdicts,
  type Pact,
  type User,
} from "@/lib/db/schema";
import { forbidden } from "@/lib/errors";
import { loadPact, loadUser, roleOf } from "./context";

export type PublicUser = Pick<User, "id" | "name" | "handle" | "headline" | "avatarHue" | "paypalVerified">;

export const publicUser = (u: User | null): PublicUser | null =>
  u ? { id: u.id, name: u.name, handle: u.handle, headline: u.headline, avatarHue: u.avatarHue, paypalVerified: u.paypalVerified } : null;

/** Everything the pact room needs, in one round trip, scoped to what this viewer may see. */
export async function getPactDetail(viewer: User | null, pactId: string, opts: { inviteToken?: string } = {}) {
  const pact = await loadPact(pactId);
  const role = viewer ? roleOf(viewer, pact) : null;
  const isCreator = viewer?.id === pact.creatorId;
  const viaInvite = opts.inviteToken && opts.inviteToken === pact.inviteToken;
  if (!role && !isCreator && viewer?.role !== "admin" && !viaInvite) throw forbidden();

  const ms = await db.select().from(milestones).where(eq(milestones.pactId, pactId)).orderBy(asc(milestones.position));
  const ids = ms.map((m) => m.id);
  const none = ids.length === 0;
  const [crit, subs, verds, disps, pays, pyos, rfds, evts, client, freelancer] = await Promise.all([
    none ? [] : db.select().from(criteria).where(inArray(criteria.milestoneId, ids)).orderBy(asc(criteria.position)),
    none ? [] : db.select().from(submissions).where(inArray(submissions.milestoneId, ids)).orderBy(desc(submissions.version)),
    none ? [] : db.select().from(verdicts).where(inArray(verdicts.milestoneId, ids)).orderBy(desc(verdicts.createdAt)),
    none ? [] : db.select().from(disputes).where(inArray(disputes.milestoneId, ids)).orderBy(desc(disputes.createdAt)),
    none ? [] : db.select().from(payments).where(inArray(payments.milestoneId, ids)).orderBy(desc(payments.createdAt)),
    none ? [] : db.select().from(payouts).where(inArray(payouts.milestoneId, ids)),
    none ? [] : db.select().from(refunds).where(inArray(refunds.milestoneId, ids)),
    db.select().from(events).where(eq(events.pactId, pactId)).orderBy(desc(events.createdAt)).limit(200),
    loadUser(pact.clientId),
    loadUser(pact.freelancerId),
  ]);
  const subIds = subs.map((s) => s.id);
  const arts = subIds.length
    ? await db
        .select({
          id: artifacts.id,
          submissionId: artifacts.submissionId,
          kind: artifacts.kind,
          name: artifacts.name,
          mime: artifacts.mime,
          sizeBytes: artifacts.sizeBytes,
          content: artifacts.content,
          sha256: artifacts.sha256,
        })
        .from(artifacts)
        .where(inArray(artifacts.submissionId, subIds))
    : [];

  const milestonesOut = ms.map((m) => {
    const mSubs = subs.filter((s) => s.milestoneId === m.id);
    return {
      ...m,
      criteria: crit.filter((c) => c.milestoneId === m.id),
      submissions: mSubs.map((s) => ({
        ...s,
        artifacts: arts
          .filter((a) => a.submissionId === s.id)
          .map((a) => ({ ...a, content: a.kind === "text" ? (a.content ?? "").slice(0, 20_000) : a.content })),
      })),
      verdicts: verds.filter((v) => v.milestoneId === m.id),
      dispute: disps.find((d) => d.milestoneId === m.id) ?? null,
      payment: pays.find((p) => p.milestoneId === m.id && p.status !== "created") ?? null,
      payout: pyos.find((p) => p.milestoneId === m.id) ?? null,
      refund: rfds.find((r) => r.milestoneId === m.id) ?? null,
    };
  });

  return {
    pact: redactPact(pact, Boolean(role || isCreator || viewer?.role === "admin")),
    role: role ?? (isCreator ? pact.creatorRole : null),
    isCreator,
    client: publicUser(client),
    freelancer: publicUser(freelancer),
    milestones: milestonesOut,
    events: evts,
    totals: {
      amountCents: ms.reduce((s, m) => s + m.amountCents, 0),
      heldCents: ms.filter((m) => ["funded", "submitted", "in_review", "disputed"].includes(m.status)).reduce((s, m) => s + m.amountCents, 0),
      releasedCents: pyos.reduce((s, p) => s + p.amountCents, 0),
      refundedCents: rfds.reduce((s, r) => s + r.amountCents, 0),
    },
  };
}

function redactPact(pact: Pact, full: boolean) {
  return full ? pact : { ...pact, inviteToken: "", sourceText: null };
}

export type PactDetail = Awaited<ReturnType<typeof getPactDetail>>;
