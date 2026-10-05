import { cn } from "@/lib/cn";

export function Avatar({ name, hue = 160, size = 32, className }: { name: string; hue?: number; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ring-2 ring-card", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 45% 88%), hsl(${(hue + 30) % 360} 50% 80%))`,
        color: `hsl(${hue} 45% 24%)`,
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
