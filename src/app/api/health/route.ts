import { sql } from "drizzle-orm";
import { aiStatus } from "@/lib/ai/provider";
import { db } from "@/lib/db/client";
import { handler } from "@/lib/http";
import { getPayPal } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await db.run(sql`select 1`);
  return { ok: true, paypal: getPayPal().mode, ai: aiStatus(), time: new Date().toISOString() };
});
