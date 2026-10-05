import { Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Cite, Container, SectionHeading } from "./section";

type Cell = { mark?: "yes" | "no" | "partial"; text: string };

const COLUMNS = ["Kept", "Upwork", "Fiverr", "Escrow.com", "Just trust them"];

const ROWS: { label: string; cells: Cell[] }[] = [
  {
    label: "Freelancer keeps",
    cells: [
      { mark: "yes", text: "100% of the milestone" },
      { text: "85–100% (variable 0–15% fee)" },
      { text: "80%" },
      { text: "Depends on who pays the fee" },
      { text: "100%, if they pay" },
    ],
  },
  {
    label: "Client pays on top",
    cells: [
      { mark: "yes", text: "2.9% (min $1) + PayPal processing at cost" },
      { text: "Up to 7.99% + $0.99–$14.99 per contract" },
      { text: "5.5% + small-order fee" },
      { text: "2.6% ($50 minimum), +3.05% by card or PayPal" },
      { text: "Nothing" },
    ],
  },
  {
    label: "Protects deals made in DMs and email",
    cells: [
      { mark: "yes", text: "Built for it" },
      { mark: "partial", text: "Direct Contracts only; client-initiated ones have no protection" },
      { mark: "no", text: "On-platform orders only" },
      { mark: "yes", text: "Yes" },
      { mark: "no", text: "No protection at all" },
    ],
  },
  {
    label: "Machine-checkable acceptance criteria",
    cells: [
      { mark: "yes", text: "Compiled from your brief, signed by both" },
      { mark: "no", text: "No" },
      { mark: "no", text: "No" },
      { mark: "no", text: "No" },
      { mark: "no", text: "No" },
    ],
  },
  {
    label: "When there’s a dispute",
    cells: [
      { mark: "yes", text: "AI mediation in minutes, included. Human arbitrator if either side rejects." },
      { text: "Human mediation, then arbitration at $337.50 per side" },
      { text: "Support team and resolution center" },
      { text: "Human mediation, no published timeline" },
      { text: "Small-claims court. Fewer than 1% go." },
    ],
  },
  {
    label: "AI in the loop",
    cells: [
      { mark: "yes", text: "Contract compiler, referee, mediator, MCP server" },
      { text: "Matching and drafting only" },
      { mark: "no", text: "Not for disputes" },
      { mark: "no", text: "None" },
      { mark: "no", text: "None" },
    ],
  },
];

function Mark({ mark }: { mark?: Cell["mark"] }) {
  if (!mark) return null;
  const map = {
    yes: { Icon: Check, cls: "bg-jade-600 text-white", label: "Yes" },
    no: { Icon: X, cls: "bg-paper-2 text-ink-3", label: "No" },
    partial: { Icon: Minus, cls: "bg-amber-100 text-amber-700", label: "Partly" },
  }[mark];
  return (
    <span className={cn("mt-px inline-flex size-[18px] shrink-0 items-center justify-center rounded-full", map.cls)}>
      <map.Icon className="size-3" strokeWidth={3} aria-hidden />
      <span className="sr-only">{map.label}: </span>
    </span>
  );
}

export function Comparison() {
  return (
    <section aria-labelledby="compare-title" className="border-t border-line bg-paper-2/50 py-16 sm:py-20">
      <Container>
        <SectionHeading
          split
          id="compare-title"
          index="07"
          eyebrow="How it compares"
          title={
            <>
              Marketplace protection, <span className="italic text-jade-600">without the marketplace.</span>
            </>
          }
          lede="Kept doesn’t find you clients. You already have them. It protects the deal you already made, at a fraction of what platforms charge."
        />

        <ul className="mt-10 space-y-3 md:hidden">
          {ROWS.map((r) => (
            <li key={r.label} className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
              <div className="border-b border-line px-4 pb-3 pt-4">
                <div className="text-[12px] font-medium uppercase tracking-wider text-ink-2/80">{r.label}</div>
                <div className="mt-2 flex gap-2 text-[14.5px] font-medium leading-snug text-ink">
                  <Mark mark={r.cells[0].mark} />
                  <span>
                    <span className="display mr-1 text-[18px] font-normal text-jade-700">Kept:</span> {r.cells[0].text}
                  </span>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-px bg-line">
                {r.cells.slice(1).map((c, i) => (
                  <div key={i} className="bg-card px-4 py-3">
                    <dt className="text-[11.5px] font-semibold text-ink">{COLUMNS[i + 1]}</dt>
                    <dd className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{c.text}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>

        <div className="mt-10 hidden overflow-hidden rounded-2xl border border-line bg-card shadow-card md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-[13.5px]">
              <caption className="sr-only">Kept compared with Upwork, Fiverr, Escrow.com and paying without protection</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 w-[190px] bg-card px-5 py-4 text-[12px] font-medium text-ink-2/80">
                    <span className="sr-only">Feature</span>
                  </th>
                  {COLUMNS.map((c, i) => (
                    <th
                      key={c}
                      scope="col"
                      className={cn("px-4 py-4 align-bottom text-[14px] font-semibold", i === 0 ? "bg-jade-50 text-jade-700" : "text-ink")}
                    >
                      {i === 0 ? <span className="display text-[24px] font-normal leading-none text-jade-700">Kept</span> : c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.label} className="border-t border-line">
                    <th scope="row" className="sticky left-0 z-10 bg-card px-5 py-4 align-top text-[13px] font-medium text-ink">
                      {r.label}
                    </th>
                    {r.cells.map((c, i) => (
                      <td key={i} className={cn("px-4 py-4 align-top leading-snug", i === 0 ? "bg-jade-50/70 font-medium text-ink" : "text-ink-2")}>
                        <span className="flex gap-2">
                          <Mark mark={c.mark} />
                          <span>{c.text}</span>
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 max-w-4xl">
          <Cite>
            Sources: Upwork fees via GoLance (2026) and Upwork support; arbitration via GigRadar (Apr 2026); Fiverr via vaultleap (2026); Escrow.com fee calculator
            (retrieved Oct 2026); court figure from Authors Guild &amp; Freelancers Union (2022). Fees change; check each provider before relying on them.
          </Cite>
        </p>
      </Container>
    </section>
  );
}
