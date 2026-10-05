"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** Small-screen nav menu; closes after a link is chosen, on Escape, or on a tap outside it. */
export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => ref.current?.removeAttribute("open");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
      ref.current?.querySelector("summary")?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <details ref={ref} className="group relative lg:hidden" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary
        className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full border border-line-2 bg-card text-ink-2 [&::-webkit-details-marker]:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        <Menu className="size-4" aria-hidden />
      </summary>
      <nav aria-label="Site" className="absolute right-0 top-11 w-52 overflow-hidden rounded-2xl border border-line bg-card p-1.5 shadow-lift">
        {links.map((l) => (
          <a key={l.href} href={l.href} onClick={close} className="block rounded-xl px-3 py-2.5 text-sm text-ink-2 hover:bg-paper-2 hover:text-ink">
            {l.label}
          </a>
        ))}
        <Link href="/login" onClick={close} className="block rounded-xl px-3 py-2.5 text-sm text-ink-2 hover:bg-paper-2 hover:text-ink">
          Sign in
        </Link>
      </nav>
    </details>
  );
}
