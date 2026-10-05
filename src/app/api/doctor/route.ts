import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runDoctor } from "@/lib/doctor";
import { env, paypalConfigured, emailConfigured } from "@/lib/env";
import { aiStatus } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Public status never spends credits or initiates payments. */
export async function GET() {
  return NextResponse.json({ paypal: paypalConfigured(), ai: aiStatus(), email: emailConfigured() });
}

/** Explicit operator-only live sandbox diagnostics. */
export async function POST(request: Request) {
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.cronSecret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (env.paypal.environment !== "sandbox") return NextResponse.json({ error: "Sandbox only" }, { status: 409 });
  return NextResponse.json(await runDoctor());
}
