import { Code2, LayoutDashboard, PlusCircle, Settings, ShieldHalf } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ModePills } from "@/components/app/mode-pills";
import { NavLink, NotificationBell, PersonaSwitch, UserMenu } from "@/components/app/shell-client";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { demoCounterpart } from "@/lib/demo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app");
  const other = await demoCounterpart(user);
  const role = user.name.startsWith("Maya") ? "client" : "freelancer";

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-paper px-4 py-5 lg:flex">
        <Logo href="/app" className="px-2" />
        <nav className="mt-8 flex flex-col gap-1">
          <NavLink href="/app" exact icon={<LayoutDashboard />}>Overview</NavLink>
          <NavLink href="/app/pacts/new" icon={<PlusCircle />}>New pact</NavLink>
          <NavLink href="/app/developers" icon={<Code2 />}>Agents & API</NavLink>
          <NavLink href="/app/settings" icon={<Settings />}>Settings</NavLink>
          {user.role === "admin" && <NavLink href="/admin" icon={<ShieldHalf />}>Ops console</NavLink>}
        </nav>
        <div className="mt-auto space-y-4">
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-[13px] font-medium">Paste a DM, get a contract</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-3">Kept turns any chat into a pact with checkable criteria in seconds.</p>
            <Button asChild size="sm" variant="jade" className="mt-3 w-full">
              <Link href="/app/pacts/new">Start a pact</Link>
            </Button>
          </div>
          <ModePills className="px-2" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur-md sm:px-8">
          <Logo href="/app" className="lg:hidden" />
          <div className="ml-auto flex items-center gap-2">
            {other && <PersonaSwitch current={`${user.name} (${role})`} other={other.name} otherRole={role === "client" ? "freelancer" : "client"} />}
            <NotificationBell />
            <UserMenu name={user.name} email={user.email} hue={user.avatarHue} handle={user.handle} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
