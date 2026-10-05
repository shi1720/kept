import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { DemoLaunch } from "./demo-launch";
import { MobileMenu } from "./mobile-menu";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#referee", label: "The referee" },
  { href: "#agents", label: "For agents" },
  { href: "#pricing", label: "Pricing" },
];

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-paper/80 backdrop-blur-md supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-3 py-1.5 text-[13.5px] text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className="hidden rounded-full px-3 py-1.5 text-[13.5px] text-ink-2 transition-colors hover:text-ink sm:inline-flex">
            Sign in
          </Link>
          <DemoLaunch label={<><span className="sm:hidden">Live demo</span><span className="hidden sm:inline">Try the live demo</span></>} />
          <MobileMenu links={LINKS} />
        </div>
      </div>
    </header>
  );
}
