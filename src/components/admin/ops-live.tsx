"use client";

import { Pause, Play } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { OpsConsole } from "@/lib/domain/ops";
import { cn } from "@/lib/cn";
import { BooksBadge, KpiHeader } from "./kpis";

/**
 * Live ops data. The server renders the first snapshot; after that the console
 * polls /api/ops and merges each response into the previous one with structural
 * sharing; unchanged rows keep their object identity, so AG Grid (keyed by
 * `getRowId`) only touches the rows that really changed and flashes those cells.
 */

const POLL_MS = 5_000;

type Status = "live" | "paused" | "reconnecting" | "offline";

interface LiveValue {
  data: OpsConsole;
  status: Status;
  syncedAt: number;
  changedAt: number | null;
  paused: boolean;
  setPaused: (p: boolean) => void;
  refresh: () => void;
}

const LiveContext = createContext<LiveValue | null>(null);

export function useOpsLive(): LiveValue {
  const v = useContext(LiveContext);
  if (!v) throw new Error("useOpsLive must be used inside <OpsLiveProvider>");
  return v;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Reuse previous row objects whose content didn't change; reuse the whole array when nothing did. */
function shareRows<R>(prev: R[], next: R[], key: (r: R) => string): R[] {
  const old = new Map(prev.map((r) => [key(r), r]));
  let unchanged = prev.length === next.length;
  const out = next.map((r, i) => {
    const p = old.get(key(r));
    const keep = p !== undefined && same(p, r);
    if (!keep || prev[i] !== p) unchanged = false;
    return keep ? (p as R) : r;
  });
  return unchanged ? prev : out;
}

const id = (r: { id: string }) => r.id;

function merge(prev: OpsConsole, next: OpsConsole): OpsConsole {
  const merged: OpsConsole = {
    ...next,
    kpis: same(prev.kpis, next.kpis) ? prev.kpis : next.kpis,
    books: same(prev.books, next.books) ? prev.books : next.books,
    balances: same(prev.balances, next.balances) ? prev.balances : next.balances,
    escrow: shareRows(prev.escrow, next.escrow, id),
    ledger: shareRows(prev.ledger, next.ledger, id),
    movements: shareRows(prev.movements, next.movements, (r) => `${r.type}:${r.id}`),
    verdicts: shareRows(prev.verdicts, next.verdicts, id),
    disputes: shareRows(prev.disputes, next.disputes, id),
    webhooks: shareRows(prev.webhooks, next.webhooks, id),
  };
  const keys = ["kpis", "books", "balances", "escrow", "ledger", "movements", "verdicts", "disputes", "webhooks"] as const;
  return keys.every((k) => merged[k] === prev[k]) ? prev : merged;
}

export function OpsLiveProvider({ initial, children }: { initial: OpsConsole; children: React.ReactNode }) {
  const [data, setData] = useState(initial);
  const [seen, setSeen] = useState(initial);
  const [status, setStatus] = useState<Status>("live");
  const [paused, setPaused] = useState(false);
  const [syncedAt, setSyncedAt] = useState(initial.generatedAt);
  const [changedAt, setChangedAt] = useState<number | null>(null);
  const inflight = useRef<AbortController | null>(null);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // A server re-render (e.g. router.refresh() after an arbitration) hands us a newer snapshot.
  if (initial !== seen) {
    setSeen(initial);
    setData((prev) => (initial.generatedAt >= prev.generatedAt ? merge(prev, initial) : prev));
  }

  const fetchOnce = useCallback(async () => {
    inflight.current?.abort();
    const ac = new AbortController();
    inflight.current = ac;
    try {
      const res = await fetch("/api/ops", { cache: "no-store", signal: ac.signal, headers: { accept: "application/json" } });
      if (res.status === 401 || res.status === 403) {
        setStatus("offline");
        return false;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = (await res.json()) as OpsConsole;
      const prev = dataRef.current;
      const merged = merge(prev, next);
      const now = Date.now();
      setSyncedAt(now);
      if (merged !== prev) {
        dataRef.current = merged;
        setData(merged);
        setChangedAt(now);
      }
      setStatus("live");
      return true;
    } catch (err) {
      if ((err as Error).name !== "AbortError") setStatus("reconnecting");
      return true;
    }
  }, []);

  useEffect(() => {
    if (paused) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      let keepGoing = true;
      if (document.visibilityState === "visible") keepGoing = await fetchOnce();
      if (!stopped && keepGoing) timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState !== "visible" || stopped) return;
      clearTimeout(timer);
      void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      inflight.current?.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [paused, fetchOnce]);

  const value = useMemo<LiveValue>(
    () => ({
      data,
      status: paused ? "paused" : status,
      syncedAt,
      changedAt,
      paused,
      setPaused,
      refresh: () => void fetchOnce(),
    }),
    [data, status, paused, syncedAt, changedAt, fetchOnce],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

function useNow(everyMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

const ago = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 2) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
};

/** "● Live · synced 3s ago" pill; click to pause/resume polling. */
export function LiveIndicator({ className }: { className?: string }) {
  const { status, syncedAt, changedAt, paused, setPaused } = useOpsLive();
  const now = useNow(1000);
  const fresh = changedAt != null && now - changedAt < 4000;
  const label =
    status === "paused" ? "Paused" : status === "reconnecting" ? "Reconnecting…" : status === "offline" ? "Offline" : fresh ? "Updated" : "Live";
  const detail = status === "paused" ? "auto-refresh off" : fresh ? "just now" : `synced ${ago(now - syncedAt)}`;
  return (
    <button
      type="button"
      onClick={() => setPaused(!paused)}
      aria-pressed={!paused}
      aria-label={paused ? "Resume live updates" : "Pause live updates"}
      title={`Polls the books every ${POLL_MS / 1000}s while this tab is visible. Changed cells flash. Click to ${paused ? "resume" : "pause"}.`}
      className={cn(
        "group inline-flex h-8 items-center gap-2 rounded-full border pl-2.5 pr-2 text-[12.5px] font-medium shadow-card transition-colors",
        fresh ? "border-jade-300 bg-jade-50 text-jade-700" : "border-line bg-card text-ink-2 hover:border-line-2",
        className,
      )}
    >
      <span className="relative flex size-2.5 items-center justify-center" aria-hidden>
        {status === "live" && <span className="absolute inline-flex size-full animate-ping rounded-full bg-jade-500 opacity-60" />}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            status === "live" ? "bg-jade-500" : status === "reconnecting" ? "bg-amber-500" : status === "offline" ? "bg-rose-500" : "bg-line-2",
          )}
        />
      </span>
      <span className="font-semibold">{label}</span>
      <span className="num hidden text-ink-3 sm:inline" aria-live="off">
        · {detail}
      </span>
      <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-paper-2 text-ink-3 group-hover:text-ink [&_svg]:size-3">
        {paused ? <Play /> : <Pause />}
      </span>
    </button>
  );
}

export function LiveBooksBadge() {
  return <BooksBadge books={useOpsLive().data.books} />;
}

export function LiveKpis() {
  const { data } = useOpsLive();
  return <KpiHeader kpis={data.kpis} heldCount={data.books.heldMilestoneCount} />;
}
