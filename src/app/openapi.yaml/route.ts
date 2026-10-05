import { readFile } from "node:fs/promises";
import path from "node:path";

/** The OpenAPI 3.1 spec (docs/openapi.yaml), with the deployment that served it listed as the first server. */
export async function GET(req: Request) {
  const spec = await readFile(path.join(process.cwd(), "docs", "openapi.yaml"), "utf8");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0] ?? new URL(req.url).protocol.replace(":", "");
  const origin = `${proto}://${host}`;
  const body = spec.replace(/^servers:\n/m, `servers:\n  - url: ${origin}\n    description: This deployment\n`);
  return new Response(body, {
    headers: {
      // text/plain so browsers show it instead of downloading; tools don't mind.
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}
