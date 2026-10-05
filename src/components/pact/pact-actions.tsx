"use client";

import { Check, Copy, PenLine, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { api } from "@/lib/client-api";

export function SendPactButton({ pactId }: { pactId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="jade"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await api<{ inviteUrl: string }>(`/api/pacts/${pactId}/send`, { body: {} });
          await navigator.clipboard?.writeText(r.inviteUrl).catch(() => {});
          toast.success("Signed & sent. Invite link copied to your clipboard.");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      <Send /> Sign & send for countersignature
    </Button>
  );
}

export function CopyInvite({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-card py-1 pl-4 pr-1">
      <span className="truncate font-mono text-xs text-ink-2">{url}</span>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export function EditPactLink({ pactId }: { pactId: string }) {
  return (
    <Button asChild variant="outline">
      <Link href={`/app/pacts/new?edit=${pactId}`}><PenLine /> Edit terms</Link>
    </Button>
  );
}

export function CancelPactButton({ pactId }: { pactId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={busy}
      onClick={async () => {
        if (!confirm("Cancel this pact? Nothing has been funded, so no money moves.")) return;
        setBusy(true);
        try {
          await api(`/api/pacts/${pactId}/cancel`, { body: {} });
          toast.success("Pact cancelled.");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      <Trash2 /> Cancel pact
    </Button>
  );
}

export function CountersignButton({ token, role }: { token: string; role: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [asking, setAsking] = useState(false);
  const [changes, setChanges] = useState("");
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="jade"
        size="lg"
        loading={busy === "accept"}
        onClick={async () => {
          setBusy("accept");
          try {
            const r = await api<{ pact: { id: string } }>(`/api/invites/${token}/accept`, { body: {} });
            toast.success("Countersigned. The pact is sealed.");
            router.push(`/app/pacts/${r.pact.id}`);
            router.refresh();
          } finally {
            setBusy(null);
          }
        }}
      >
        <PenLine /> Countersign as {role}
      </Button>
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogTrigger asChild>
          <Button variant="outline" size="lg">
            Ask for changes
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader title="Ask for changes" description="The pact goes back to its author as a draft. Nothing is signed or charged." />
          <Field label="What should change?" hint="Optional, but it helps: e.g. “Make milestone 2 due in 14 days, and include the source files.”">
            <Textarea rows={4} maxLength={1000} value={changes} onChange={(e) => setChanges(e.target.value)} autoFocus />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAsking(false)}>
              Cancel
            </Button>
            <Button
              loading={busy === "decline"}
              onClick={async () => {
                setBusy("decline");
                try {
                  await api(`/api/invites/${token}/decline`, { body: { message: changes.trim() || null } });
                  toast("Sent. They'll see your note and can send you a revised pact.");
                  router.push("/app");
                } finally {
                  setBusy(null);
                }
              }}
            >
              Send request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
