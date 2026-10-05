import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#0f6b57" />
      <path d="M20 16v32M20 33l16-17M27 27l15 21" stroke="#faf8f3" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="46" cy="18" r="5" fill="#d9541e" />
    </svg>
  );
}

export function Logo({ href = "/", className, light }: { href?: string; className?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <LogoMark size={28} className="transition-transform group-hover:-rotate-6" />
      <span className={cn("display text-[26px] leading-none", light ? "text-paper" : "text-ink")}>Kept</span>
    </Link>
  );
}
