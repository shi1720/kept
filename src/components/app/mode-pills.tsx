import { Bot, ShieldCheck } from "lucide-react";
import { aiStatus } from "@/lib/ai/provider";
import { cn } from "@/lib/cn";
import { getPayPal } from "@/lib/paypal";
import { Tooltip } from "@/components/ui/tooltip";

/** Honest environment indicators: which PayPal and which AI is actually wired up. */
export function ModePills({ className }: { className?: string }) {
  const pp = getPayPal().mode;
  const ai = aiStatus();
  return (
    <div className={cn("flex flex-col gap-1.5 text-[11.5px]", className)}>
      <Tooltip content={pp === "simulator" ? "No PayPal credentials configured: payments run on Kept's built-in PayPal simulator." : `Payments run against the PayPal ${pp} REST APIs.`}>
        <span className="flex items-center gap-1.5 text-ink-3">
          <ShieldCheck className={cn("size-3.5", pp === "simulator" ? "text-amber-600" : "text-jade-600")} />
          PayPal {pp === "simulator" ? "simulator" : pp}
        </span>
      </Tooltip>
      <Tooltip content={ai.mode === "offline" ? "No AI key configured: the referee uses deterministic checks only." : `AI referee powered by ${ai.model}.`}>
        <span className="flex items-center gap-1.5 text-ink-3">
          <Bot className={cn("size-3.5", ai.mode === "offline" ? "text-amber-600" : "text-jade-600")} />
          {ai.mode === "offline" ? "AI offline mode" : ai.model}
        </span>
      </Tooltip>
    </div>
  );
}
