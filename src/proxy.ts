import { NextResponse, type NextRequest } from "next/server";

/**
 * - Malformed percent-encoding (e.g. /u/%E0%A4%A) gets the branded 404 instead of a bare 500.
 * - The app and admin layouts receive the requested path, so a signed-out visitor who opens a deep
 *   link (a pact, an ops tab) is sent to sign in and then straight back to it.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  try {
    decodeURIComponent(pathname);
  } catch {
    return NextResponse.rewrite(new URL("/__not-found", request.url), { status: 404 });
  }
  if (pathname.startsWith("/app") || pathname.startsWith("/admin")) {
    const headers = new Headers(request.headers);
    headers.set("x-kept-path", `${pathname}${search}`);
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}

export const config = {
  // Pages only: skip static assets, images and the API (API routes validate their own input).
  matcher: ["/((?!_next/static|_next/image|api/|favicon.ico|icon.svg|opengraph-image).*)"],
};
