import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("relative overflow-hidden rounded-lg bg-paper-2", className)}><div className="shimmer absolute inset-0" /></div>;
}
