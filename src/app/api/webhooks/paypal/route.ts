import { NextResponse } from "next/server";
import { ensureMigrated } from "@/lib/db/migrate";
import { handlePayPalWebhook, type PayPalWebhookEvent } from "@/lib/domain/webhooks";
import { getPayPal } from "@/lib/paypal";

/**
 * PayPal webhook receiver. The raw body is verified with PayPal's
 * verify-webhook-signature API before anything is acted on.
 */
export async function POST(req: Request) {
  await ensureMigrated();
  const rawBody = await req.text();
  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  let verified = false;
  try {
    verified = await getPayPal().verifyWebhook({ headers: req.headers, rawBody });
  } catch (err) {
    console.error("[webhook] verification error", err);
  }
  if (!verified) {
    // Non-2xx makes PayPal retry later; nothing is recorded or acted on.
    return NextResponse.json({ error: "signature verification failed" }, { status: 401 });
  }
  try {
    const result = await handlePayPalWebhook(event, true);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[webhook] processing failed", err);
    // Non-2xx makes PayPal retry later.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
