"use client";

import { Bot, Braces, KeyRound, Plus, ShieldCheck, Terminal, Trash2, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { CodeBlock, CopyButton } from "./code-block";

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

const KEY_PLACEHOLDER = "<YOUR_KEY>";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

function relative(iso: string | null) {
  if (!iso) return "Never used";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Used just now";
  if (mins < 60) return `Used ${mins} min ago`;
  if (mins < 60 * 24) return `Used ${Math.round(mins / 60)} h ago`;
  return `Used ${fmtDate(iso)}`;
}

export function DeveloperConsole({ appUrl }: { appUrl: string }) {
  const [freshKey, setFreshKey] = useState<string | null>(null);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <ApiKeys onCreated={setFreshKey} freshKey={freshKey} />
      <ConnectCard appUrl={appUrl} apiKey={freshKey} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* API keys                                                            */
/* ------------------------------------------------------------------ */

function ApiKeys({ onCreated, freshKey }: { onCreated: (k: string) => void; freshKey: string | null }) {
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ keys: ApiKeyRow[] }>("/api/keys", { quiet: true });
      setKeys(res.keys);
    } catch {
      setKeys([]);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api<{ keys: ApiKeyRow[] }>("/api/keys", { quiet: true })
      .then((res) => alive && setKeys(res.keys))
      .catch(() => alive && setKeys([]));
    return () => {
      alive = false;
    };
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api<{ key: string }>("/api/keys", { body: { name: name.trim() || "My agent" } });
      onCreated(res.key);
      setName("");
      toast.success("API key created; copy it now");
      await load();
    } catch {
      /* toast already shown */
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (confirming !== id) {
      setConfirming(id);
      setTimeout(() => setConfirming((c) => (c === id ? null : c)), 4000);
      return;
    }
    try {
      await api(`/api/keys/${id}`, { method: "DELETE" });
      toast.success("Key revoked. Agents using it will get 401s.");
      setConfirming(null);
      await load();
    } catch {
      /* toast already shown */
    }
  };

  const active = keys?.filter((k) => !k.revokedAt) ?? [];
  const revoked = keys?.filter((k) => k.revokedAt) ?? [];

  return (
    <Card className="flex min-w-0 flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-jade-50 p-1.5 text-jade-700">
            <KeyRound className="size-4" />
          </span>
          <CardTitle>API keys</CardTitle>
          <Badge className="ml-auto">{active.length} / 10</Badge>
        </div>
        <CardDescription>A key acts as you on every REST endpoint and on the MCP server. Give each agent its own, and revoke it the moment you stop trusting it.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={create} className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. Hiring agent" maxLength={60} aria-label="Key name" />
          <Button type="submit" variant="jade" loading={creating} className="shrink-0">
            {!creating && <Plus />} Create key
          </Button>
        </form>

        {freshKey && (
          <div className="rounded-xl border border-jade-100 bg-jade-50 p-3.5 animate-fade-up">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-jade-700">
              <ShieldCheck className="size-3.5" /> Copy your new key now; it won’t be shown again
            </p>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-jade-100 bg-card py-1 pl-3 pr-1">
              <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink">{freshKey}</code>
              <CopyButton text={freshKey} label="API key copied" />
            </div>
            <p className="mt-2 text-[12px] text-jade-700/80">The setup snippets on this page now include it.</p>
          </div>
        )}

        <div className="flex flex-col divide-y divide-line rounded-xl border border-line">
          {keys === null && (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          )}
          {keys !== null && active.length === 0 && (
            <p className="px-4 py-6 text-center text-[13px] text-ink-3">No active keys yet. Create one to connect an agent.</p>
          )}
          {active.map((k) => (
            <div key={k.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{k.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-3">
                  <code className="font-mono text-ink-2">{k.prefix}…</code>
                  <span>·</span>
                  <span>Created {fmtDate(k.createdAt)}</span>
                  <span>·</span>
                  <span className={cn(k.lastUsedAt && "text-jade-700")}>{relative(k.lastUsedAt)}</span>
                </p>
              </div>
              <Button size="sm" variant={confirming === k.id ? "danger" : "ghost"} onClick={() => revoke(k.id)} aria-label={`Revoke ${k.name}`}>
                {confirming === k.id ? (
                  <>
                    <TriangleAlert /> Confirm revoke
                  </>
                ) : (
                  <>
                    <Trash2 /> Revoke
                  </>
                )}
              </Button>
            </div>
          ))}
          {revoked.length > 0 && (
            <details className="group px-4 py-2.5 text-[12.5px] text-ink-3">
              <summary className="cursor-pointer select-none list-none hover:text-ink-2">
                <span className="group-open:hidden">Show</span>
                <span className="hidden group-open:inline">Hide</span> {revoked.length} revoked key{revoked.length === 1 ? "" : "s"}
              </summary>
              <ul className="mt-2 flex flex-col gap-1.5">
                {revoked.map((k) => (
                  <li key={k.id} className="flex items-center gap-2">
                    <span className="truncate line-through">{k.name}</span>
                    <code className="font-mono">{k.prefix}…</code>
                    <span className="ml-auto">revoked {fmtDate(k.revokedAt)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
        <p className="text-[12px] leading-relaxed text-ink-3">
          Keys are stored as SHA-256 hashes; Kept can’t show one again. Send it as <code className="rounded bg-paper-2 px-1 font-mono text-ink-2">Authorization: Bearer kept_sk_…</code>
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Connect snippets                                                    */
/* ------------------------------------------------------------------ */

function ConnectCard({ appUrl, apiKey }: { appUrl: string; apiKey: string | null }) {
  const key = apiKey ?? KEY_PLACEHOLDER;
  const mcpUrl = `${appUrl}/api/mcp`;
  const highlight = [key];

  const claudeCode = `claude mcp add --transport http kept ${mcpUrl} \\\n  --header "Authorization: Bearer ${key}"`;
  const jsonConfig = JSON.stringify({ mcpServers: { kept: { type: "http", url: mcpUrl, headers: { Authorization: `Bearer ${key}` } } } }, null, 2);
  const rpc = `curl -s ${mcpUrl} \\\n  -H "Authorization: Bearer ${key}" \\\n  -H "Content-Type: application/json" \\\n  -H "Accept: application/json, text/event-stream" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;
  const rest = `# List your pacts\ncurl -s ${appUrl}/api/pacts \\\n  -H "Authorization: Bearer ${key}"\n\n# Turn a brief into a draft pact with checkable criteria\ncurl -s ${appUrl}/api/ai/draft \\\n  -H "Authorization: Bearer ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"creatorRole":"client","amount":240,"sourceText":"Six Instagram captions for our holiday launch, 40-80 words each, with 3 hashtags, due Friday."}'`;

  const agent = `# A Claude agent that discovers Kept's tools over MCP and hires end-to-end
# (drafts the pact, signs it, and hands you the PayPal approval link).
KEPT_URL=${appUrl} \
  KEPT_API_KEY=${key} \
  ANTHROPIC_API_KEY=sk-ant-… \
  npm run agent -- "Hire a designer for 3 Instagram carousels for my yoga studio, $300, due in 10 days"`;

  const tabs = [
    { key: "claude-code", label: "Claude Code", icon: <Terminal />, title: "terminal", code: claudeCode, note: <>Run once in your terminal. Then ask Claude to <i>“hire someone with Kept escrow to …”</i>.</> },
    {
      key: "json",
      label: "Claude Desktop · JSON",
      icon: <Braces />,
      title: "claude_desktop_config.json",
      code: jsonConfig,
      note: <>Paste into your MCP client’s config (Claude Desktop, Cursor, VS Code, or any client that speaks Streamable HTTP), then restart it.</>,
    },
    { key: "rpc", label: "JSON-RPC", icon: <Terminal />, title: "curl · tools/list", code: rpc, note: <>The endpoint is stateless Streamable HTTP: every request is a self-contained JSON-RPC call.</> },
    {
      key: "agent",
      label: "Example agent",
      icon: <Bot />,
      title: "examples/agent-hire.ts",
      code: agent,
      note: <>Ships with the repo. It never moves money on its own: funding always ends at a PayPal approval link for a human.</>,
    },
    { key: "rest", label: "REST", icon: <Terminal />, title: "curl · REST", code: rest, note: <>The same key works on every REST endpoint below; auth resolves Bearer keys exactly like a session.</> },
  ];

  return (
    <Card className="flex min-w-0 flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-sky-50 p-1.5 text-sky-600">
            <Braces className="size-4" />
          </span>
          <CardTitle>Connect an agent</CardTitle>
          {apiKey ? <Badge tone="jade" className="ml-auto">Using your new key</Badge> : <Badge className="ml-auto">MCP · Streamable HTTP</Badge>}
        </div>
        <CardDescription>
          Kept is an MCP server at <code className="rounded bg-paper-2 px-1 font-mono text-[12px] text-ink-2">{mcpUrl}</code>. {apiKey ? "" : "Create a key and these snippets fill themselves in."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="claude-code" className="flex flex-col gap-3">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="w-max">
              {tabs.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.icon}
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {tabs.map((t) => (
            <TabsContent key={t.key} value={t.key} className="flex flex-col gap-2.5 outline-none">
              <CodeBlock code={t.code} title={t.title} highlight={highlight} />
              <p className="text-[12.5px] leading-relaxed text-ink-3">{t.note}</p>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
