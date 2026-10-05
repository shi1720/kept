import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { artifacts, submissions } from "@/lib/db/schema";
import { assertParty, loadMilestone } from "@/lib/domain/context";
import { notFound } from "@/lib/errors";
import { handler } from "@/lib/http";

/** Download a submitted file. Only the pact's parties (and admins) can read it. */
export const GET = handler<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  const [row] = await db
    .select({ artifact: artifacts, milestoneId: submissions.milestoneId })
    .from(artifacts)
    .innerJoin(submissions, eq(submissions.id, artifacts.submissionId))
    .where(eq(artifacts.id, id))
    .limit(1);
  if (!row) throw notFound("File");
  const { pact } = await loadMilestone(row.milestoneId);
  assertParty(user, pact);
  const a = row.artifact;
  const body = a.data ? new Uint8Array(a.data) : new TextEncoder().encode(a.content ?? "");
  const safeName = a.name.replace(/[^\w.\- ]+/g, "_");
  const inline = (a.mime ?? "").startsWith("image/") && !(a.mime ?? "").includes("svg");
  return new Response(body, {
    headers: {
      "Content-Type": inline ? a.mime! : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
});
