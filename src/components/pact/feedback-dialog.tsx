"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat2, ArrowRight, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import type { FeedbackAssessment } from "@/lib/ai/feedback";
export function FeedbackDialog({
  milestoneId,
  criteria,
  revisionsLeft,
}: {
  milestoneId: string;
  criteria: { id: string; text: string }[];
  revisionsLeft: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [note, setNote] = useState(""),
    [result, setResult] = useState<FeedbackAssessment | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [answers, setAnswers] = useState<string[]>([]),
    [finalNote, setFinalNote] = useState(""),
    [request, setRequest] = useState("");
  const [manual, setManual] = useState(false),
    [criterionId, setCriterion] = useState(criteria[0]?.id ?? ""),
    [location, setLocation] = useState(""),
    [change, setChange] = useState(""),
    [done, setDone] = useState("");
  const storageKey = `kept:feedback:${milestoneId}`;
  function restore() {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw);
        setNote(s.note ?? "");
        setManual(s.manual ?? false);
        setCriterion(s.criterionId ?? criteria[0]?.id ?? "");
        setLocation(s.location ?? "");
        setChange(s.change ?? "");
        setDone(s.done ?? "");
        setAnswers(s.answers ?? []);
        setResult(s.result ?? null);
        setFinalNote(s.finalNote ?? "");
        setRequest(s.request ?? "");
      }
    } catch {}
  }
  useEffect(() => {
    if (open)
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            note,
            manual,
            criterionId,
            location,
            change,
            done,
            answers,
            result,
            finalNote,
            request,
          }),
        );
      } catch {}
  }, [
    open,
    storageKey,
    note,
    manual,
    criterionId,
    location,
    change,
    done,
    answers,
    result,
    finalNote,
    request,
  ]);
  function edit(v: string) {
    setNote(v);
    setResult(null);
    setAnswers([]);
    setRequest("");
    setError("");
  }
  async function check() {
    setBusy(true);
    setError("");
    const clarified = !manual && result?.status === "clarify" ? request : note;
    try {
      const r = await api<FeedbackAssessment>(
        `/api/milestones/${milestoneId}/feedback`,
        {
          body: {
            note: clarified || "Client correction",
            manual,
            criterionId,
            location,
            change,
            done,
          },
          quiet: true,
        },
      );
      setFinalNote(r.finalNote ?? clarified);
      setResult(r);
      if (r.status !== "in_scope") {
        if (request) {
          setNote(clarified);
          setRequest("");
        }
        setAnswers([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check feedback.");
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (!result?.token) return;
    setBusy(true);
    try {
      await api(`/api/milestones/${milestoneId}/revision`, {
        body: { note: finalNote, feedbackToken: result.token },
      });
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
      setOpen(false);
      setNote("");
      setResult(null);
      toast.success("Clear revision request sent.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          if (v) restore();
          setOpen(v);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" disabled={revisionsLeft <= 0}>
          <Repeat2 />
          Request revision ({Math.max(0, revisionsLeft)} left)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88dvh] overflow-y-auto">
        <DialogHeader
          title={
            result?.status === "in_scope"
              ? "Confirm the request"
              : "What needs to change?"
          }
          description="Your words go to the freelancer only after you confirm. The signed scope, price and deadline stay unchanged."
        />
        {result?.status === "in_scope" ? (
          <>
            <div className="rounded-xl border border-line bg-paper p-4">
              <p className="mb-2 text-xs font-semibold text-ink-3">
                THE FREELANCER WILL RECEIVE
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {finalNote}
              </p>
            </div>
            <p className="mt-3 text-xs text-ink-3">
              {result.manual
                ? "Client-confirmed scope. No AI assessment was used."
                : "Checked against the signed brief."}{" "}
              Sending uses one included revision.
            </p>
            <div className="mt-4 flex justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  setNote(finalNote);
                  setResult(null);
                }}
              >
                Edit request
              </Button>
              <Button variant="jade" loading={busy} onClick={send}>
                <Check />
                Confirm & send
              </Button>
            </div>
          </>
        ) : (
          <>
            {!manual && (
              <label className="block text-sm font-medium">
                Your feedback
                <Textarea
                  className="mt-2"
                  value={note}
                  onChange={(e) => edit(e.target.value)}
                  placeholder="For example: make the hero section warmer"
                  rows={3}
                  maxLength={1400}
                />
              </label>
            )}
            {result && (
              <div
                className="mt-4 rounded-xl border border-line bg-paper p-4"
                role="status"
              >
                <p className="text-sm font-medium">
                  {result.status === "scope_change"
                    ? "Agree on scope first"
                    : "A little more detail"}
                </p>
                <p className="mt-1 text-sm text-ink-2">{result.reason}</p>
                {result.status === "scope_change" && (
                  <>
                    <p className="mt-2 text-xs text-ink-3">
                      Nothing has been sent or charged. Discuss the extra work
                      and create a separately priced pact before work starts.
                    </p>
                    <Link
                      href="/app/pacts/new"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-jade-700"
                    >
                      Draft a separate agreement
                      <ArrowRight className="size-4" />
                    </Link>
                  </>
                )}
              </div>
            )}
            {!manual && result?.status === "clarify" && (
              <p className="mt-3 text-xs text-ink-3">
                These questions help you decide. Write one clear request below
                in your own words. Only that final request will be shared.
              </p>
            )}
            {!manual && result?.status === "clarify" && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-2">
                {result.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            )}
            {!manual && result?.status === "clarify" && (
              <label className="mt-4 block text-sm font-medium">
                Final request for the freelancer
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  placeholder="Specify the file, the change and how you will check it."
                  maxLength={2000}
                />
              </label>
            )}
            {manual && (
              <div className="mt-4 space-y-3">
                <label className="block text-sm">
                  Signed criterion
                  <select
                    aria-label="Signed criterion"
                    className="mt-1 w-full rounded-lg border border-line bg-card p-2 text-sm"
                    value={criterionId}
                    onChange={(e) => setCriterion(e.target.value)}
                  >
                    {criteria.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.text}
                      </option>
                    ))}
                  </select>
                </label>
                {[
                  ["Where is the issue?", location, setLocation],
                  ["What exact change is needed?", change, setChange],
                  ["How will you check it is done?", done, setDone],
                ].map(([label, value, set]) => (
                  <label key={label as string} className="block text-sm">
                    {label as string}
                    <Textarea
                      rows={2}
                      value={value as string}
                      onChange={(e) =>
                        (set as (s: string) => void)(e.target.value)
                      }
                      maxLength={300}
                    />
                  </label>
                ))}
                <p className="text-xs text-ink-3">
                  By confirming, you state this corrects the selected criterion
                  without adding work or changing time or payment.
                </p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                className="text-xs text-ink-3 underline"
                disabled={busy}
                onClick={() => {
                  setManual((v) => !v);
                  setResult(null);
                }}
              >
                {manual ? "Use AI scope check" : "Clarify manually instead"}
              </button>
              <Button
                loading={busy}
                disabled={
                  (!manual && note.trim().length < 5) ||
                  (manual &&
                    [location, change, done].some(
                      (s) => s.trim().length < 10,
                    )) ||
                  (!manual &&
                    result?.status === "clarify" &&
                    request.trim().length < 15) ||
                  result?.status === "scope_change"
                }
                onClick={check}
              >
                {busy
                  ? "Checking your request…"
                  : manual
                    ? "Preview request"
                    : "Check request"}
                <ArrowRight />
              </Button>
            </div>
          </>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-rose-700">
            <AlertTriangle className="mr-1 inline size-4" />
            {error}{" "}
            <a href="/app/settings" className="underline">
              AI settings
            </a>
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
