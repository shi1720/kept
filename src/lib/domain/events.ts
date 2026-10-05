import { events, notifications } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import type { DbOrTx } from "./ledger";

export type ActorKind = "user" | "ai" | "system" | "paypal" | "agent";

export interface EventInput {
  pactId: string;
  milestoneId?: string;
  actorId?: string | null;
  actorKind: ActorKind;
  type: string;
  message: string;
  data?: Record<string, unknown>;
}

/** Append to the pact's tamper-evident activity timeline. */
export async function recordEvent(dbx: DbOrTx, e: EventInput) {
  await dbx.insert(events).values({
    id: newId("evt"),
    pactId: e.pactId,
    milestoneId: e.milestoneId,
    actorId: e.actorId ?? null,
    actorKind: e.actorKind,
    type: e.type,
    message: e.message,
    data: e.data,
  });
}

export async function notify(
  dbx: DbOrTx,
  userIds: (string | null | undefined)[],
  n: { pactId?: string; title: string; body: string },
) {
  const ids = [...new Set(userIds.filter((x): x is string => Boolean(x)))];
  if (ids.length === 0) return;
  await dbx.insert(notifications).values(
    ids.map((userId) => ({ id: newId("ntf"), userId, pactId: n.pactId, title: n.title, body: n.body })),
  );
}
