"use client";

import {
  AlertOctagon,
  ArrowLeft,
  Bot,
  Cpu,
  FileSignature,
  History,
  Lightbulb,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type { PactInput } from "@/lib/domain/pacts";
import { formatMoney } from "@/lib/money";
import { Compiling } from "./compiling";
import { SOURCE_SAMPLES } from "./samples";

type Role = "client" | "freelancer";
type MilestoneDraft = PactInput["milestones"][number];
type CriterionDraft = MilestoneDraft["criteria"][number];
type Check = CriterionDraft["check"];

interface AiMeta {
  provider: string;
  model: string;
  degraded: boolean;
  latencyMs: number;
}

const CHECK_LABEL: Record<string, string> = {
  none: "judgment",
  min_words: "min words",
  max_words: "max words",
  min_files: "min files",
  file_types: "file types",
  url_reachable: "link is live",
  page_contains: "page contains",
  repo_has_path: "repo contains",
  keywords_present: "keywords",
  min_image_resolution: "min resolution",
};

function describeCheck(c: Check): string {
  switch (c.type) {
    case "min_words":
    case "max_words":
    case "min_files":
      return `${CHECK_LABEL[c.type]} ${c.value ?? "?"}`;
    case "file_types":
    case "page_contains":
    case "repo_has_path":
    case "keywords_present":
      return `${CHECK_LABEL[c.type]}: ${(c.values ?? []).join(", ")}`;
    case "min_image_resolution":
      return `≥ ${c.width}×${c.height}px`;
    case "url_reachable":
      return CHECK_LABEL[c.type];
    default:
      return "";
  }
}

function emptyMilestone(n: number): MilestoneDraft {
  return {
    title: `Milestone ${n}`,
    description: "",
    amount: 100,
    dueInDays: 7,
    criteria: [{ text: "", kind: "objective", check: { type: "none" } }],
  };
}

function blankPact(role: Role): PactInput {
  return {
    title: "",
    summary: "",
    currency: "USD",
    creatorRole: role,
    counterpartyName: "",
    counterpartyEmail: "",
    sourceText: null,
    terms: { revisionsIncluded: 2, reviewWindowHours: 72, ipTransfer: "Full rights transfer to the client once the final milestone is released.", communication: null },
    clarityScore: null,
    ambiguities: [],
    riskFlags: [],
    milestones: [emptyMilestone(1)],
  };
}

function ClarityGauge({ score }: { score: number }) {
  const tone = score >= 75 ? "text-jade-700" : score >= 45 ? "text-amber-700" : "text-rose-700";
  const bar = score >= 75 ? "bg-jade-600" : score >= 45 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Original brief clarity</p>
          <p className={cn("num mt-0.5 text-[34px] font-semibold leading-none", tone)}>{score}<span className="text-base text-ink-3">/100</span></p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">After Kept</p>
          <p className="num mt-0.5 text-[20px] font-semibold text-jade-700">Checkable</p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-2">
        <div className={cn("h-full rounded-full transition-[width] duration-1000", bar)} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-3">
        {score < 45 ? "Dangerously vague — this is how disputes start." : score < 75 ? "Typical DM: workable, but full of gaps." : "Already fairly precise."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Unsaved-draft storage (this browser only)                            */
/* ------------------------------------------------------------------ */

const DRAFT_KEY = "kept.composer.v1";
interface StoredDraft {
  stage: "source" | "edit";
  role: Role;
  source: string;
  budget: string;
  pact: PactInput;
  ai: AiMeta | null;
  at: number;
}
const noopSubscribe = () => () => {};
function readDraft(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function parseDraft(raw: string): StoredDraft | null {
  try {
    const d = JSON.parse(raw) as StoredDraft;
    return Date.now() - d.at < 7 * 86_400_000 && (d.stage === "edit" || d.source.trim()) ? d : null;
  } catch {
    return null;
  }
}
function writeDraft(key: string, d: StoredDraft) {
  try {
    window.localStorage.setItem(key, JSON.stringify(d));
  } catch {
    /* storage full or blocked: the leave warning still protects the work */
  }
}
function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function Composer({ initial, editId, editingSent, defaultRole }: { initial?: PactInput; editId?: string; editingSent?: boolean; defaultRole: Role }) {
  const router = useRouter();
  const [stage, setStage] = useState<"source" | "compiling" | "edit">(initial ? "edit" : "source");
  const [role, setRole] = useState<Role>(initial?.creatorRole ?? defaultRole);
  const [source, setSource] = useState("");
  const [budget, setBudget] = useState("");
  const [pact, setPact] = useState<PactInput>(initial ?? blankPact(defaultRole));
  const [ai, setAi] = useState<AiMeta | null>(null);
  const [saving, setSaving] = useState<"draft" | "send" | null>(null);
  const [ackRisk, setAckRisk] = useState(false);
  const highRisk = pact.riskFlags.some((r) => r.severity === "high");

  // New pacts survive a reload or an accidental tab close: the work in progress is kept in this
  // browser until it's saved, and offered back when the composer opens again. (Edits of a saved pact
  // always start from the server's copy.)
  const storageKey = editId ? null : DRAFT_KEY;
  const savedDraft = useSyncExternalStore(noopSubscribe, () => (storageKey ? readDraft(storageKey) : null), () => null);
  const [offerHandled, setOfferHandled] = useState(false);
  const hasWork = source.trim().length > 0 || stage === "edit";
  useEffect(() => {
    if (!storageKey || stage === "compiling" || !hasWork) return;
    writeDraft(storageKey, { stage: stage === "edit" ? "edit" : "source", role, source, budget, pact, ai, at: Date.now() });
  }, [storageKey, hasWork, stage, role, source, budget, pact, ai]);
  useEffect(() => {
    if (!storageKey || !hasWork) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [storageKey, hasWork]);
  const restoreDraft = () => {
    const d = savedDraft ? parseDraft(savedDraft) : null;
    setOfferHandled(true);
    if (!d) return;
    setRole(d.role);
    setSource(d.source);
    setBudget(d.budget);
    setPact(d.pact);
    setAi(d.ai);
    setStage(d.stage);
  };
  const discardDraft = () => {
    if (storageKey) clearDraft(storageKey);
    setOfferHandled(true);
  };
  const offerRestore = Boolean(storageKey && savedDraft && !offerHandled && stage === "source" && !source.trim());

  const total = useMemo(() => pact.milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0), [pact.milestones]);
  const counterpartyRole = pact.creatorRole === "client" ? "freelancer" : "client";

  const compile = async () => {
    setStage("compiling");
    try {
      const res = await api<{ draft: PactInput; ai: AiMeta }>("/api/ai/draft", {
        body: { sourceText: source, creatorRole: role, amount: budget ? Number(budget) : undefined },
      });
      setPact({ ...res.draft, counterpartyEmail: res.draft.counterpartyEmail ?? "", counterpartyName: res.draft.counterpartyName ?? "" });
      setAi(res.ai);
      setStage("edit");
      if (res.ai.degraded) toast.warning("The AI provider was unavailable, so a basic offline draft was produced.");
    } catch {
      setStage("source");
    }
  };

  const updateMilestone = (i: number, patch: Partial<MilestoneDraft>) =>
    setPact((p) => ({ ...p, milestones: p.milestones.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));
  const updateCriterion = (mi: number, ci: number, patch: Partial<CriterionDraft>) =>
    updateMilestone(mi, { criteria: pact.milestones[mi].criteria.map((c, j) => (j === ci ? { ...c, ...patch } : c)) });

  const payload = () => ({
    ...pact,
    creatorRole: pact.creatorRole,
    counterpartyEmail: pact.counterpartyEmail?.trim() || null,
    counterpartyName: pact.counterpartyName?.trim() || null,
    milestones: pact.milestones.map((m) => ({
      ...m,
      amount: Number(m.amount),
      dueInDays: m.dueInDays ? Number(m.dueInDays) : null,
      criteria: m.criteria.filter((c) => c.text.trim().length >= 3),
    })),
  });

  const save = async (andSend: boolean) => {
    setSaving(andSend ? "send" : "draft");
    try {
      let id = editId;
      if (editId) await api(`/api/pacts/${editId}`, { method: "PATCH", body: payload() });
      else id = (await api<{ pact: { id: string } }>("/api/pacts", { body: payload() })).pact.id;
      if (andSend) {
        const r = await api<{ inviteUrl: string }>(`/api/pacts/${id}/send`, { body: {} });
        await navigator.clipboard?.writeText(r.inviteUrl).catch(() => {});
        toast.success("Signed & sent — invite link copied to your clipboard.");
      } else toast.success("Draft saved.");
      if (storageKey) clearDraft(storageKey);
      setSource("");
      setStage("compiling"); // leaving the page: don't re-save or warn on the way out
      router.push(`/app/pacts/${id}`);
      router.refresh();
    } catch {
      setSaving(null);
    }
  };

  if (stage === "compiling") return <Compiling />;

  if (stage === "source") {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 animate-fade-up">
        {offerRestore && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-[13.5px] text-sky-600" role="status">
            <History className="size-4 shrink-0" />
            <p className="min-w-0 flex-1 basis-[220px]">You have an unsaved pact from earlier in this browser.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={discardDraft}>
                Discard
              </Button>
              <Button size="sm" onClick={restoreDraft}>
                Restore it
              </Button>
            </div>
          </div>
        )}
        <div>
          <Badge tone="ember"><Sparkles /> Contract compiler</Badge>
          <h1 className="display mt-3 text-[46px]">Where was the deal made?</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-3">
            Paste the DM, email or Discord thread — or just describe the job. Kept’s AI turns it into milestones with acceptance criteria a neutral referee can check, flags vague terms before they become disputes, and warns you about scam patterns.
          </p>
        </div>
        <div className="inline-flex w-fit rounded-full border border-line bg-paper-2 p-1" role="group" aria-label="Your side of the deal">
          {(["client", "freelancer"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={role === r}
              onClick={() => setRole(r)}
              className={cn("rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors", role === r ? "bg-card text-ink shadow-card" : "text-ink-3 hover:text-ink")}
            >
              {r === "client" ? "I’m hiring" : "I’m doing the work"}
            </button>
          ))}
        </div>
        <Card className="overflow-hidden">
          <Textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            rows={11}
            aria-label="The conversation or job description"
            className="rounded-none border-0 px-6 py-5 text-[14.5px] focus:shadow-none max-sm:h-44"
            placeholder={"Rosa: hi!! saw your work on insta…\nKai: thank you! what are you looking for?\nRosa: a logo for my bakery, budget is like $450…"}
          />
          <div className="flex flex-wrap items-center gap-3 border-t border-line bg-paper/60 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-3">Budget (optional)</span>
              <Input value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ""))} placeholder="$" className="h-8 w-24" inputMode="decimal" aria-label="Budget in US dollars (optional)" />
            </div>
            <span className="ml-auto text-xs text-ink-3">{source.trim().length} characters</span>
            <Button variant="jade" size="lg" disabled={source.trim().length < 20} onClick={compile}>
              <Wand2 /> Compile into a pact
            </Button>
          </div>
        </Card>
        <div>
          <p className="mb-2 text-xs font-medium text-ink-3">Or try an example</p>
          <div className="flex flex-wrap gap-2">
            {SOURCE_SAMPLES.map((s) => (
              <button
                key={s.label}
                onClick={() => {
                  setSource(s.text);
                  setRole(s.role);
                }}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                  s.label.startsWith("Suspicious") ? "border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-line bg-card text-ink-2 hover:border-line-2 hover:text-ink",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => {
            setPact(blankPact(role));
            setStage("edit");
          }}
          className="w-fit text-[13px] text-ink-3 underline-offset-4 hover:text-ink hover:underline"
        >
          Skip the AI and write the terms myself →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {!editId && (
            <button onClick={() => setStage("source")} className="mb-2 flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
              <ArrowLeft className="size-3.5" /> Back to source
            </button>
          )}
          <h1 className="display text-[40px]">{editId ? "Edit pact" : "Review your pact"}</h1>
          <p className="text-sm text-ink-3">Everything is editable. Both sides sign exactly what you see here.</p>
          {editingSent && (
            <p className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-700" role="note">
              This pact was already sent. Saving changes withdraws your signature and the invitation until you sign and send it again; the invite link stays the same.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" loading={saving === "draft"} disabled={saving !== null} onClick={() => save(false)}>
            <Save /> Save draft
          </Button>
          <Button
            variant="jade"
            size="lg"
            loading={saving === "send"}
            disabled={saving !== null || (highRisk && !ackRisk)}
            title={highRisk && !ackRisk ? "Review the high-risk flags first" : undefined}
            onClick={() => save(true)}
          >
            <Send /> Sign & send
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Pact title" className="sm:col-span-2">
                <Input value={pact.title} onChange={(e) => setPact({ ...pact, title: e.target.value })} placeholder="Logo design for Pan de Rosa" className="text-[15px] font-medium" />
              </Field>
              <Field label="Summary" className="sm:col-span-2">
                <Textarea autoGrow rows={2} value={pact.summary} onChange={(e) => setPact({ ...pact, summary: e.target.value })} placeholder="What's being delivered, in two sentences." />
              </Field>
              <Field label={`The ${counterpartyRole}'s name`}>
                <Input value={pact.counterpartyName ?? ""} onChange={(e) => setPact({ ...pact, counterpartyName: e.target.value })} placeholder="Optional" />
              </Field>
              <Field label={`The ${counterpartyRole}'s email`} hint="They'll see the invite in Kept if they already have an account.">
                <Input type="email" value={pact.counterpartyEmail ?? ""} onChange={(e) => setPact({ ...pact, counterpartyEmail: e.target.value })} placeholder="Optional" />
              </Field>
            </CardContent>
          </Card>

          {pact.milestones.map((m, mi) => (
            <Card key={mi} className="overflow-hidden">
              <div className="flex flex-wrap items-end gap-3 border-b border-line bg-paper/50 px-6 py-4">
                <span className="mb-2 flex size-7 shrink-0 items-center justify-center rounded-full bg-card text-[13px] font-semibold shadow-card">{mi + 1}</span>
                <Field label="Milestone" className="min-w-[200px] flex-1">
                  <Input value={m.title} onChange={(e) => updateMilestone(mi, { title: e.target.value })} />
                </Field>
                <Field label="Amount (USD)" className="w-32">
                  <Input type="number" min={1} step="0.01" value={m.amount} onChange={(e) => updateMilestone(mi, { amount: Number(e.target.value) })} className="num" />
                </Field>
                <Field label="Due in (days)" className="w-28">
                  <Input type="number" min={1} value={m.dueInDays ?? ""} onChange={(e) => updateMilestone(mi, { dueInDays: e.target.value ? Number(e.target.value) : null })} />
                </Field>
                {pact.milestones.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setPact({ ...pact, milestones: pact.milestones.filter((_, j) => j !== mi) })} aria-label="Remove milestone">
                    <Trash2 />
                  </Button>
                )}
              </div>
              <CardContent className="flex flex-col gap-4">
                <Textarea autoGrow rows={2} value={m.description} onChange={(e) => updateMilestone(mi, { description: e.target.value })} placeholder="What this milestone delivers" />
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">Acceptance criteria</p>
                  <ul className="flex flex-col gap-2">
                    {m.criteria.map((c, ci) => (
                      <li key={ci} className="group rounded-xl border border-line bg-card p-3 focus-within:border-jade-300">
                        <div className="flex gap-2">
                          <span className="mt-2 text-xs text-ink-3">{ci + 1}.</span>
                          <Textarea
                            autoGrow
                            rows={1}
                            aria-label={`Criterion ${ci + 1}`}
                            value={c.text}
                            onChange={(e) => updateCriterion(mi, ci, { text: e.target.value })}
                            className="min-h-0 resize-none border-0 px-1 py-1.5 focus:shadow-none"
                            placeholder="A single, checkable requirement"
                          />
                          <button
                            onClick={() => updateMilestone(mi, { criteria: m.criteria.filter((_, j) => j !== ci) })}
                            className="mt-1 self-start rounded-lg p-1.5 text-ink-3 transition-opacity hover:bg-paper-2 hover:text-rose-600 focus-visible:opacity-100 group-hover:opacity-100 md:opacity-0 md:group-focus-within:opacity-100"
                            aria-label={`Remove criterion ${ci + 1}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-5">
                          <button
                            onClick={() => updateCriterion(mi, ci, { kind: c.kind === "objective" ? "subjective" : "objective" })}
                            className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", c.kind === "objective" ? "border-jade-100 bg-jade-50 text-jade-700" : "border-line bg-paper-2 text-ink-2")}
                            title="Toggle objective / subjective"
                          >
                            {c.kind}
                          </button>
                          {c.check.type !== "none" ? (
                            <span className="flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-600">
                              <Cpu className="size-3" /> auto-check · {describeCheck(c.check)}
                              <button onClick={() => updateCriterion(mi, ci, { check: { type: "none" } })} className="ml-0.5 text-sky-600/60 hover:text-sky-600" aria-label="Remove auto-check">×</button>
                            </span>
                          ) : (
                            <span className="text-[11px] text-ink-3">checked by the AI referee’s judgment</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => updateMilestone(mi, { criteria: [...m.criteria, { text: "", kind: "objective", check: { type: "none" } }] })}>
                    <Plus /> Add criterion
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" className="w-fit" onClick={() => setPact({ ...pact, milestones: [...pact.milestones, emptyMilestone(pact.milestones.length + 1)] })}>
            <Plus /> Add milestone
          </Button>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileSignature className="size-4 text-ink-3" /> Terms</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field label="Revisions included">
                <Input type="number" min={0} max={20} value={pact.terms.revisionsIncluded} onChange={(e) => setPact({ ...pact, terms: { ...pact.terms, revisionsIncluded: Number(e.target.value) } })} />
              </Field>
              <Field label="Review window (hours)" hint="After this, passing work auto-releases.">
                <Input type="number" min={1} max={720} value={pact.terms.reviewWindowHours} onChange={(e) => setPact({ ...pact, terms: { ...pact.terms, reviewWindowHours: Number(e.target.value) } })} />
              </Field>
              <Field label="Ownership / IP" className="sm:col-span-3">
                <Textarea autoGrow rows={1} value={pact.terms.ipTransfer} onChange={(e) => setPact({ ...pact, terms: { ...pact.terms, ipTransfer: e.target.value } })} />
              </Field>
            </CardContent>
          </Card>
        </div>

        <aside className={cn("flex flex-col gap-5 xl:sticky xl:top-24 xl:self-start", highRisk && "order-first xl:order-none")}>
          <Card>
            <CardContent className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Total</p>
              <p className="num text-[32px] font-semibold tracking-tight">{formatMoney(Math.round(total * 100))}</p>
              <p className="text-xs text-ink-3">
                {pact.milestones.length} milestone{pact.milestones.length === 1 ? "" : "s"} · {pact.milestones.reduce((s, m) => s + m.criteria.length, 0)} criteria ·{" "}
                {pact.milestones.reduce((s, m) => s + m.criteria.filter((c) => c.check.type !== "none").length, 0)} auto-checked
              </p>
              <p className="pt-1 text-xs text-ink-3">
                {pact.creatorRole === "client" ? "You fund each milestone with PayPal when it starts." : "The client funds each milestone before you start work."}
              </p>
            </CardContent>
          </Card>

          {pact.clarityScore != null && (
            <Card>
              <CardContent><ClarityGauge score={pact.clarityScore} /></CardContent>
            </Card>
          )}

          {pact.riskFlags.length > 0 && (
            <Card className="order-first border-rose-100 bg-rose-50/40">
              <CardHeader><CardTitle className="flex items-center gap-2 text-rose-700"><AlertOctagon className="size-4" /> {pact.riskFlags.length} risk flag{pact.riskFlags.length === 1 ? "" : "s"}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {pact.riskFlags.map((r, i) => (
                  <div key={i} className="text-[12.5px]">
                    <div className="flex items-center gap-2">
                      <Badge tone={r.severity === "high" ? "rose" : r.severity === "medium" ? "amber" : "neutral"}>{r.severity}</Badge>
                      <span className="font-medium">{r.signal}</span>
                    </div>
                    <p className="mt-1 text-ink-3">{r.explanation}</p>
                  </div>
                ))}
                {highRisk && (
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-rose-100 bg-card p-3 text-[12.5px] font-medium text-rose-700">
                    <input type="checkbox" checked={ackRisk} onChange={(e) => setAckRisk(e.target.checked)} className="mt-0.5 accent-rose-600" />
                    I’ve read these warnings. Keep every payment inside Kept’s PayPal escrow — never Friends & Family, gift cards or “refund the difference”.
                  </label>
                )}
              </CardContent>
            </Card>
          )}

          {pact.ambiguities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb className="size-4 text-amber-600" /> {pact.ambiguities.length} vague term{pact.ambiguities.length === 1 ? "" : "s"} tightened</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {pact.ambiguities.map((a, i) => (
                  <div key={i} className="text-[12.5px] leading-relaxed">
                    <p><span className="rounded bg-rose-50 px-1 text-rose-700 line-through decoration-rose-300">{a.quote}</span></p>
                    <p className="mt-1 text-ink-3">{a.issue}</p>
                    <p className="mt-0.5 font-medium text-jade-700">→ {a.suggestion}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {ai && (
            <p className="flex items-center gap-1.5 px-1 text-[11.5px] text-ink-3">
              <Bot className="size-3.5" /> {ai.provider === "example" ? "Pre-compiled example — add an AI key to compile live" : <>Compiled by {ai.provider === "offline" ? "the offline heuristic" : ai.model} in {(ai.latencyMs / 1000).toFixed(1)}s</>}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
