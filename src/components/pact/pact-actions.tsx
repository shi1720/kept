"use client";

import { Check, Copy, PenLine, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
      <Button
        variant="outline"
        size="lg"
        loading={busy === "decline"}
        onClick={async () => {
          setBusy("decline");
          try {
            await api(`/api/invites/${token}/decline`, { body: {} });
            toast("We let them know you'd like changes.");
            router.push("/app");
          } finally {
            setBusy(null);
          }
        }}
      >
        Ask for changes
      </Button>
    </div>
  );
}
