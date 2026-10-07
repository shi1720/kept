"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";
import { cn } from "@/lib/cn";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex max-w-full flex-wrap items-center gap-1 rounded-2xl sm:rounded-full border border-line bg-paper-2 p-1", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium text-ink-3 transition-colors hover:text-ink data-[state=active]:bg-card data-[state=active]:text-ink data-[state=active]:shadow-card [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
