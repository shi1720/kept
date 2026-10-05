import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Composer } from "@/components/composer/composer";
import { requireUser } from "@/lib/auth/session";
import { getPactDetail } from "@/lib/domain/queries";
import type { PactInput } from "@/lib/domain/pacts";

export const metadata: Metadata = { title: "New pact" };

export default async function NewPactPage({ searchParams }: { searchParams: Promise<{ edit?: string; role?: string }> }) {
  const user = await requireUser();
  const { edit, role } = await searchParams;

  if (edit) {
    const detail = await getPactDetail(user, edit).catch(() => null);
    if (!detail || !detail.isCreator || !["draft", "pending_acceptance"].includes(detail.pact.status)) notFound();
    const { pact, milestones } = detail;
    const initial: PactInput = {
      title: pact.title,
      summary: pact.summary,
      currency: pact.currency,
      creatorRole: pact.creatorRole,
      counterpartyName: pact.counterpartyName ?? "",
      counterpartyEmail: pact.counterpartyEmail ?? "",
      sourceText: pact.sourceText,
      terms: { ...pact.terms, communication: pact.terms.communication ?? null },
      clarityScore: pact.clarityScore,
      ambiguities: pact.ambiguities,
      riskFlags: pact.riskFlags,
      milestones: milestones.map((m) => ({
        title: m.title,
        description: m.description,
        amount: m.amountCents / 100,
        dueInDays: m.dueAt ? Math.max(1, Math.round((m.dueAt.getTime() - pact.createdAt.getTime()) / 86_400_000)) : null,
        criteria: m.criteria.map((c) => ({ text: c.text, kind: c.kind, check: c.check })),
      })),
    };
    return <Composer initial={initial} editId={edit} defaultRole={pact.creatorRole} />;
  }

  const defaultRole = role === "freelancer" || role === "client" ? role : user.name.startsWith("Ana") ? "freelancer" : "client";
  return <Composer defaultRole={defaultRole} />;
}
