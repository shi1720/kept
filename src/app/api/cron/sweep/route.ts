import {recoverJobs} from "@/lib/ai/jobs";
import { NextResponse } from "next/server";
import { ensureMigrated } from "@/lib/db/migrate";
import { sweep } from "@/lib/domain/sweep";
import { env } from "@/lib/env";

export const maxDuration = 300;

async function run(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.cronSecret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await ensureMigrated();
  await recoverJobs();
  return NextResponse.json(await sweep());
}

export const GET = run;
export const POST = run;
