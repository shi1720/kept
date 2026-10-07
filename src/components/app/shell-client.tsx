"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, ChevronDown, LogOut, Repeat2, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client-api";
import { ago } from "@/lib/time";
import { cn } from "@/lib/cn";

export function NavLink({ href, icon, children, exact }: { href: string; icon: React.ReactNode; children: React.ReactNode; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link
      title={typeof children==="string"?children:undefined}
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors [&_svg]:size-4",
        active ? "bg-card text-ink shadow-card" : "text-ink-2 hover:bg-paper-2 hover:text-ink",
      )}
    >
      {icon}
      <span className="nav-label">{children}</span>
    </Link>
  );
}

export function PersonaSwitch({ current, other, otherRole }: { current: string; other: string; otherRole: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="persona-switch flex items-center gap-1.5 rounded-xl border border-line bg-paper p-1 text-[13px] text-ink-2">
      <span className="persona-current flex items-center gap-2 rounded-lg bg-jade-700 px-2.5 py-2 text-xs font-semibold text-white" title={`Viewing as ${current}`}><span className="size-1.5 rounded-full bg-[#a5e4c5]"/><span>{current.split(" ")[0]}<span className="hidden md:inline font-normal opacity-80"> · {current.includes("client")?"Client":"Freelancer"}</span></span><span className="sr-only">Viewing as {current}</span></span>
      <Button
        size="sm"
        variant="outline"
        className="persona-target bg-white shadow-sm"
        aria-label={`Switch to ${other.split(" ")[0]}, ${otherRole}`}
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await api<{ redirect: string }>("/api/auth/switch", { body: { path: window.location.pathname } });
            toast.success(`Now viewing as ${other} (${otherRole})`);
            if (r.redirect !== window.location.pathname) router.push(r.redirect);
            router.refresh();
          })
        }
      >
        <Repeat2 /> <span className="hidden sm:inline">Switch to </span>{other.split(" ")[0]}
      </Button>
    </div>
  );
}

interface Notification {
  id: string;
  title: string;
  body: string;
  pactId: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const [data, setData] = useState<{ items: Notification[]; unread: number }>({ items: [], unread: 0 });
  const router = useRouter();
  useEffect(() => {
    let alive = true;
    const load = () => api<typeof data>("/api/notifications", { quiet: true }).then((d) => alive && setData(d)).catch(() => {});
    load();
    const t = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return (
    <DropdownMenu.Root onOpenChange={(open) => open && data.unread > 0 && api("/api/notifications", { body: {}, quiet: true }).then(() => setData((d) => ({ ...d, unread: 0 })))}>
      <DropdownMenu.Trigger asChild>
        <button className="relative rounded-full p-2 text-ink-2 hover:bg-paper-2 hover:text-ink" aria-label="Notifications">
          <Bell className="size-[18px]" />
          {data.unread > 0 && <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-ember-600 text-[10px] font-bold text-white">{data.unread}</span>}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="workspace-menu z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-line bg-card shadow-lift">
          <div className="border-b border-line px-4 py-3 text-sm font-semibold">Notifications</div>
          <div className="max-h-[min(420px,60dvh)] overflow-y-auto">
            {data.items.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-3">You’re all caught up.</p>}
            {data.items.map((n) => (
              <DropdownMenu.Item
                key={n.id}
                onSelect={() => n.pactId && router.push(`/app/pacts/${n.pactId}`)}
                className="flex cursor-pointer flex-col gap-0.5 border-b border-line/60 px-4 py-3 outline-none last:border-0 data-[highlighted]:bg-paper"
              >
                <span className="flex items-center gap-2 text-[13px] font-medium">
                  {!n.readAt && <span className="size-1.5 rounded-full bg-ember-600" />}
                  {n.title}
                </span>
                <span className="line-clamp-2 text-xs text-ink-3">{n.body}</span>
                <time dateTime={n.createdAt} className="text-[11px] text-ink-3">
                  {ago(n.createdAt)}
                </time>
              </DropdownMenu.Item>
            ))}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function UserMenu({ name, email, hue, handle }: { name: string; email: string; hue: number; handle: string }) {
  const router = useRouter();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button aria-label={`${name}, account menu`} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 sm:pr-2 hover:bg-paper-2">
          <Avatar name={name} hue={hue} size={30} />
          <span className="hidden text-[13px] font-medium md:inline">{name}</span>
          <ChevronDown className="hidden size-3.5 text-ink-3 sm:block" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="workspace-menu z-50 w-60 rounded-2xl border border-line bg-card p-1.5 shadow-lift">
          <div className="px-3 py-2">
            <div className="text-sm font-medium">{name}</div>
            <div className="truncate text-xs text-ink-3">{email}</div>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          {[
            { href: `/u/${handle}`, icon: <UserRound />, label: "Public track record" },
            { href: "/app/settings", icon: <Settings />, label: "Settings & payouts" },
          ].map((i) => (
            <DropdownMenu.Item key={i.href} onSelect={() => router.push(i.href)} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[13px] outline-none data-[highlighted]:bg-paper-2 [&_svg]:size-4 [&_svg]:text-ink-3">
              {i.icon}
              {i.label}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Item onSelect={()=>window.dispatchEvent(new Event('kept:open-guide'))} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[13px] outline-none data-[highlighted]:bg-paper-2">Getting started guide</DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={async () => {
              await api("/api/auth/logout", { body: {} });
              router.push("/");
              router.refresh();
            }}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[13px] outline-none data-[highlighted]:bg-paper-2 [&_svg]:size-4 [&_svg]:text-ink-3"
          >
            <LogOut />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function MobileNavLink({href,children}:{href:string;children:React.ReactNode}){const path=usePathname();const active=href==='/app'?path===href:path.startsWith(href);return <Link href={href} aria-current={active?'page':undefined} className={cn('mobile-nav-link flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors [&_svg]:size-[18px]',active?'bg-sky-50 text-sky-600':'text-ink-3')}>{children}</Link>}
