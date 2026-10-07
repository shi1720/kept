import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "kept-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper hover:bg-ink/90 shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_1px_2px_rgba(0,0,0,0.2)]",
        jade: "bg-jade-600 text-white hover:bg-jade-700 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_1px_2px_rgba(0,0,0,0.15)]",
        ember: "bg-ember-600 text-white hover:bg-ember-700",
        outline: "border border-line-2 bg-card text-ink hover:bg-paper-2",
        ghost: "text-ink-2 hover:bg-paper-2 hover:text-ink",
        danger: "border border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100",
        link: "text-jade-700 underline-offset-4 hover:underline rounded-none px-0",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} data-variant={variant??"primary"} aria-busy={loading||undefined} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
