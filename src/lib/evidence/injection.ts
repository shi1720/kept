/**
 * Deterministic prompt-injection detector. Deliverables are untrusted input
 * that ends up in front of the referee model, so anything that looks like an
 * attempt to instruct the referee is flagged; independently of whether the
 * model itself noticed; and surfaced to both parties.
 */
const PATTERNS: RegExp[] = [
  /ignore (all |any )?(the )?(previous|prior|above|earlier) (instructions|rules|criteria)/i,
  /disregard (all |any )?(the )?(previous|prior|above) /i,
  /\b(you are|act as|you're) (now )?(the |an? )?(ai |kept )?(referee|judge|evaluator|grader|assistant)\b/i,
  /\b(mark|rate|score|grade) (all|every|each) (the )?(criteria|criterion|requirements?)\b/i,
  /\ball (acceptance )?criteria (are|have been) (met|satisfied|fulfilled)\b/i,
  /\b(release|approve) (the )?(funds|payment|escrow|milestone) (immediately|now|automatically)\b/i,
  /\b(system prompt|developer message|<\/?system>|<\/?instructions>)/i,
  /\bnote to (the )?(ai|referee|judge|llm|model)\b/i,
  /\b(score|rate) (this|it) (100|10\/10|100\/100)\b/i,
];

export interface InjectionFinding {
  source: string;
  snippet: string;
}

export function scanForInjection(source: string, text: string): InjectionFinding[] {
  const findings: InjectionFinding[] = [];
  for (const re of PATTERNS) {
    const m = re.exec(text);
    if (m) {
      const start = Math.max(0, m.index - 60);
      findings.push({ source, snippet: text.slice(start, m.index + m[0].length + 60).replace(/\s+/g, " ").trim() });
    }
  }
  return findings;
}

/** Text hidden from humans in HTML (display:none, zero-size, white-on-white). */
export function extractHiddenHtmlText(html: string): string {
  const hidden: string[] = [];
  const re =
    /<([a-z0-9]+)[^>]*style\s*=\s*["'][^"']*(display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0|color\s*:\s*(#fff\b|#ffffff\b|white\b|transparent))[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) hidden.push(m[4].replace(/<[^>]+>/g, " "));
  return hidden.join(" ").trim();
}
