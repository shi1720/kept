import { sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { ledgerEntries, type LedgerAccount } from "@/lib/db/schema";
import { newId } from "@/lib/ids";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type DbOrTx = DB | Tx;

export interface JournalLine {
  account: LedgerAccount;
  /** Positive = debit, negative = credit. */
  amountCents: number;
}

export interface Journal {
  pactId: string;
  milestoneId?: string;
  memo: string;
  reference?: string;
  demoWorkspace?: string | null;
  lines: JournalLine[];
}

export const ACCOUNT_LABELS: Record<LedgerAccount, string> = {
  paypal_cash: "PayPal balance",
  escrow_liability: "Escrow held for parties",
  fee_revenue: "Kept fee revenue",
  processing_collected: "Processing fees collected",
  processing_expense: "PayPal processing expense",
  payout_expense: "PayPal payout fees",
};

/** Post a balanced journal. Throws if debits and credits don't net to zero. */
export async function postJournal(dbx: DbOrTx, j: Journal): Promise<string> {
  const lines = j.lines.filter((l) => l.amountCents !== 0);
  const sum = lines.reduce((s, l) => s + l.amountCents, 0);
  if (sum !== 0) throw new Error(`Unbalanced journal "${j.memo}": off by ${sum} cents`);
  if (lines.length === 0) return "";
  const txnId = newId("txn");
  await dbx.insert(ledgerEntries).values(
    lines.map((l) => ({
      id: newId("led"),
      txnId,
      pactId: j.pactId,
      milestoneId: j.milestoneId,
      account: l.account,
      amountCents: l.amountCents,
      memo: j.memo,
      reference: j.reference,
      demoWorkspace: j.demoWorkspace ?? null,
    })),
  );
  return txnId;
}

export async function accountBalances(dbx: DbOrTx, demoWorkspace?: string | null) {
  const rows = await dbx
    .select({
      account: ledgerEntries.account,
      balance: sql<number>`sum(${ledgerEntries.amountCents})`,
    })
    .from(ledgerEntries)
    .where(demoWorkspace === undefined ? undefined : sql`${ledgerEntries.demoWorkspace} is ${demoWorkspace}`)
    .groupBy(ledgerEntries.account);
  const out = Object.fromEntries(Object.keys(ACCOUNT_LABELS).map((k) => [k, 0])) as Record<LedgerAccount, number>;
  for (const r of rows) out[r.account] = Number(r.balance);
  return out;
}
