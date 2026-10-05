import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { ensureMigrated } from "@/lib/db/migrate";
import { disputes, milestones, pacts } from "@/lib/db/schema";
import { createDemoWorkspace, demoCounterpart } from "@/lib/demo";
import { respondToRuling } from "@/lib/domain/disputes";
import { accountBalances } from "@/lib/domain/ledger";
import { approveMilestone } from "@/lib/domain/work";
import { listPactsForUser } from "@/lib/domain/pacts";

beforeAll(() => ensureMigrated());

describe("demo workspace", () => {
  it("seeds an isolated world with pacts in every state", async () => {
    const { client, freelancer, workspace } = await createDemoWorkspace();
    const list = await listPactsForUser(client);
    expect(list.map((p) => p.status).sort()).toEqual(["active", "active", "active", "pending_acceptance"]);
    expect((await demoCounterpart(client))?.id).toBe(freelancer.id);

    const statuses = list.flatMap((p) => p.milestones.map((m) => m.status));
    expect(statuses).toEqual(expect.arrayContaining(["released", "in_review", "funded", "disputed", "draft"]));

    // Accepting the seeded AI ruling settles via payout + refund.
    const captions = list.find((p) => p.title.startsWith("Instagram"))!;
    const [d] = await db.select().from(disputes).where(eq(disputes.milestoneId, captions.milestones[0].id));
    await respondToRuling(client, d.id, true);
    await respondToRuling(freelancer, d.id, true);
    const [m] = await db.select().from(milestones).where(eq(milestones.id, captions.milestones[0].id));
    expect(m.status).toBe("settled");
    expect(m.releasedPct).toBe(65);

    const brand = list.find((p) => p.title.startsWith("Brand"))!;
    await approveMilestone(client, brand.milestones[1].id);
    const [p] = await db.select().from(pacts).where(eq(pacts.id, brand.id));
    expect(p.status).toBe("completed");

    const bal = await accountBalances(db, workspace);
    expect(Object.values(bal).reduce((s, x) => s + x, 0)).toBe(0);
  });

  it("creates distinct workspaces per visitor", async () => {
    const a = await createDemoWorkspace();
    const b = await createDemoWorkspace();
    expect(a.workspace).not.toBe(b.workspace);
    expect(a.client.handle).not.toBe(b.client.handle);
  });
});
