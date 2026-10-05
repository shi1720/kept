"use client";

import { Bot, Check, Gavel, Scale, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { Dispute } from "@/lib/db/schema";
import { formatMoney, splitByPct } from "@/lib/money";

export function DisputePanel({
  dispute,
  amountCents,
  role,
  clientName,
  freelancerName,
}: {
  dispute: Dispute;
  amountCents: number;
  role: "client" | "freelancer" | null;
  clientName: string;
  freelancerName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const mine = role === "client" ? dispute.clientStatement : role === "freelancer" ? dispute.freelancerStatement : null;
  const [statement, setStatement] = useState(mine ?? "");
  const ruling = dispute.ruling;
  const pct = ruling?.releasePct ?? 0;
  const [toFreelancer, toClient] = splitByPct(amountCents, pct);
  const myAccepted = role === "client" ? dispute.clientAcceptedAt : role === "freelancer" ? dispute.freelancerAcceptedAt : null;
  const otherAccepted = role === "client" ? dispute.freelancerAcceptedAt : dispute.clientAcceptedAt;

  const act = async (key: string, path: string, body: unknown, msg: string) => {
    setBusy(key);
    try {
      await api(path, { body });
      toast.success(msg);
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-rose-100 bg-card">
      <div className="flex items-center gap-2.5 border-b border-rose-100 bg-rose-50/70 px-5 py-3">
        <Gavel className="size-4 text-rose-600" />
        <span className="text-[13.5px] font-semibold text-rose-700">In mediation · {formatMoney(amountCents)} frozen in escrow</span>
        {dispute.status === "escalated" && <Badge tone="rose" className="ml-auto">Escalated to a human arbitrator</Badge>}
      </div>

      <div className="grid gap-px bg-line sm:grid-cols-2">
        {[
          { who: clientName, role: "Client", text: dispute.clientStatement },
          { who: freelancerName, role: "Freelancer", text: dispute.freelancerStatement },
        ].map((s) => (
          <div key={s.role} className="bg-card p-5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-ink-3"><UserRound className="size-3.5" /> {s.who} · {s.role}</p>
            <p className={cn("mt-2 text-[13px] leading-relaxed", s.text ? "text-ink-2" : "italic text-ink-3")}>{s.text ? `“${s.text}”` : "No statement yet."}</p>
          </div>
        ))}
      </div>

      {ruling && (
        <div className="border-t border-line p-5">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-sky-600" />
            <span className="text-[13.5px] font-semibold">AI mediator’s proposal</span>
            <span className="text-[11px] text-ink-3">{ruling.provider === "kept-demo-seed" ? "seeded example — add a statement to run the live mediator" : ruling.model}</span>
          </div>
          <div className="mt-4">
            <div className="flex h-11 overflow-hidden rounded-xl text-[13px] font-medium">
              <div className="flex items-center justify-center bg-jade-600 text-white transition-all" style={{ width: `${Math.max(pct, 8)}%` }}>{pct}%</div>
              <div className="flex flex-1 items-center justify-center bg-ember-100 text-ember-700">{100 - pct}%</div>
            </div>
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-jade-700"><b className="num">{formatMoney(toFreelancer)}</b> paid to {freelancerName} · PayPal Payout</span>
              <span className="text-ember-700"><b className="num">{formatMoney(toClient)}</b> refunded to {clientName} · PayPal refund</span>
            </div>
          </div>
          <p className="mt-4 text-[13.5px] leading-relaxed text-ink-2">{ruling.rationale}</p>
          {ruling.findings.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {ruling.findings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px]">
                  <Badge tone={f.favors === "client" ? "ember" : f.favors === "freelancer" ? "jade" : "neutral"} className="mt-0.5 shrink-0 py-0 text-[10.5px]">
                    {f.favors === "neutral" ? "neutral" : `favours ${f.favors}`}
                  </Badge>
                  <span className="text-ink-2">{f.point}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-[13px] italic leading-relaxed text-ink-2">{ruling.messageToParties}</p>

          {dispute.status === "ruling_proposed" && role && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {myAccepted ? (
                <Badge tone="jade"><Check /> You accepted · waiting for the other party</Badge>
              ) : (
                <>
                  <Button variant="jade" size="lg" loading={busy === "accept"} onClick={() => act("accept", `/api/disputes/${dispute.id}/respond`, { accept: true }, otherAccepted ? "Settled! PayPal is moving the money now." : "Accepted — waiting for the other party.")}>
                    <Scale /> Accept {pct}/{100 - pct} split
                  </Button>
                  <Button variant="outline" size="lg" loading={busy === "reject"} onClick={() => act("reject", `/api/disputes/${dispute.id}/respond`, { accept: false }, "Escalated to a human arbitrator.")}>
                    Reject & escalate
                  </Button>
                </>
              )}
              {otherAccepted && !myAccepted && <span className="text-xs text-jade-700">The other party already accepted — your acceptance settles it instantly.</span>}
            </div>
          )}
        </div>
      )}

      {role && dispute.status !== "resolved" && (
        <div className="border-t border-line bg-paper/50 p-5">
          <p className="text-[13px] font-medium">{mine ? "Update your side of the story" : "Add your side of the story"}</p>
          <p className="mb-2 text-xs text-ink-3">The mediator re-evaluates the proposal whenever either party adds context.</p>
          <Textarea rows={3} value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="Stick to facts about the agreed criteria." />
          <div className="mt-2 flex justify-end">
            <Button size="sm" loading={busy === "stmt"} disabled={statement.trim().length < 10} onClick={() => act("stmt", `/api/disputes/${dispute.id}/statement`, { statement }, "Statement added — the mediator updated its proposal.")}>
              Submit statement
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
