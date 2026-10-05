"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/** Lets a Field label and describe the control inside it, without every caller wiring ids by hand. */
const FieldContext = React.createContext<{
  id: string;
  describedBy?: string;
  invalid: boolean;
} | null>(null);

function useFieldProps<
  T extends {
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  },
>(props: T): T {
  const field = React.useContext(FieldContext);
  if (!field) return props;
  return {
    ...props,
    id: props.id ?? field.id,
    "aria-describedby": props["aria-describedby"] ?? field.describedBy,
    "aria-invalid": props["aria-invalid"] ?? (field.invalid || undefined),
  };
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...rest }, ref) => {
  const props = useFieldProps(rest);
  const ready = React.useSyncExternalStore(() => () => {}, () => true, () => false);
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-xl border border-line-2 bg-card px-3.5 text-sm text-ink placeholder:text-ink-3 transition-shadow outline-none focus:border-jade-500 focus:shadow-glow disabled:opacity-60",
        className,
      )}
      {...props}
      disabled={!ready || props.disabled}
    />
  );
});
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    /** Grow to fit the text at any width (no hidden lines on phones), instead of a fixed row count. */
    autoGrow?: boolean;
  }
>(({ className, autoGrow, ...rest }, ref) => {
  const props = useFieldProps(rest);
  const ready = React.useSyncExternalStore(() => () => {}, () => true, () => false);
  const inner = React.useRef<HTMLTextAreaElement | null>(null);
  React.useImperativeHandle(ref, () => inner.current!, []);
  React.useLayoutEffect(() => {
    const el = inner.current;
    if (!autoGrow || !el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoGrow, props.value]);
  return (
    <textarea
      ref={inner}
      className={cn(
        "w-full rounded-xl border border-line-2 bg-card px-3.5 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-3 transition-shadow outline-none focus:border-jade-500 focus:shadow-glow disabled:opacity-60",
        autoGrow && "resize-none overflow-hidden",
        className,
      )}
      {...props}
      disabled={!ready || props.disabled}
    />
  );
});
Textarea.displayName = "Textarea";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-[13px] font-medium text-ink-2", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  /** Shown instead of the hint, in red, and announced to screen readers. */
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const id = React.useId();
  const noteId = `${id}-note`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <FieldContext.Provider
        value={{
          id,
          describedBy: error || hint ? noteId : undefined,
          invalid: Boolean(error),
        }}
      >
        {children}
      </FieldContext.Provider>
      {error ? (
        <p
          id={noteId}
          role="alert"
          className="text-xs font-medium text-rose-700"
        >
          {error}
        </p>
      ) : (
        hint && (
          <p id={noteId} className="text-xs text-ink-3">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
