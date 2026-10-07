"use client";

import { FileText, FolderGit2, Link2, Paperclip, Sparkles, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/client-api";

interface FileItem {
  name: string;
  mime: string;
  base64: string;
  size: number;
}

const MAX = 8 * 1024 * 1024;

function readFile(file: File): Promise<FileItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, mime: file.type || "application/octet-stream", base64: String(reader.result).split(",")[1] ?? "", size: file.size });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function SubmitWorkDialog({ milestoneId, milestoneTitle, demo, revision }: { milestoneId: string; milestoneTitle: string; demo: boolean; revision: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [text, setText] = useState("");
  const [textName, setTextName] = useState("deliverable.md");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [urls, setUrls] = useState<string[]>([""]);
  const [repo, setRepo] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const next: FileItem[] = [];
    for (const f of Array.from(list)) {
      if (f.size > MAX) {
        toast.error(`${f.name} is larger than 8 MB`);
        continue;
      }
      next.push(await readFile(f));
    }
    setFiles((prev) => [...prev, ...next].slice(0, 12));
  };

  const items = [
    ...(text.trim() ? [{ kind: "text" as const, name: textName || "deliverable.md", content: text }] : []),
    ...files.map((f) => ({ kind: "file" as const, name: f.name, mime: f.mime, base64: f.base64 })),
    ...urls.filter((u) => u.trim()).map((u) => ({ kind: "url" as const, url: u.trim() })),
    ...(repo.trim() ? [{ kind: "github" as const, url: repo.trim() }] : []),
  ];

  const submit = async () => {
    setBusy(true);
    try {
      await api(`/api/milestones/${milestoneId}/submit`, { body: { note, items } });
      toast.success("Submitted! The AI referee is reviewing your work.");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const sample = (path: string, n: string) => {
    setUrls([`${window.location.origin}${path}`]);
    setNote(n);
    toast("Sample deliverable loaded; hit Submit.");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="jade" size="lg">
          <Upload /> {revision ? "Submit revised work" : "Submit work"}
        </Button>
      </DialogTrigger>
      <DialogContent wide>
        <DialogHeader title={`Deliver “${milestoneTitle}”`} description="Share the finished work. Kept checks it against your agreed criteria." />
        {demo && (
          <details className="mb-5 rounded-xl border border-line bg-paper/50 px-3 py-2.5 text-xs text-ink-2"><summary className="cursor-pointer font-medium">Use an example delivery</summary><div className="mt-3 flex flex-wrap gap-2">
            <Sparkles className="size-3.5" />
            <button className="rounded-full bg-card px-2.5 py-1 font-medium shadow-card hover:bg-paper" onClick={() => sample("/samples/lantern", "Landing page is live; story, pricing and pre-order are all in.")}>Honest landing page</button>
            <button className="rounded-full bg-card px-2.5 py-1 font-medium shadow-card hover:bg-paper" onClick={() => sample("/samples/lantern-sneaky", "All done, should be an easy approve!")}>Sneaky one (hidden prompt injection)</button>
            <button className="rounded-full bg-card px-2.5 py-1 font-medium shadow-card hover:bg-paper" onClick={() => sample("/samples/lantern-draft", "Quick first pass, more to come.")}>Half-finished draft</button>
          </div></details>
        )}
        <Tabs defaultValue={demo ? "links" : "write"}>
          <TabsList className="grid w-full grid-cols-4 [&_button]:justify-center [&_button]:px-2 [&_svg]:hidden sm:[&_svg]:inline">
            <TabsTrigger value="write"><FileText /> Write</TabsTrigger>
            <TabsTrigger value="files"><Paperclip /> Files {files.length > 0 && `(${files.length})`}</TabsTrigger>
            <TabsTrigger value="links"><Link2 /> Links</TabsTrigger>
            <TabsTrigger value="github"><FolderGit2 /> GitHub</TabsTrigger>
          </TabsList>
          <div className="mt-4">
            <TabsContent value="write" className="flex flex-col gap-3">
              <Input value={textName} onChange={(e) => setTextName(e.target.value)} placeholder="File name" className="max-w-xs" />
              <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste copy, a document, captions, a report… Markdown welcome." />
            </TabsContent>
            <TabsContent value="files">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  void addFiles(e.dataTransfer.files);
                }}
                role="button"
                tabIndex={0}
                aria-label="Choose deliverable files"
                onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inputRef.current?.click()}}}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col focus-visible:outline-2 focus-visible:outline-jade-600 items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${drag ? "border-jade-500 bg-jade-50" : "border-line-2 hover:bg-paper"}`}
              >
                <Upload className="size-6 text-ink-3" />
                <p className="text-sm font-medium">Drop files or click to browse</p>
                <p className="text-xs text-ink-3">Images, PDFs, Word docs, code, text · up to 8 MB each</p>
                <input ref={inputRef} type="file" multiple hidden onChange={(e) => void addFiles(e.target.files)} />
              </div>
              {files.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <li key={i} className="flex max-w-full min-w-0 items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-xs">
                      <span className="min-w-0 truncate" title={f.name}>{f.name}</span> <span className="shrink-0 text-ink-3">{Math.ceil(f.size / 1024)} KB</span>
                      <button aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))} className="shrink-0 p-1 text-ink-3 hover:text-rose-600"><X className="size-3" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="links" className="flex flex-col gap-2">
              {urls.map((u, i) => (
                <Input key={i} value={u} onChange={(e) => setUrls(urls.map((x, j) => (j === i ? e.target.value : x)))} placeholder="https://your-deliverable.com" type="url" />
              ))}
              <Button variant="ghost" size="sm" className="self-start" onClick={() => setUrls([...urls, ""])}>+ Add another link</Button>
              <p className="text-xs text-ink-3">Kept checks each link is live and reads the page, so the referee can verify required content.</p>
            </TabsContent>
            <TabsContent value="github" className="flex flex-col gap-2">
              <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="github.com/owner/repo" />
              <p className="text-xs text-ink-3">Public repositories only. Kept reads the file tree and README to check paths like tests/ or docs.</p>
            </TabsContent>
          </div>
        </Tabs>
        <Field label="Note to the client (optional)" className="mt-2">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything they should know before reviewing." />
        </Field>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-3">{items.length} deliverable{items.length === 1 ? "" : "s"} ready</p>
          <Button variant="jade" size="lg" loading={busy} disabled={items.length === 0} onClick={submit}>Submit for review</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
