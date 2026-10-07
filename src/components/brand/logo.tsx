import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="1" y="1" width="62" height="62" rx="19" fill="#174f3e" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="18.5" fill="none" stroke="#ffffff18" />
      <path d="M21 18V46M21 32H29" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <path d="M43 18L29 32L43 46" stroke="#b2dfb5" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo({ href = "/", className, light }: { href?: string; className?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5 no-underline", className)}>
      <LogoMark size={32} className="transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" />
      <span className={cn("brand-wordmark text-[28px] font-semibold tracking-[-0.055em] leading-none", light ? "text-paper" : "text-ink")}>Kept</span>
    </Link>
  );
}
