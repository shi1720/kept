import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

/** The OpenAPI 3.1 spec (docs/openapi.yaml), with this deployment listed as the first server. */
export async function GET() {
  const spec = await readFile(path.join(process.cwd(), "docs", "openapi.yaml"), "utf8");
  const body = spec.replace(/^servers:\n/m, `servers:\n  - url: ${env.appUrl}\n    description: This deployment\n`);
  return new Response(body, {
    headers: {
      "content-type": "application/yaml; charset=utf-8",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}
