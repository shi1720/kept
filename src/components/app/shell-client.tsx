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
import { cn } from "@/lib/cn";

export function NavLink({ href, icon, children, exact }: { href: string; icon: React.ReactNode; children: React.ReactNode; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors [&_svg]:size-4",
        active ? "bg-card text-ink shadow-card" : "text-ink-2 hover:bg-paper-2 hover:text-ink",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

export function PersonaSwitch({ current, other, otherRole }: { current: string; other: string; otherRole: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3 rounded-full border border-ember-100 bg-ember-50 py-1 pl-3 pr-1 text-[13px] text-ember-700">
      <span className="hidden sm:inline">
        Demo · you are <b>{current}</b>
      </span>
      <Button
        size="sm"
        variant="ember"
        loading={pending}
        onClick={() =>
          start(async () => {
            await api("/api/auth/switch", { body: {} });
            toast.success(`Now viewing as ${other} (${otherRole})`);
            router.refresh();
          })
        }
      >
        <Repeat2 /> Switch to {other.split(" ")[0]}
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
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-[360px] overflow-hidden rounded-2xl border border-line bg-card shadow-lift">
          <div className="border-b border-line px-4 py-3 text-sm font-semibold">Notifications</div>
          <div className="max-h-[420px] overflow-y-auto">
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
        <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-paper-2">
          <Avatar name={name} hue={hue} size={30} />
          <span className="hidden text-[13px] font-medium md:inline">{name}</span>
          <ChevronDown className="size-3.5 text-ink-3" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-60 rounded-2xl border border-line bg-card p-1.5 shadow-lift">
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
