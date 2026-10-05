import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Composer } from "@/components/composer/composer";
import { requirePageUser } from "@/lib/auth/session";
import { getPactDetail } from "@/lib/domain/queries";
import { editableDraft } from "@/lib/domain/pacts";

export const metadata: Metadata = { title: "New pact" };

export default async function NewPactPage({ searchParams }: { searchParams: Promise<{ edit?: string; role?: string }> }) {
  const user = await requirePageUser();
  const { edit, role } = await searchParams;

  if (edit) {
    const detail = await getPactDetail(user, edit).catch(() => null);
    if (!detail || !detail.isCreator || !["draft", "pending_acceptance"].includes(detail.pact.status)) notFound();
    const { pact, milestones } = detail;
    const initial = editableDraft(pact, milestones);
    return <Composer initial={initial} editId={edit} editingSent={pact.status === "pending_acceptance"} defaultRole={pact.creatorRole} />;
  }

  const defaultRole = role === "freelancer" || role === "client" ? role : user.name.startsWith("Ana") ? "freelancer" : "client";
  return <Composer defaultRole={defaultRole} />;
}
