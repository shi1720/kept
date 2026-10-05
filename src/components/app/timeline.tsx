import { Bot, CircleDollarSign, FileUp, Gavel, Handshake, PenLine, Repeat2, Rocket, Send, Sparkles, Undo2, User, Zap } from "lucide-react";
import type { EventRow } from "@/lib/db/schema";
import { cn } from "@/lib/cn";
import { ago } from "@/lib/time";

const ICONS: Record<string, React.ElementType> = {
  "pact.created": PenLine,
  "pact.edited": PenLine,
  "pact.signed": Send,
  "pact.activated": Handshake,
  "pact.completed": Sparkles,
  "milestone.funded": CircleDollarSign,
  "work.submitted": FileUp,
  "review.completed": Bot,
  "revision.requested": Repeat2,
  "milestone.released": Rocket,
  "milestone.settled": Gavel,
  "milestone.refunded": Undo2,
  "dispute.opened": Gavel,
  "dispute.ruling_proposed": Bot,
  "dispute.accepted": Handshake,
  "dispute.escalated": Gavel,
  "payout.sent": CircleDollarSign,
  "refund.sent": Undo2,
  "demo.fast_forward": Zap,
};

const KIND_STYLE: Record<EventRow["actorKind"], string> = {
  user: "bg-paper-2 text-ink-2",
  ai: "bg-sky-50 text-sky-600",
  system: "bg-ember-50 text-ember-700",
  paypal: "bg-jade-50 text-jade-700",
  agent: "bg-sky-50 text-sky-600",
};

const KIND_LABEL: Record<EventRow["actorKind"], string> = { user: "", ai: "AI", system: "Kept", paypal: "PayPal", agent: "Agent" };

export function Timeline({ events, titles, compact }: { events: EventRow[]; titles?: Record<string, string>; compact?: boolean }) {
  if (!events.length) return <p className="py-6 text-center text-sm text-ink-3">No activity yet.</p>;
  return (
    <ol className="relative flex flex-col">
      {events.map((e, i) => {
        const Icon = ICONS[e.type] ?? User;
        return (
          <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < events.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-line" />}
            <span className={cn("relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-card", KIND_STYLE[e.actorKind])}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={cn("text-[13px] leading-snug text-ink", compact && "line-clamp-2")}>
                {KIND_LABEL[e.actorKind] && <span className="mr-1.5 rounded bg-paper-2 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-ink-3">{KIND_LABEL[e.actorKind]}</span>}
                {e.message}
              </p>
              <p className="mt-0.5 text-xs text-ink-3">
                {titles && e.pactId ? <span>{titles[e.pactId]} · </span> : null}
                {ago(e.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
