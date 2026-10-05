import { cn } from "@/lib/cn";

export function Progress({ value, className, tone = "jade" }: { value: number; className?: string; tone?: "jade" | "amber" | "rose" | "ink" }) {
  const color = { jade: "bg-jade-600", amber: "bg-amber-500", rose: "bg-rose-500", ink: "bg-ink" }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-paper-2", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
