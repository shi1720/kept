"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, wide, topBar, ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { wide?: boolean; topBar?: React.ReactNode }) {
  const pathname=usePathname();
  const workspace=pathname.startsWith("/app")||pathname.startsWith("/admin");
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="kept-dialog-overlay fixed inset-0 z-50 bg-ink/30 backdrop-blur-[3px]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[90dvh] overscroll-contain w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-card p-5 sm:p-6 shadow-lift",
          workspace&&"workspace-dialog",
          "kept-dialog",
          wide ? "max-w-3xl" : "max-w-lg",
          className,
        )}
        {...props}
      >
        {topBar ? <div className="mb-4 flex min-w-0 items-center gap-4"><div className="min-w-0 flex-1">{topBar}</div><DialogPrimitive.Close className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-jade-600"><X className="size-4"/><span className="sr-only">Close</span></DialogPrimitive.Close></div> : <DialogPrimitive.Close className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full text-ink-3 hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-jade-600"><X className="size-4"/><span className="sr-only">Close</span></DialogPrimitive.Close>}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ title, description }: { title: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className="mb-5 pr-10">
      <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">{title}</DialogPrimitive.Title>
      {description ? (
        <DialogPrimitive.Description className="mt-1 text-sm text-ink-3">{description}</DialogPrimitive.Description>
      ) : (
        <DialogPrimitive.Description className="sr-only">{String(title)}</DialogPrimitive.Description>
      )}
    </div>
  );
}
