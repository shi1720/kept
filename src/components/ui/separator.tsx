import { cn } from "@/lib/cn";

export function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return <div className={cn(vertical ? "w-px self-stretch bg-line" : "h-px w-full bg-line", className)} />;
}
