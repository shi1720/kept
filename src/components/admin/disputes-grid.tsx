"use client";

import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Check, Gavel, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { DisputeRow } from "@/lib/domain/ops";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { formatMoney, splitByPct } from "@/lib/money";
import { DISPUTE_STATUS, DisputeStatusCell } from "./decisions-grid";
import { byId, centered, FilterChips, OpsGrid, pactColumn } from "./grid-kit";

type Ctx = { onArbitrate: (d: DisputeRow) => void };

function ProposalCell(p: ICellRendererParams<DisputeRow>) {
  if (!p.data) return null;
  const v = p.data.proposedPct;
  if (v == null) return <span className="text-[12px] text-ink-3">Mediating…</span>;
  return (
    <div className="flex h-full items-center gap-2" title={`${v}% to freelancer · ${100 - v}% back to client`}>
      <div className="flex h-1.5 w-14 overflow-hidden rounded-full bg-sky-100">
        <div className="h-full bg-jade-500" style={{ width: `${v}%` }} />
      </div>
      <span className="num text-[12.5px] font-medium">{v}%</span>
    </div>
  );
}

function AcceptPill({ ok, who }: { ok: boolean; who: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-4", ok ? "bg-jade-50 text-jade-700" : "bg-paper-2 text-ink-3")}>
      {ok && <Check className="size-3" />}
      {who}
    </span>
  );
}

function AcceptanceCell(p: ICellRendererParams<DisputeRow>) {
  if (!p.data) return null;
  return (
    <div className="flex h-full items-center gap-1">
      <AcceptPill ok={p.data.clientAccepted} who="Client" />
      <AcceptPill ok={p.data.freelancerAccepted} who="Freelancer" />
    </div>
  );
}

/** Reason wraps onto two lines (full text in the tooltip and the Arbitrate dialog). */
function ReasonCell(p: ICellRendererParams<DisputeRow>) {
  if (!p.data) return null;
  return (
    <div className="flex h-full items-center">
      <span className="line-clamp-2 whitespace-normal text-[12.5px] leading-[1.35] text-ink-2">{p.data.reason}</span>
    </div>
  );
}

/** `value` is the dispute's age in ms (computed by the column's valueGetter). */
function AgeCell(p: ICellRendererParams<DisputeRow, number>) {
  if (!p.data || p.value == null) return null;
  const h = Math.max(0, Math.round(p.value / 3_600_000));
  const label = h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
  return <span className={cn("num", !p.data.resolvedAt && h > 72 ? "font-medium text-rose-700" : "text-ink-2")}>{label}</span>;
}

function ActionCell(p: ICellRendererParams<DisputeRow, unknown, Ctx>) {
  if (!p.data) return null;
  if (p.data.status === "resolved") {
    return centered(<span className="text-[12px] text-ink-3">Settled at {p.data.finalPct ?? "—"}%</span>);
  }
  const d = p.data;
  return centered(
    <Button size="sm" variant={d.status === "escalated" ? "ember" : "outline"} className="h-7 px-2.5 text-[12px]" onClick={() => p.context.onArbitrate(d)}>
      <Gavel className="size-3.5!" /> Arbitrate
    </Button>,
  );
}

const ROW_RULES = { "bg-ember-50/70!": (p: { data?: DisputeRow }) => p.data?.status === "escalated" };

export function DisputesQueue({ rows }: { rows: DisputeRow[] }) {
  const [view, setView] = useState<"queue" | "all">("queue");
  const [target, setTarget] = useState<DisputeRow | null>(null);
  const queue = rows.filter((r) => r.status !== "resolved").length;

  const columns = useMemo<ColDef<DisputeRow>[]>(
    () => [
      pactColumn<DisputeRow>(),
      {
        field: "status",
        headerName: "Status",
        cellRenderer: DisputeStatusCell,
        width: 180,
        enableCellChangeFlash: true,
        filterValueGetter: (p) => (p.data ? DISPUTE_STATUS[p.data.status].label : ""),
      },
      { field: "proposedPct", headerName: "AI proposal", cellRenderer: ProposalCell, width: 130, filter: "agNumberColumnFilter", enableCellChangeFlash: true },
      {
        colId: "acceptance",
        headerName: "Accepted by",
        valueGetter: (p) => (p.data ? [p.data.clientAccepted && "client", p.data.freelancerAccepted && "freelancer"].filter(Boolean).join(" + ") || "nobody" : null),
        cellRenderer: AcceptanceCell,
        width: 170,
        sortable: false,
        filter: false,
        enableCellChangeFlash: true,
        context: { noExport: true },
      },
      { field: "amountCents", headerName: "In escrow", type: "money", width: 120 },
      { field: "reason", headerName: "Reason", flex: 1, minWidth: 240, cellRenderer: ReasonCell, tooltip: (p) => p.value ?? undefined, cellClass: "py-0!" },
      { field: "createdAt", headerName: "Opened", type: "timestamp", sort: "desc" },
      { colId: "age", headerName: "Age", width: 80, valueGetter: (p) => (p.data ? (p.data.resolvedAt ?? Date.now()) - p.data.createdAt : null), cellRenderer: AgeCell, filter: false },
      { field: "openedBy", headerName: "Raised by", width: 140, cellClass: "text-ink-2", valueFormatter: (p) => p.value ?? "—" },
      { colId: "action", headerName: "", cellRenderer: ActionCell, width: 130, pinned: "right", sortable: false, filter: false, resizable: false, context: { noExport: true }, suppressSizeToFit: true },
    ],
    [],
  );

  const context = useMemo<Ctx>(() => ({ onArbitrate: setTarget }), []);

  return (
    <>
      <OpsGrid<DisputeRow>
        id="disputes"
        rows={rows}
        columns={columns}
        getRowId={byId}
        noun={["dispute", "disputes"]}
        context={context}
        externalFilter={view === "queue" ? (r) => r.status !== "resolved" : null}
        externalFilterKey={view}
        toolbar={
          <FilterChips
            chips={[
              { key: "queue", label: "Needs a decision", count: queue },
              { key: "all", label: "All disputes", count: rows.length },
            ]}
            value={view}
            onChange={setView}
          />
        }
        rowClassRules={ROW_RULES}
        searchPlaceholder="Search disputes…"
        emptyText={view === "queue" ? "The queue is clear — no disputes waiting on a decision." : "No disputes have been raised."}
        height={420}
      />
      <ArbitrateDialog dispute={target} onClose={() => setTarget(null)} />
    </>
  );
}

function ArbitrateDialog({ dispute, onClose }: { dispute: DisputeRow | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(dispute)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{dispute && <ArbitrateForm key={dispute.id} dispute={dispute} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

function ArbitrateForm({ dispute, onDone }: { dispute: DisputeRow; onDone: () => void }) {
  const router = useRouter();
  const [pct, setPct] = useState(dispute.proposedPct ?? 50);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [toFreelancer, toClient] = splitByPct(dispute.amountCents, pct);
  const presets = [
    { label: "Full refund", v: 0 },
    { label: "Even split", v: 50 },
    ...(dispute.proposedPct != null ? [{ label: `AI proposal · ${dispute.proposedPct}%`, v: dispute.proposedPct }] : []),
    { label: "Release all", v: 100 },
  ];

  const submit = () =>
    start(async () => {
      try {
        await api(`/api/disputes/${dispute.id}/arbitrate`, { body: { releasePct: pct, note } });
        toast.success(`Ruling recorded: ${pct}% released to the freelancer`);
        onDone();
        router.refresh();
      } catch {
        /* api() already showed a toast */
      }
    });

  return (
    <>
      <DialogHeader title="Arbitrate dispute" description={`${dispute.pactTitle} — ${dispute.milestoneTitle}`} />
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-line bg-paper/60 p-4 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-ink-3">Held in escrow</span>
            <span className="num font-semibold">{formatMoney(dispute.amountCents, dispute.currency)}</span>
          </div>
          <p className="mt-2 leading-relaxed text-ink-2">
            <span className="font-medium text-ink">{dispute.openedBy ?? "A party"}:</span> “{dispute.reason}”
          </p>
          {(dispute.clientStatement || dispute.freelancerStatement) && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                { who: `${dispute.client ?? "Client"} (client)`, text: dispute.clientStatement },
                { who: `${dispute.freelancer ?? "Freelancer"} (freelancer)`, text: dispute.freelancerStatement },
              ]
                // The opener's first statement is the reason quoted above; don't show it twice.
                .map((s) => (s.text?.trim() === dispute.reason.trim() ? { ...s, text: null, same: true } : { ...s, same: false }))
                .map((s) => (
                <div key={s.who} className="rounded-lg border border-line bg-card px-3 py-2">
                  <p className="text-[11.5px] font-medium uppercase tracking-wide text-ink-3">{s.who}</p>
                  <p className="mt-1 whitespace-pre-line leading-relaxed text-ink-2">
                    {s.text ? `“${s.text}”` : <span className="italic text-ink-3">{s.same ? "Same as the reason above" : "No statement yet"}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
          {dispute.rationale && (
            <p className="mt-3 flex gap-1.5 leading-relaxed text-ink-3">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-jade-600" />
              <span>
                AI mediator proposed <b className="text-ink-2">{dispute.proposedPct}%</b>: {dispute.rationale}
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <label htmlFor="release-pct" className="text-[13px] font-medium text-ink-2">
              Release to the freelancer
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                max={100}
                value={pct}
                onChange={(e) => setPct(Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))))}
                className="num h-8 w-[72px] text-right"
                aria-label="Release percentage"
              />
              <span className="text-sm text-ink-3">%</span>
            </div>
          </div>
          <input id="release-pct" type="range" min={0} max={100} step={1} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="w-full accent-jade-600" />
          <div className="grid grid-cols-2 gap-2 text-[12.5px]">
            <div className="rounded-xl border border-jade-100 bg-jade-50 px-3 py-2">
              <div className="text-jade-700">Payout to freelancer</div>
              <div className="num text-[15px] font-semibold text-jade-900">{formatMoney(toFreelancer, dispute.currency)}</div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
              <div className="text-sky-600">Refund to client</div>
              <div className="num text-[15px] font-semibold text-ink">{formatMoney(toClient, dispute.currency)}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => setPct(p.v)}
                className={cn("rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors", pct === p.v ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:bg-paper-2")}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Note to both parties" hint="Recorded on the pact timeline with your decision.">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="e.g. Concepts 1 and 2 meet the brief; the third is missing its rationale." />
        </Field>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <Badge tone="amber">Moves money via PayPal</Badge>
          <Button variant="jade" onClick={submit} loading={pending}>
            <Gavel /> Settle at {pct}%
          </Button>
        </div>
      </div>
    </>
  );
}
