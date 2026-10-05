import { NextResponse } from "next/server";
import { runDoctor } from "@/lib/doctor";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const g = globalThis as unknown as { __doctor?: { at: number; data: Awaited<ReturnType<typeof runDoctor>> } };

/** Public integration self-test, cached for 10 minutes. Exposes outcomes, never secrets. */
export async function GET() {
  if (!g.__doctor || Date.now() - g.__doctor.at > 10 * 60_000) {
    g.__doctor = { at: Date.now(), data: await runDoctor() };
  }
  return NextResponse.json(g.__doctor.data);
}
