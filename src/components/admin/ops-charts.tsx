"use client";

import { AllCommunityModule, ModuleRegistry, type AgCartesianChartOptions, type AgChartTheme } from "ag-charts-community";
import { AgCharts } from "ag-charts-react";
import { useMemo, useSyncExternalStore } from "react";
import { formatMoney } from "@/lib/money";

/**
 * AG Charts (Community) views that sit above the console grids. They're pure
 * functions of the rows the grid currently displays, so every grid filter, chip
 * and quick-search is reflected in the chart immediately.
 * Loaded with `next/dynamic` (client only); see `ChartSlot`.
 */

ModuleRegistry.registerModules([AllCommunityModule]);

export const KEPT_CHART = {
  jade: "#148a6f",
  jadeDeep: "#0f6b57",
  ember: "#c2410c",
  amber: "#c98a1c",
  sky: "#3266e3",
  ink: "#16140f",
  ink2: "#4a463e",
  ink3: "#6f6a60",
  line: "#e7e1d5",
  paper: "#faf8f3",
  muted: "#b9b1a2",
} as const;

/** next/font hashes the family name; canvas text needs the resolved one. */
function useFontFamily() {
  return useSyncExternalStore(
    () => () => {},
    () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--font-inter").trim();
      return `${v ? `${v}, ` : ""}Inter, ui-sans-serif, system-ui, sans-serif`;
    },
    () => "Inter, ui-sans-serif, system-ui, sans-serif",
  );
}

function useKeptTheme(): AgChartTheme {
  const fontFamily = useFontFamily();
  return useMemo<AgChartTheme>(
    () => ({
      baseTheme: "ag-default",
      params: {
        fontFamily,
        fontSize: 12,
        foregroundColor: KEPT_CHART.ink,
        textColor: KEPT_CHART.ink2,
        subtleTextColor: KEPT_CHART.ink3,
        backgroundColor: "transparent",
        chartBackgroundColor: "transparent",
        gridLineColor: "#efe9de",
        axisLineColor: KEPT_CHART.line,
        tooltipBackgroundColor: KEPT_CHART.ink,
        tooltipTextColor: "#faf8f3",
        tooltipSubtleTextColor: "#c9c3b6",
        tooltipBorder: false,
        tooltipBorderRadius: 10,
        chartPadding: 4,
        accentColor: KEPT_CHART.jadeDeep,
      },
    }),
    [fontFamily],
  );
}

const compactMoney = (cents: number) => {
  const d = Math.abs(cents) / 100;
  const sign = cents < 0 ? "−" : "";
  if (d >= 1_000_000) return `${sign}$${(d / 1_000_000).toFixed(d >= 10_000_000 ? 0 : 1)}M`;
  if (d >= 10_000) return `${sign}$${Math.round(d / 1000)}k`;
  if (d >= 1000) return `${sign}$${(d / 1000).toFixed(1)}k`;
  return `${sign}$${Math.round(d)}`;
};

/* ------------------------------------------------------------------ */
/* Escrow: amount by milestone status bucket                           */
/* ------------------------------------------------------------------ */

export interface StatusDatum {
  key: string;
  label: string;
  cents: number;
  count: number;
  color: string;
}

export function EscrowStatusChart({ data, height = 196 }: { data: StatusDatum[]; height?: number }) {
  const theme = useKeptTheme();
  const options = useMemo<AgCartesianChartOptions>(
    () => ({
      theme,
      height,
      data,
      // Room on the right for the outside-end value label of the longest bar.
      padding: { top: 4, right: 44, bottom: 0, left: 0 },
      series: [
        {
          type: "bar",
          direction: "horizontal",
          xKey: "label",
          yKey: "cents",
          yName: "Amount",
          cornerRadius: 4,
          strokeWidth: 0,
          itemStyler: (p) => ({ fill: (p.datum as StatusDatum).color }),
          label: {
            enabled: true,
            placement: "outside-end",
            color: KEPT_CHART.ink,
            fontWeight: 600,
            fontSize: 12,
            formatter: (p) => compactMoney(Number(p.value)),
          },
          tooltip: {
            renderer: (p) => {
              const d = p.datum as StatusDatum;
              return {
                heading: d.label,
                title: formatMoney(d.cents),
                data: [{ label: "Milestones", value: String(d.count) }],
              };
            },
          },
        },
      ],
      axes: {
        x: {
          type: "category",
          position: "left",
          line: { enabled: false },
          label: { color: KEPT_CHART.ink2, fontSize: 12, fontWeight: 500 },
          paddingInner: 0.42,
          paddingOuter: 0.2,
        },
        y: {
          type: "number",
          position: "bottom",
          nice: true,
          max: Math.max(1, ...data.map((d) => d.cents)) * 1.15,
          line: { enabled: false },
          gridLine: { enabled: true, style: [{ stroke: "#efe9de", lineDash: [] }] },
          label: { color: KEPT_CHART.ink3, fontSize: 11, formatter: (p) => compactMoney(Number(p.value)) },
        },
      },
      legend: { enabled: false },
    }),
    [data, theme, height],
  );
  return <AgCharts options={options} />;
}

/* ------------------------------------------------------------------ */
/* Ledger: money in vs out over time                                   */
/* ------------------------------------------------------------------ */

export interface FlowDatum {
  label: string;
  inCents: number;
  /** Negative: drawn below the baseline. */
  outCents: number;
}

export function LedgerFlowChart({ data, inName, outName, height = 212 }: { data: FlowDatum[]; inName: string; outName: string; height?: number }) {
  const theme = useKeptTheme();
  // Thin columns: cap at 22px when there are only a few buckets.
  const barWidth = data.length <= 18 ? 22 : undefined;
  const options = useMemo<AgCartesianChartOptions>(
    () => ({
      theme,
      height,
      data,
      padding: { top: 6, right: 8, bottom: 0, left: 0 },
      series: [
        {
          type: "bar",
          xKey: "label",
          yKey: "inCents",
          yName: inName,
          stacked: true,
          width: barWidth,
          fill: KEPT_CHART.jade,
          strokeWidth: 0,
          cornerRadius: 4,
          tooltip: { renderer: (p) => ({ heading: String((p.datum as FlowDatum).label), title: inName, data: [{ label: "Amount", value: formatMoney(Number(p.datum.inCents)) }] }) },
        },
        {
          type: "bar",
          xKey: "label",
          yKey: "outCents",
          yName: outName,
          stacked: true,
          width: barWidth,
          fill: KEPT_CHART.ember,
          strokeWidth: 0,
          cornerRadius: 4,
          tooltip: { renderer: (p) => ({ heading: String((p.datum as FlowDatum).label), title: outName, data: [{ label: "Amount", value: formatMoney(Math.abs(Number(p.datum.outCents))) }] }) },
        },
      ],
      axes: {
        x: {
          type: "category",
          position: "bottom",
          line: { enabled: true, stroke: "#d9d1c2", width: 1 },
          label: { color: KEPT_CHART.ink3, fontSize: 11, avoidCollisions: true, wrapping: "never" },
          paddingInner: 0.38,
        },
        y: {
          type: "number",
          position: "left",
          nice: true,
          line: { enabled: false },
          gridLine: { enabled: true, style: [{ stroke: "#efe9de", lineDash: [] }] },
          label: { color: KEPT_CHART.ink3, fontSize: 11, formatter: (p) => compactMoney(Number(p.value)) },
          crossLines: [{ type: "line", value: 0, stroke: "#b9b1a2", strokeWidth: 1 }],
        },
      },
      legend: {
        enabled: true,
        position: "top",
        item: { marker: { shape: "square", size: 10, padding: 6 }, label: { color: KEPT_CHART.ink2, fontSize: 12, fontWeight: 500 } },
      },
    }),
    [data, theme, height, inName, outName, barWidth],
  );
  return <AgCharts options={options} />;
}
