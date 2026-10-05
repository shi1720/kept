import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { emailConfigured, env, isProduction } from "@/lib/env";

/**
 * Transactional email. Sent through Resend's HTTP API when RESEND_API_KEY is set. Without it,
 * development servers print the message (links included) to the server log, and nothing is sent.
 * EMAIL_OUTBOX_DIR additionally writes each message to disk, which the end-to-end tests read.
 */
export interface Email {
  to: string;
  subject: string;
  /** Plain-text body; the HTML version is derived from it. */
  text: string;
  /** Optional call to action rendered as a button. */
  action?: { label: string; url: string };
}

export interface SendResult {
  delivered: boolean;
  /** "resend", or "log" when no provider is configured. */
  via: "resend" | "log";
}

export async function sendEmail(email: Email): Promise<SendResult> {
  if (env.email.outboxDir) await writeOutbox(email).catch((err) => console.error("[email] outbox write failed", err));

  if (!emailConfigured()) {
    if (!isProduction || env.email.outboxDir) {
      console.info(`[email] (not sent: no RESEND_API_KEY) to=${email.to} subject="${email.subject}"${email.action ? ` link=${email.action.url}` : ""}`);
    } else {
      console.warn(`[email] not sent to ${email.to}: RESEND_API_KEY is not configured`);
    }
    return { delivered: false, via: "log" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.email.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.email.from, to: [email.to], subject: email.subject, text: plainText(email), html: html(email) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.error(`[email] Resend rejected the message (${res.status}): ${await res.text().catch(() => "")}`);
    return { delivered: false, via: "resend" };
  }
  return { delivered: true, via: "resend" };
}

function plainText(e: Email) {
  return e.action ? `${e.text}\n\n${e.action.label}: ${e.action.url}\n\n— Kept` : `${e.text}\n\n— Kept`;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function html(e: Email) {
  const paragraphs = e.text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.55">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const button = e.action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(e.action.url)}" style="background:#0f6b57;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;display:inline-block">${escapeHtml(e.action.label)}</a></p>
       <p style="margin:0 0 16px;font-size:13px;color:#6b665c">Or paste this link into your browser:<br><span style="word-break:break-all">${escapeHtml(e.action.url)}</span></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f7f5f0;padding:32px 16px;font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;color:#16140f">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e8e2d6;border-radius:20px;padding:32px">
    <p style="margin:0 0 24px;font-family:Georgia,serif;font-size:24px;color:#0f6b57">Kept</p>
    ${paragraphs}${button}
    <p style="margin:24px 0 0;font-size:12px;color:#6b665c">Kept · escrow with an AI referee, built on PayPal</p>
  </div></body></html>`;
}

async function writeOutbox(e: Email) {
  await mkdir(env.email.outboxDir, { recursive: true });
  const file = path.join(env.email.outboxDir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  await writeFile(file, JSON.stringify({ ...e, sentAt: new Date().toISOString() }, null, 2));
}
