import { Code2, LayoutDashboard, PlusCircle, Settings, ShieldHalf } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ModePills } from "@/components/app/mode-pills";
import { NavLink, NotificationBell, UserMenu } from "@/components/app/shell-client";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { loginRedirect } from "@/lib/auth/next-path";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveOpsScope } from "@/lib/domain/ops";

export const metadata: Metadata = { title: { default: "Ops console", template: "%s · Kept ops" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect(await loginRedirect("/admin"));
  const scope = resolveOpsScope(user);
  if (!scope) redirect("/app");

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-paper px-4 py-5 lg:flex">
        <Logo href="/app" className="px-2" />
        <nav className="mt-8 flex flex-col gap-1">
          <NavLink href="/app" exact icon={<LayoutDashboard />}>Overview</NavLink>
          <NavLink href="/app/pacts/new" icon={<PlusCircle />}>New pact</NavLink>
          <NavLink href="/app/developers" icon={<Code2 />}>Agents & API</NavLink>
          <NavLink href="/app/settings" icon={<Settings />}>Settings</NavLink>
          <NavLink href="/admin" icon={<ShieldHalf />}>Ops console</NavLink>
        </nav>
        <div className="mt-auto space-y-4">
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Scope</p>
            <p className="mt-1 text-[13px] font-medium">{scope.kind === "admin" ? "Every workspace" : "Your demo world"}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-3">
              {scope.kind === "admin"
                ? "Live accounts plus every demo sandbox. Rulings made here settle through PayPal."
                : "The same console Kept's operators use, filtered to the sandbox world created for you."}
            </p>
          </div>
          <ModePills className="px-2" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur-md sm:px-8">
          <Logo href="/app" className="lg:hidden" />
          <div className="hidden items-center gap-2 text-[13px] text-ink-3 sm:flex lg:ml-0">
            <ShieldHalf className="size-4" />
            <span className="font-medium text-ink-2">Ops console</span>
            {scope.kind === "admin" ? <Badge tone="ink">Admin</Badge> : <Badge tone="ember">Demo world</Badge>}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <UserMenu name={user.name} email={user.email} hue={user.avatarHue} handle={user.handle} />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-[1440px] flex-1 px-4 pb-28 pt-8 sm:px-8 lg:pb-8">{children}</main>
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-paper/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-md lg:hidden"
        >
          {[
            { href: "/app", icon: <LayoutDashboard />, label: "Overview", active: false },
            { href: "/admin", icon: <ShieldHalf />, label: "Ops", active: true },
            { href: "/app/developers", icon: <Code2 />, label: "Agents", active: false },
            { href: "/app/settings", icon: <Settings />, label: "Settings", active: false },
          ].map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={i.active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-[10.5px] font-medium [&_svg]:size-5 ${i.active ? "text-jade-700" : "text-ink-2"}`}
            >
              {i.icon}
              {i.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
