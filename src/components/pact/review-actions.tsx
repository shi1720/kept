"use client";

import { CheckCircle2, FastForward, Gavel, Repeat2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import { formatMoney } from "@/lib/money";

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, path: string, body: unknown, success: string) => {
    setBusy(key);
    try {
      await api(path, { body });
      toast.success(success);
      router.refresh();
      return true;
    } catch {
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

export function ReviewActions({
  milestoneId,
  amountCents,
  freelancerName,
  revisionsLeft,
  canRevise,
}: {
  milestoneId: string;
  amountCents: number;
  freelancerName: string;
  revisionsLeft: number;
  canRevise: boolean;
}) {
  const { busy, run } = useAction();
  const [revNote, setRevNote] = useState("");
  const [issue, setIssue] = useState("");
  const [openRev, setOpenRev] = useState(false);
  const [openIssue, setOpenIssue] = useState(false);
  const [openApprove, setOpenApprove] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={openApprove} onOpenChange={setOpenApprove}>
        <DialogTrigger asChild>
          <Button variant="jade" size="lg"><CheckCircle2 /> Approve & release {formatMoney(amountCents)}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader title="Release payment?" description={`${formatMoney(amountCents)} will be sent from escrow to ${freelancerName}'s PayPal account via PayPal Payouts. This can't be undone.`} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenApprove(false)}>Not yet</Button>
            <Button variant="jade" loading={busy === "approve"} onClick={async () => (await run("approve", `/api/milestones/${milestoneId}/approve`, {}, "Released! The freelancer is being paid via PayPal.")) && setOpenApprove(false)}>
              Release payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openRev} onOpenChange={setOpenRev}>
        <DialogTrigger asChild>
          <Button variant="outline" size="lg" disabled={!canRevise}><Repeat2 /> Request revision {canRevise ? `(${revisionsLeft} left)` : "(none left)"}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader title="Request a revision" description="Be specific — the freelancer sees this note, and the referee re-checks the next version against the same criteria." />
          <Textarea rows={4} value={revNote} onChange={(e) => setRevNote(e.target.value)} placeholder="e.g. Please attach the SVG and PNG exports of the final logo." />
          <div className="mt-4 flex justify-end">
            <Button loading={busy === "rev"} disabled={revNote.trim().length < 5} onClick={async () => (await run("rev", `/api/milestones/${milestoneId}/revision`, { note: revNote }, "Revision requested.")) && setOpenRev(false)}>
              Send request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openIssue} onOpenChange={setOpenIssue}>
        <DialogTrigger asChild>
          <Button variant="danger" size="lg"><Gavel /> Raise an issue</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader title="Raise an issue" description="Funds stay frozen in escrow. The AI mediator reads the contract, the referee's findings and both sides' statements, then proposes a fair split you can both accept." />
          <Textarea rows={4} value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="What's wrong with the delivery, in terms of the criteria you both signed?" />
          <div className="mt-4 flex justify-end">
            <Button variant="ember" loading={busy === "issue"} disabled={issue.trim().length < 10} onClick={async () => (await run("issue", `/api/milestones/${milestoneId}/dispute`, { reason: issue }, "Mediation opened — the AI mediator has proposed a settlement.")) && setOpenIssue(false)}>
              Open mediation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function FastForwardButton({ milestoneId, hours }: { milestoneId: string; hours: number }) {
  const { busy, run } = useAction();
  return (
    <Button variant="outline" size="sm" className="border-dashed border-ember-100 text-ember-700" loading={busy === "ff"} onClick={() => run("ff", `/api/milestones/${milestoneId}/fast-forward`, {}, `Skipped ahead ${hours}h — the sweeper ran.`)}>
      <FastForward /> Skip ahead {hours}h — the client goes silent
    </Button>
  );
}

export function RefundButton({ milestoneId, amountCents }: { milestoneId: string; amountCents: number }) {
  const { busy, run } = useAction();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"><Undo2 /> Refund client</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title="Refund the client in full?" description={`${formatMoney(amountCents)} goes back to the client's PayPal via a refund on the original payment. Use this if you can't complete the work.`} />
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional: a short note for the client" />
        <div className="mt-4 flex justify-end">
          <Button variant="danger" loading={busy === "refund"} onClick={async () => (await run("refund", `/api/milestones/${milestoneId}/refund`, { reason }, "Refund sent via PayPal.")) && setOpen(false)}>Refund</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
