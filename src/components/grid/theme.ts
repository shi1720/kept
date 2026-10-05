"use client";

import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

/** AG Grid Quartz theme tuned to Kept's paper-and-ink palette. */
export const keptGridTheme = themeQuartz.withParams({
  fontFamily: "var(--font-inter)",
  fontSize: 13,
  foregroundColor: "#16140f",
  backgroundColor: "#ffffff",
  headerBackgroundColor: "#faf8f3",
  headerTextColor: "#4a463e",
  headerFontWeight: 600,
  borderColor: "#e7e1d5",
  rowHoverColor: "#f7f4ec",
  selectedRowBackgroundColor: "#eaf4f0",
  accentColor: "#0f6b57",
  wrapperBorderRadius: 16,
  rowHeight: 56,
  headerHeight: 42,
  spacing: 7,
  oddRowBackgroundColor: "#ffffff",
});
