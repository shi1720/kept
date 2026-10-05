import { headers } from "next/headers";

/** The login URL that returns to the page being requested (set by src/proxy.ts), for local paths only. */
export async function loginRedirect(fallback: string): Promise<string> {
  const requested = (await headers()).get("x-kept-path");
  const next = requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : fallback;
  return `/login?next=${encodeURIComponent(next)}`;
}
