/** Ops console tab keys (shared by the server page and the client tabs). */
export const OPS_TABS = ["escrow", "ledger", "paypal", "ai", "disputes", "webhooks"] as const;
export type OpsTab = (typeof OPS_TABS)[number];
