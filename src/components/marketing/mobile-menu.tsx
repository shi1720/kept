"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

/** Small-screen nav menu; closes itself after a link is chosen. */
export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => ref.current?.removeAttribute("open");
  return (
    <details ref={ref} className="group relative lg:hidden">
      <summary
        className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full border border-line-2 bg-card text-ink-2 [&::-webkit-details-marker]:hidden"
        aria-label="Menu"
      >
        <Menu className="size-4" aria-hidden />
      </summary>
      <div className="absolute right-0 top-11 w-52 overflow-hidden rounded-2xl border border-line bg-card p-1.5 shadow-lift">
        {links.map((l) => (
          <a key={l.href} href={l.href} onClick={close} className="block rounded-xl px-3 py-2.5 text-sm text-ink-2 hover:bg-paper-2 hover:text-ink">
            {l.label}
          </a>
        ))}
        <Link href="/login" onClick={close} className="block rounded-xl px-3 py-2.5 text-sm text-ink-2 hover:bg-paper-2 hover:text-ink">
          Sign in
        </Link>
      </div>
    </details>
  );
}
