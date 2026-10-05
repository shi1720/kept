import { NextResponse, type NextRequest } from "next/server";

/**
 * Pass the requested path to the app and admin layouts, so a signed-out visitor who opens a deep
 * link (a pact, an ops tab) is sent to sign in and then straight back to it.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-kept-path", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/app/:path*", "/admin/:path*"] };
