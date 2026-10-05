import { WelcomeTour } from "@/components/app/welcome-tour";
import { Code2, LayoutDashboard, PlusCircle, Settings, ShieldHalf } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ModePills } from "@/components/app/mode-pills";
import { NavLink, NotificationBell, PersonaSwitch, UserMenu } from "@/components/app/shell-client";
import { Logo } from "@/components/brand/logo";
import { loginRedirect } from "@/lib/auth/next-path";
import { getCurrentUser } from "@/lib/auth/session";
import { demoCounterpart } from "@/lib/demo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect(await loginRedirect("/app"));
  const other = await demoCounterpart(user);
  const role = user.name.startsWith("Maya") ? "client" : "freelancer";

  return (
    <div className="kept-workspace flex min-h-screen">
      <a href="#main" className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-paper px-4 py-5 lg:flex">
        <Logo href="/app" className="px-2" />
        <nav className="mt-8 flex flex-col gap-1">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-3">Workspace</p>
          <NavLink href="/app" exact icon={<LayoutDashboard />}>Overview</NavLink>
          <NavLink href="/app/pacts/new" icon={<PlusCircle />}>New pact</NavLink>
          <p className="mb-2 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-3">Manage</p>
          <NavLink href="/app/developers" icon={<Code2 />}>Agents & API</NavLink>
          <NavLink href="/app/settings" icon={<Settings />}>Settings</NavLink>
          {(user.role === "admin" || user.demoWorkspace) && <NavLink href="/admin" icon={<ShieldHalf />}>Ops console</NavLink>}
        </nav>
        <div className="mt-auto space-y-4">
          <ModePills className="px-2" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-1 sm:gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur-md sm:px-8">
          <Logo href="/app" className="lg:hidden [&>span]:hidden sm:[&>span]:inline" />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {other && <PersonaSwitch current={`${user.name} (${role})`} other={other.name} otherRole={role === "client" ? "freelancer" : "client"} />}
            <WelcomeTour userId={user.id} />
            <NotificationBell />
            <UserMenu name={user.name} email={user.email} hue={user.avatarHue} handle={user.handle} />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-[1200px] flex-1 px-4 pb-28 pt-8 sm:px-8 lg:pb-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-paper/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-md lg:hidden">
          {[
            { href: "/app", icon: <LayoutDashboard />, label: "Overview" },
            { href: "/app/pacts/new", icon: <PlusCircle />, label: "New pact" },
            { href: "/app/developers", icon: <Code2 />, label: "Agents" },
            ...(user.role === "admin" || user.demoWorkspace ? [{ href: "/admin", icon: <ShieldHalf />, label: "Ops" }] : []),
            { href: "/app/settings", icon: <Settings />, label: "Settings" },
          ].map((i) => (
            <Link key={i.href} href={i.href} className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-[10.5px] font-medium text-ink-2 [&_svg]:size-5">
              {i.icon}
              {i.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
