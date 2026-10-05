import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/session";
import { ensureMigrated } from "@/lib/db/migrate";
import { env } from "@/lib/env";
import { buildMcpServer } from "@/lib/mcp/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Stateless Streamable-HTTP MCP endpoint. Authenticate with
 * `Authorization: Bearer kept_sk_…` (create a key under Developers).
 */
async function handle(req: Request) {
  await ensureMigrated();
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32001, message: `Unauthorized: create an API key at ${env.appUrl}/app/developers and send it as a Bearer token` }, id: null },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="kept"' } },
    );
  }
  const server = buildMcpServer(actor.user);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    void server.close();
  }
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
