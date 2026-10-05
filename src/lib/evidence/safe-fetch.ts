import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { env } from "@/lib/env";

/**
 * Fetch untrusted, user-supplied URLs without opening an SSRF hole: only
 * http(s), no credentials in the URL, no private/loopback/link-local targets,
 * bounded redirects, time and body size.
 */
export interface SafeFetchResult {
  ok: boolean;
  status: number;
  finalUrl: string;
  contentType: string;
  body: string;
  latencyMs: number;
  error?: string;
}

const MAX_BYTES = 2_000_000;

export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

async function assertPublic(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http(s) URLs can be checked");
  // Kept's own sample deliverables are always allowed (they live on APP_URL, which may be localhost in dev).
  if (url.origin === new URL(env.appUrl).origin && url.pathname.startsWith("/samples/")) return;
  if (url.username || url.password) throw new Error("URLs with credentials are not allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Private hosts are not allowed");
  }
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addrs.some((a) => isPrivateAddress(a.address))) throw new Error("Private network addresses are not allowed");
}

export async function safeFetch(
  rawUrl: string,
  opts: { timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<SafeFetchResult> {
  const started = Date.now();
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, status: 0, finalUrl: rawUrl, contentType: "", body: "", latencyMs: 0, error: "Invalid URL" };
  }
  try {
    for (let hop = 0; hop < 5; hop++) {
      await assertPublic(url);
      const res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
        headers: { "User-Agent": "KeptEvidenceBot/1.0 (+https://github.com/shi1720/paypal-ai)", ...opts.headers },
        cache: "no-store",
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        url = new URL(res.headers.get("location")!, url);
        continue;
      }
      const body = await readCapped(res);
      return {
        ok: res.ok,
        status: res.status,
        finalUrl: url.toString(),
        contentType: res.headers.get("content-type") ?? "",
        body,
        latencyMs: Date.now() - started,
      };
    }
    throw new Error("Too many redirects");
  } catch (err) {
    return {
      ok: false,
      status: 0,
      finalUrl: url.toString(),
      contentType: "",
      body: "",
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
