import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-line bg-paper-2 text-ink-2",
        jade: "border-jade-100 bg-jade-50 text-jade-700",
        amber: "border-amber-100 bg-amber-50 text-amber-700",
        rose: "border-rose-100 bg-rose-50 text-rose-700",
        ember: "border-ember-100 bg-ember-50 text-ember-700",
        sky: "border-sky-100 bg-sky-50 text-sky-600",
        ink: "border-ink bg-ink text-paper",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}
