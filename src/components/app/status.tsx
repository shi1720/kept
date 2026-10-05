import { CheckCircle2, CircleDashed, Clock3, FileCheck2, Gavel, Hourglass, Lock, RotateCcw, Scale, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MilestoneStatus, PactStatus } from "@/lib/db/schema";
import { MILESTONE_STATUS_LABEL, PACT_STATUS_LABEL } from "@/lib/domain/state";

const MILESTONE_TONE: Record<MilestoneStatus, { tone: "neutral" | "jade" | "amber" | "rose" | "ember" | "sky"; icon: React.ElementType }> = {
  draft: { tone: "neutral", icon: CircleDashed },
  awaiting_funding: { tone: "neutral", icon: Clock3 },
  funded: { tone: "amber", icon: Lock },
  submitted: { tone: "sky", icon: FileCheck2 },
  in_review: { tone: "sky", icon: Hourglass },
  released: { tone: "jade", icon: CheckCircle2 },
  disputed: { tone: "rose", icon: Gavel },
  settled: { tone: "ember", icon: Scale },
  refunded: { tone: "neutral", icon: RotateCcw },
  cancelled: { tone: "neutral", icon: XCircle },
};

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const { tone, icon: Icon } = MILESTONE_TONE[status];
  return (
    <Badge tone={tone}>
      <Icon />
      {MILESTONE_STATUS_LABEL[status]}
    </Badge>
  );
}

export function PactStatusBadge({ status }: { status: PactStatus }) {
  const tone = { draft: "neutral", pending_acceptance: "amber", active: "sky", completed: "jade", cancelled: "neutral" }[status] as
    | "neutral"
    | "amber"
    | "sky"
    | "jade";
  return (
    <Badge tone={tone} dot>
      {PACT_STATUS_LABEL[status]}
    </Badge>
  );
}
