import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  criteria,
  milestones,
  pacts,
  users,
  verdicts,
  type Milestone,
  type MilestoneStatus,
  type Pact,
  type User,
} from "@/lib/db/schema";
import { forbidden, invalidState, notFound } from "@/lib/errors";
import type { DbOrTx } from "./ledger";

export type PartyRole = "client" | "freelancer";

export function roleOf(user: Pick<User, "id">, pact: Pact): PartyRole | null {
  if (pact.clientId === user.id) return "client";
  if (pact.freelancerId === user.id) return "freelancer";
  return null;
}

export function assertParty(user: User, pact: Pact, role?: PartyRole): PartyRole {
  const r = roleOf(user, pact);
  if (!r && user.role !== "admin") throw forbidden();
  if (role && r !== role) throw forbidden(`Only the ${role} can do this`);
  return (r ?? "client") as PartyRole;
}

export async function loadPact(pactId: string, dbx: DbOrTx = db): Promise<Pact> {
  const [pact] = await dbx.select().from(pacts).where(eq(pacts.id, pactId)).limit(1);
  if (!pact) throw notFound("Pact");
  return pact;
}

export async function loadMilestone(milestoneId: string, dbx: DbOrTx = db) {
  const [row] = await dbx
    .select({ milestone: milestones, pact: pacts })
    .from(milestones)
    .innerJoin(pacts, eq(pacts.id, milestones.pactId))
    .where(eq(milestones.id, milestoneId))
    .limit(1);
  if (!row) throw notFound("Milestone");
  const crit = await dbx.select().from(criteria).where(eq(criteria.milestoneId, milestoneId)).orderBy(asc(criteria.position));
  return { ...row, criteria: crit };
}

export async function latestVerdict(milestoneId: string, dbx: DbOrTx = db) {
  const [v] = await dbx.select().from(verdicts).where(eq(verdicts.milestoneId, milestoneId)).orderBy(desc(verdicts.createdAt)).limit(1);
  return v ?? null;
}

export async function loadUser(userId: string | null | undefined, dbx: DbOrTx = db): Promise<User | null> {
  if (!userId) return null;
  const [u] = await dbx.select().from(users).where(eq(users.id, userId)).limit(1);
  return u ?? null;
}

/**
 * Compare-and-set a milestone's status. Returns the updated row, or throws if
 * another request already moved it — this is what makes approve, auto-release
 * and webhook handlers safe to race each other.
 */
export async function casMilestone(
  dbx: DbOrTx,
  milestoneId: string,
  from: MilestoneStatus[],
  patch: Partial<Milestone> & { status: MilestoneStatus },
): Promise<Milestone> {
  const [updated] = await dbx
    .update(milestones)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(milestones.id, milestoneId), inArray(milestones.status, from)))
    .returning();
  if (!updated) throw invalidState("This milestone was updated by someone else — refresh to see its latest state");
  return updated;
}
