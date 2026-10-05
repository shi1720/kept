import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/session";
import { getOpsConsole, resolveOpsScope } from "@/lib/domain/ops";
import { AppError } from "@/lib/errors";
import { handler } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * JSON feed behind the ops console's live refresh. Same scoping as /admin:
 * admins see every workspace, a demo visitor only their own sandbox world.
 * Browser sessions only — this is a console feed, not part of the public API.
 */
export const GET = handler(async () => {
  const actor = await getActor();
  if (!actor || actor.via !== "session") throw new AppError("unauthorized", "Please sign in to continue");
  const scope = resolveOpsScope(actor.user);
  if (!scope) throw new AppError("forbidden", "The ops console is for operators and demo worlds only");
  const data = await getOpsConsole(scope);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0" } });
});
