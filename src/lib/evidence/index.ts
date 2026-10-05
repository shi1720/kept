import { imageSize } from "image-size";
import type { Artifact, Criterion, EvidenceFact, MachineCheck } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { extractHiddenHtmlText, scanForInjection, type InjectionFinding } from "./injection";
import { safeFetch } from "./safe-fetch";

/**
 * The evidence engine: "code measures, the model judges."
 *
 * LLMs are unreliable at counting words, checking whether a URL loads or
 * whether a repo contains tests. So before the referee sees anything, Kept
 * probes every artifact deterministically and hands the model a pack of
 * verified facts, extracted text and images. Machine checks attached to
 * criteria are evaluated here, not by the model.
 */

export interface DocumentText {
  artifactId: string;
  name: string;
  kind: "text" | "document" | "webpage" | "repository";
  text: string;
  words: number;
}

export interface ImageEvidence {
  artifactId: string;
  name: string;
  mime: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  base64: string;
  width?: number;
  height?: number;
}

export interface RepoEvidence {
  artifactId: string;
  slug: string;
  paths: string[];
  readme: string;
  language: string | null;
  pushedAt: string | null;
}

export interface MachineCheckOutcome {
  criterionId: string;
  type: MachineCheck["type"];
  passed: boolean;
  detail: string;
}

export interface EvidencePack {
  facts: EvidenceFact[];
  documents: DocumentText[];
  images: ImageEvidence[];
  repos: RepoEvidence[];
  pages: { artifactId: string; url: string; ok: boolean; status: number; text: string }[];
  checks: MachineCheckOutcome[];
  injection: InjectionFinding[];
  totalWords: number;
  fileCount: number;
  extensions: string[];
}

export const countWords = (s: string) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;

const TEXT_EXT = /\.(txt|md|markdown|csv|json|html?|css|js|jsx|ts|tsx|py|rb|go|rs|java|kt|swift|yml|yaml|xml|svg|sql)$/i;

function extOf(name: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

export function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function probeFile(a: Artifact, pack: EvidencePack) {
  const name = a.name;
  const ext = extOf(name);
  const mime = a.mime ?? "";
  const buf = a.data ? Buffer.from(a.data) : null;
  pack.fileCount += 1;
  if (ext) pack.extensions.push(ext);
  if (!buf) {
    pack.facts.push({ artifactId: a.id, probe: "file", label: name, detail: "File has no content", ok: false });
    return;
  }
  const sizeKb = Math.round(buf.byteLength / 1024);

  if (mime.startsWith("image/") && !mime.includes("svg")) {
    let width: number | undefined;
    let height: number | undefined;
    try {
      const dim = imageSize(new Uint8Array(buf));
      width = dim.width;
      height = dim.height;
    } catch {
      /* unknown format */
    }
    pack.facts.push({
      artifactId: a.id,
      probe: "image",
      label: name,
      detail: `${mime.replace("image/", "").toUpperCase()} image${width ? `, ${width}×${height}px` : ""}, ${sizeKb} KB`,
      ok: true,
    });
    const supported = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
    const m = supported.find((s) => s === mime);
    if (m && buf.byteLength <= 3_500_000 && pack.images.length < 6) {
      pack.images.push({ artifactId: a.id, name, mime: m, base64: buf.toString("base64"), width, height });
    }
    return;
  }

  let text = "";
  let kind = "document";
  try {
    if (mime === "application/pdf" || ext === "pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const out = await extractText(pdf, { mergePages: true });
      text = out.text;
      kind = `PDF, ${out.totalPages} page${out.totalPages === 1 ? "" : "s"}`;
    } else if (ext === "docx") {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer: buf })).value;
      kind = "Word document";
    } else if (mime.startsWith("text/") || TEXT_EXT.test(name) || mime === "application/json") {
      text = buf.toString("utf8");
      kind = ext === "svg" ? "SVG vector" : `${ext.toUpperCase() || "Text"} file`;
      if (/html?$/.test(ext)) {
        const hidden = extractHiddenHtmlText(text);
        if (hidden) pack.injection.push(...scanForInjection(`${name} (hidden HTML)`, hidden));
        text = htmlToText(text);
      }
    }
  } catch (err) {
    pack.facts.push({
      artifactId: a.id,
      probe: "file",
      label: name,
      detail: `Could not read file: ${err instanceof Error ? err.message : "unknown error"}`,
      ok: false,
    });
    return;
  }

  if (text) {
    const words = countWords(text);
    pack.documents.push({ artifactId: a.id, name, kind: "document", text, words });
    pack.injection.push(...scanForInjection(name, text));
    pack.facts.push({
      artifactId: a.id,
      probe: "document",
      label: name,
      detail: `${kind} · ${words.toLocaleString("en-US")} words · ${sizeKb} KB`,
      ok: true,
    });
  } else {
    pack.facts.push({ artifactId: a.id, probe: "file", label: name, detail: `${ext.toUpperCase() || "Binary"} file · ${sizeKb} KB`, ok: true });
  }
}

async function probeUrl(a: Artifact, pack: EvidencePack) {
  const url = a.content ?? "";
  const res = await safeFetch(url);
  const isHtml = res.contentType.includes("html");
  const text = isHtml ? htmlToText(res.body) : res.contentType.startsWith("text/") ? res.body : "";
  const title = isHtml ? res.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() : undefined;
  if (isHtml) {
    const hidden = extractHiddenHtmlText(res.body);
    if (hidden) pack.injection.push(...scanForInjection(`${url} (hidden HTML)`, hidden));
  }
  pack.injection.push(...scanForInjection(url, text));
  pack.pages.push({ artifactId: a.id, url: res.finalUrl, ok: res.ok, status: res.status, text });
  if (text) pack.documents.push({ artifactId: a.id, name: url, kind: "webpage", text, words: countWords(text) });
  pack.facts.push({
    artifactId: a.id,
    probe: "url",
    label: url,
    detail: res.error
      ? `Unreachable: ${res.error}`
      : `HTTP ${res.status} in ${res.latencyMs} ms${title ? ` · “${title.slice(0, 80)}”` : ""}${text ? ` · ${countWords(text).toLocaleString("en-US")} words` : ""}`,
    ok: res.ok,
  });
}

function parseRepoSlug(input: string): string | null {
  const m = input.trim().match(/(?:github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:\/|$)/);
  return m ? `${m[1]}/${m[2]}` : null;
}

async function probeGithub(a: Artifact, pack: EvidencePack) {
  const slug = parseRepoSlug(a.content ?? "");
  if (!slug) {
    pack.facts.push({ artifactId: a.id, probe: "github", label: a.content ?? "", detail: "Not a GitHub repository URL", ok: false });
    return;
  }
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (env.github.token) headers.Authorization = `Bearer ${env.github.token}`;
  const repoRes = await safeFetch(`https://api.github.com/repos/${slug}`, { headers });
  if (!repoRes.ok) {
    pack.facts.push({ artifactId: a.id, probe: "github", label: slug, detail: `Repository not accessible (HTTP ${repoRes.status || "error"})`, ok: false });
    return;
  }
  const repo = JSON.parse(repoRes.body) as { default_branch: string; language: string | null; pushed_at: string; private: boolean };
  const treeRes = await safeFetch(`https://api.github.com/repos/${slug}/git/trees/${repo.default_branch}?recursive=1`, { headers });
  const paths: string[] = treeRes.ok
    ? ((JSON.parse(treeRes.body) as { tree: { path: string; type: string }[] }).tree ?? []).map((t) => (t.type === "tree" ? `${t.path}/` : t.path))
    : [];
  const readmeRes = await safeFetch(`https://api.github.com/repos/${slug}/readme`, {
    headers: { ...headers, Accept: "application/vnd.github.raw+json" },
  });
  const readme = readmeRes.ok ? readmeRes.body.slice(0, 20_000) : "";
  pack.injection.push(...scanForInjection(`${slug} README`, readme));
  pack.repos.push({ artifactId: a.id, slug, paths, readme, language: repo.language, pushedAt: repo.pushed_at });
  const hasTests = paths.some((p) => /(^|\/)(tests?|__tests__|spec)\//i.test(p) || /\.(test|spec)\.[a-z]+$/i.test(p));
  pack.facts.push({
    artifactId: a.id,
    probe: "github",
    label: slug,
    detail: `${paths.filter((p) => !p.endsWith("/")).length} files · ${repo.language ?? "unknown language"} · README ${readme ? "present" : "missing"} · tests ${hasTests ? "present" : "not found"} · last push ${repo.pushed_at?.slice(0, 10)}`,
    ok: true,
  });
  if (readme) pack.documents.push({ artifactId: a.id, name: `${slug}/README`, kind: "repository", text: readme, words: countWords(readme) });
}

function globToRegex(glob: string) {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "§").replace(/\*/g, "[^/]*").replace(/§/g, ".*");
  return new RegExp(`(^|/)${esc}`, "i");
}

export function evaluateCheck(c: Pick<Criterion, "id" | "check">, pack: EvidencePack): MachineCheckOutcome | null {
  const chk = c.check;
  if (!chk || chk.type === "none") return null;
  const allText = pack.documents.map((d) => d.text).join("\n").toLowerCase();
  const out = (passed: boolean, detail: string): MachineCheckOutcome => ({ criterionId: c.id, type: chk.type, passed, detail });
  const contentWords = pack.documents.filter((d) => d.kind !== "repository").reduce((s, d) => s + d.words, 0);

  switch (chk.type) {
    case "min_words":
      return out(contentWords >= (chk.value ?? 0), `${contentWords.toLocaleString("en-US")} words delivered (minimum ${chk.value})`);
    case "max_words":
      return out(contentWords <= (chk.value ?? Infinity), `${contentWords.toLocaleString("en-US")} words delivered (maximum ${chk.value})`);
    case "min_files": {
      // Inline written deliverables count as delivered documents.
      const n = pack.fileCount + pack.documents.filter((d) => d.kind === "text").length;
      return out(n >= (chk.value ?? 1), `${n} deliverable file${n === 1 ? "" : "s"}/document${n === 1 ? "" : "s"} (minimum ${chk.value ?? 1})`);
    }
    case "file_types": {
      const want = (chk.values ?? []).map((v) => v.toLowerCase().replace(/^\./, ""));
      const missing = want.filter((w) => !pack.extensions.includes(w) && !(w === "jpg" && pack.extensions.includes("jpeg")));
      return out(missing.length === 0, missing.length ? `Missing formats: ${missing.join(", ")}` : `All formats present: ${want.join(", ")}`);
    }
    case "url_reachable": {
      const live = pack.pages.filter((p) => p.ok).length + pack.repos.length;
      return out(live > 0, live > 0 ? `${live} live link${live === 1 ? "" : "s"} verified` : "No delivered link responded with HTTP 2xx");
    }
    case "page_contains": {
      const pageText = (pack.pages.length ? pack.pages.map((p) => p.text).join("\n") : allText).toLowerCase();
      const missing = (chk.values ?? []).filter((v) => !pageText.includes(v.toLowerCase()));
      return out(missing.length === 0, missing.length ? `Not found on page: ${missing.map((m) => `“${m}”`).join(", ")}` : "All required content found on the page");
    }
    case "repo_has_path": {
      const paths = pack.repos.flatMap((r) => r.paths);
      if (!paths.length) return out(false, "No repository delivered");
      const missing = (chk.values ?? []).filter((v) => !paths.some((p) => globToRegex(v).test(p)));
      return out(missing.length === 0, missing.length ? `Missing in repo: ${missing.join(", ")}` : `Repository contains ${(chk.values ?? []).join(", ")}`);
    }
    case "keywords_present": {
      const missing = (chk.values ?? []).filter((v) => !allText.includes(v.toLowerCase()));
      return out(missing.length === 0, missing.length ? `Missing keywords: ${missing.join(", ")}` : "All keywords present");
    }
    case "min_image_resolution": {
      const ok = pack.images.find((i) => (i.width ?? 0) >= (chk.width ?? 0) && (i.height ?? 0) >= (chk.height ?? 0));
      const best = pack.images.map((i) => `${i.width}×${i.height}`).join(", ") || "no images";
      return out(Boolean(ok), `Required ≥ ${chk.width}×${chk.height}px; delivered ${best}`);
    }
    default:
      return null;
  }
}

export async function gatherEvidence(artifacts: Artifact[], criteria: Criterion[]): Promise<EvidencePack> {
  const pack: EvidencePack = {
    facts: [],
    documents: [],
    images: [],
    repos: [],
    pages: [],
    checks: [],
    injection: [],
    totalWords: 0,
    fileCount: 0,
    extensions: [],
  };

  await Promise.all(
    artifacts.map(async (a) => {
      try {
        if (a.kind === "text") {
          const text = a.content ?? "";
          const words = countWords(text);
          pack.documents.push({ artifactId: a.id, name: a.name, kind: "text", text, words });
          pack.injection.push(...scanForInjection(a.name, text));
          pack.facts.push({ artifactId: a.id, probe: "text", label: a.name, detail: `Inline text · ${words.toLocaleString("en-US")} words`, ok: true });
        } else if (a.kind === "file") await probeFile(a, pack);
        else if (a.kind === "url") await probeUrl(a, pack);
        else if (a.kind === "github") await probeGithub(a, pack);
      } catch (err) {
        pack.facts.push({ artifactId: a.id, probe: a.kind, label: a.name, detail: `Probe failed: ${err instanceof Error ? err.message : err}`, ok: false });
      }
    }),
  );

  // The same hidden sentence is seen both by the hidden-text pass and the page text; count it once.
  const seen = new Set<string>();
  pack.injection = pack.injection.filter((f) => {
    const key = f.snippet.toLowerCase().replace(/[^a-z]/g, "").slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  pack.totalWords = pack.documents.filter((d) => d.kind !== "repository").reduce((s, d) => s + d.words, 0);
  pack.checks = criteria.map((c) => evaluateCheck(c, pack)).filter((x): x is MachineCheckOutcome => x !== null);
  if (pack.injection.length) {
    pack.facts.push({
      probe: "security",
      label: "Prompt-injection guard",
      detail: `${pack.injection.length} attempt${pack.injection.length === 1 ? "" : "s"} to instruct the referee found in the deliverable`,
      ok: false,
    });
  }
  return pack;
}
