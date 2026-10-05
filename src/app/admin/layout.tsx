import { Code2, LayoutDashboard, Settings, ShieldHalf } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ModePills } from "@/components/app/mode-pills";
import { NavLink, NotificationBell, UserMenu } from "@/components/app/shell-client";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveOpsScope } from "@/lib/domain/ops";

export const metadata: Metadata = { title: { default: "Ops console", template: "%s · Kept ops" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  const scope = resolveOpsScope(user);
  if (!scope) redirect("/app");

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-paper px-4 py-5 lg:flex">
        <Logo href="/app" className="px-2" />
        <nav className="mt-8 flex flex-col gap-1">
          <NavLink href="/app" exact icon={<LayoutDashboard />}>Overview</NavLink>
          <NavLink href="/admin" icon={<ShieldHalf />}>Ops console</NavLink>
          <NavLink href="/app/developers" icon={<Code2 />}>Agents & API</NavLink>
          <NavLink href="/app/settings" icon={<Settings />}>Settings</NavLink>
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
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
