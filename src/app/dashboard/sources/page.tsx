"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plug, Plus, UploadCloud, RefreshCw, Mail, MessageSquare, Github, Loader2, Check, X, ChevronDown } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

interface ConnectorAccount {
  id: string;
  provider: string;
  status: string;
  updatedAt: string;
}

interface SlackChannel {
  id: string;
  name: string;
}

interface SlackMessage {
  ts: string;
  text: string;
  user?: string;
}

interface GmailMessage {
  id: string;
  subject?: string;
  from?: string;
  snippet?: string;
  date?: string;
}

interface GitHubRepo {
  full_name: string;
  name: string;
  private?: boolean;
}

type Provider = "gmail" | "slack" | "github";

// --- Simple Toast ---
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-500 text-white text-sm font-medium shadow-xl fade-in">
      {message}
    </div>
  );
}

// --- Disconnect button with inline confirm ---
function DisconnectButton({ onConfirm, loading }: { onConfirm: () => void; loading: boolean }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={() => { setConfirming(false); onConfirm(); }}
          className="px-2 py-1 text-xs rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3 h-3 spin inline" /> : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 py-1 text-xs rounded border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          Cancel
        </button>
      </span>
    );
  }
  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-1.5 text-xs rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors"
    >
      Disconnect
    </button>
  );
}

// --- Gmail expanded section ---
function GmailSection() {
  const [gmailQuery, setGmailQuery] = useState("");
  const [labels, setLabels] = useState("");
  const [maxResults, setMaxResults] = useState("25");
  const [fetching, setFetching] = useState(false);
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [error, setError] = useState("");

  async function fetchEmails() {
    setFetching(true);
    setError("");
    try {
      const res = await fetch("/api/integrations/gmail/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: gmailQuery || undefined,
          labelIds: labels ? labels.split(",").map(s => s.trim()).filter(Boolean) : undefined,
          maxResults: parseInt(maxResults, 10),
        }),
      });
      const data = await res.json();
      if (data.ok) setEmails(data.messages ?? []);
      else setError(data.error ?? "Failed to fetch emails.");
    } catch {
      setError("Network error.");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-3">
      <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Search Gmail</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-500/50"
          placeholder="e.g. from:client@company.com SSO"
          value={gmailQuery}
          onChange={e => setGmailQuery(e.target.value)}
        />
        <input
          className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-500/50"
          placeholder="Labels (comma-separated)"
          value={labels}
          onChange={e => setLabels(e.target.value)}
        />
        <select
          className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none"
          value={maxResults}
          onChange={e => setMaxResults(e.target.value)}
        >
          <option value="10">10 results</option>
          <option value="25">25 results</option>
          <option value="50">50 results</option>
        </select>
      </div>
      <button
        className="btn-primary px-4 py-2 flex items-center gap-2 text-sm"
        onClick={fetchEmails}
        disabled={fetching}
      >
        {fetching ? <Loader2 className="w-4 h-4 spin" /> : <Mail className="w-4 h-4" />}
        {fetching ? "Fetching..." : "Fetch Emails"}
      </button>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {emails.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {emails.map(m => (
            <div key={m.id} className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <div className="text-xs font-medium text-[var(--text-primary)] truncate">{m.subject ?? "(no subject)"}</div>
              <div className="text-xs text-[var(--text-muted)]">{m.from} &middot; {m.date}</div>
              {m.snippet && <div className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{m.snippet}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Slack expanded section ---
function SlackSection() {
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [fetching, setFetching] = useState(false);
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [error, setError] = useState("");

  async function loadChannels() {
    setLoadingChannels(true);
    try {
      const res = await fetch("/api/integrations/slack/channels");
      const data = await res.json();
      if (data.ok) setChannels(data.channels ?? []);
      else setError(data.error ?? "Failed to load channels.");
    } catch {
      setError("Network error.");
    } finally {
      setLoadingChannels(false);
    }
  }

  async function fetchMessages() {
    if (!selectedChannel) return;
    setFetching(true);
    setError("");
    try {
      const res = await fetch("/api/integrations/slack/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: selectedChannel, limit: 50 }),
      });
      const data = await res.json();
      if (data.ok) setMessages(data.messages ?? []);
      else setError(data.error ?? "Failed to fetch messages.");
    } catch {
      setError("Network error.");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-3">
      <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Fetch Slack Messages</h4>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          className="btn-secondary px-3 py-2 text-sm flex items-center gap-2"
          onClick={loadChannels}
          disabled={loadingChannels}
        >
          {loadingChannels ? <Loader2 className="w-4 h-4 spin" /> : <ChevronDown className="w-4 h-4" />}
          Load Channels
        </button>
        {channels.length > 0 && (
          <select
            className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none"
            value={selectedChannel}
            onChange={e => setSelectedChannel(e.target.value)}
          >
            <option value="">Select a channel</option>
            {channels.map(c => (
              <option key={c.id} value={c.id}>#{c.name}</option>
            ))}
          </select>
        )}
        {selectedChannel && (
          <button
            className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
            onClick={fetchMessages}
            disabled={fetching}
          >
            {fetching ? <Loader2 className="w-4 h-4 spin" /> : <MessageSquare className="w-4 h-4" />}
            {fetching ? "Fetching..." : "Fetch Messages"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {messages.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {messages.map(m => (
            <div key={m.ts} className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              {m.user && <div className="text-xs text-[var(--text-muted)] mb-1">{m.user}</div>}
              <div className="text-xs text-[var(--text-secondary)]">{m.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- GitHub expanded section ---
function GitHubSection() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [fetching, setFetching] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [error, setError] = useState("");

  async function loadRepos() {
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/integrations/github/repos");
      const data = await res.json();
      if (data.ok) setRepos(data.repos ?? []);
      else setError(data.error ?? "Failed to load repos.");
    } catch {
      setError("Network error.");
    } finally {
      setLoadingRepos(false);
    }
  }

  async function fetchRepoContext() {
    if (!selectedRepo) return;
    const [owner, repo] = selectedRepo.split("/");
    setFetching(true);
    setError("");
    try {
      const res = await fetch("/api/integrations/github/repo-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo }),
      });
      const data = await res.json();
      if (data.ok) {
        const lines: string[] = [];
        if (data.issues?.length) lines.push(`${data.issues.length} issues fetched`);
        if (data.prs?.length) lines.push(`${data.prs.length} pull requests fetched`);
        if (data.commits?.length) lines.push(`${data.commits.length} commits fetched`);
        setSummary(lines.join(", ") || "Context fetched successfully.");
      } else {
        setError(data.error ?? "Failed to fetch repo context.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-3">
      <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Fetch Repo Context</h4>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          className="btn-secondary px-3 py-2 text-sm flex items-center gap-2"
          onClick={loadRepos}
          disabled={loadingRepos}
        >
          {loadingRepos ? <Loader2 className="w-4 h-4 spin" /> : <Github className="w-4 h-4" />}
          Load Repos
        </button>
        {repos.length > 0 && (
          <select
            className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none"
            value={selectedRepo}
            onChange={e => setSelectedRepo(e.target.value)}
          >
            <option value="">Select a repo</option>
            {repos.map(r => (
              <option key={r.full_name} value={r.full_name}>{r.full_name}</option>
            ))}
          </select>
        )}
        {selectedRepo && (
          <button
            className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
            onClick={fetchRepoContext}
            disabled={fetching}
          >
            {fetching ? <Loader2 className="w-4 h-4 spin" /> : <Github className="w-4 h-4" />}
            {fetching ? "Fetching..." : "Fetch Repo Context"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {summary && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
          {summary}
        </div>
      )}
    </div>
  );
}

export default function SourcesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [connectors, setConnectors] = useState<ConnectorAccount[]>([]);
  const [loadingConnectors, setLoadingConnectors] = useState(true);
  const [disconnecting, setDisconnecting] = useState<Provider | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [text, setText] = useState("");
  const [injecting, setInjecting] = useState(false);
  const [injectMsg, setInjectMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadConnectors = useCallback(async () => {
    setLoadingConnectors(true);
    try {
      const res = await fetch("/api/connectors/status");
      const data = await res.json();
      setConnectors(data.connectors ?? []);
    } catch {
      setConnectors([]);
    } finally {
      setLoadingConnectors(false);
    }
  }, []);

  useEffect(() => {
    loadConnectors();
    const connected = searchParams.get("connected");
    if (connected) {
      setToast(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully`);
      router.replace("/dashboard/sources");
    }
  }, [loadConnectors, searchParams, router]);

  function isConnected(provider: Provider) {
    return connectors.some(c => c.provider === provider && c.status === "active");
  }

  async function disconnect(provider: Provider) {
    setDisconnecting(provider);
    try {
      await fetch("/api/connectors/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      await loadConnectors();
    } catch {
      // silently fail
    } finally {
      setDisconnecting(null);
    }
  }

  async function syncAll() {
    setSyncing(true);
    setSyncMsg("Syncing...");
    const connected: Provider[] = (["gmail", "slack", "github"] as Provider[]).filter(isConnected);
    if (connected.length === 0) {
      setSyncMsg("No connectors configured.");
      setSyncing(false);
      return;
    }
    try {
      await Promise.all(connected.map(s => fetch(`/api/sync/${s}`, { method: "POST" })));
      setSyncMsg(`Synced: ${connected.join(", ")}.`);
    } catch {
      setSyncMsg("Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function injectContext() {
    if (!text.trim()) return;
    setInjecting(true);
    setInjectMsg("");
    try {
      const res = await fetch("/api/ingest/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text.slice(0, 80), content: text }),
      });
      const data = await res.json();
      if (data.ok) {
        setInjectMsg("Context injected successfully.");
        setText("");
      } else {
        setInjectMsg(data.error ?? "Injection failed.");
      }
    } catch {
      setInjectMsg("Network error.");
    } finally {
      setInjecting(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  }

  const connectorDefs: { provider: Provider; label: string; icon: React.ReactNode; desc: string; bg: string; border: string }[] = [
    {
      provider: "gmail",
      label: "Gmail",
      icon: <Mail className="w-6 h-6 text-red-400" />,
      desc: "Sync client emails and promises.",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
    {
      provider: "slack",
      label: "Slack",
      icon: <MessageSquare className="w-6 h-6 text-purple-400" />,
      desc: "Sync internal discussions and blockers.",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      provider: "github",
      label: "GitHub",
      icon: <Github className="w-6 h-6 text-slate-300" />,
      desc: "Sync PRs, issues, and code reality.",
      bg: "bg-slate-500/10",
      border: "border-slate-500/20",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto fade-in">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Source Connectors</h1>
          <p className="page-subtitle mb-0">Connect external tools and upload manual context to fuel your ScopeBridge audits.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            className="btn-primary px-4 py-2 flex items-center gap-2"
            onClick={syncAll}
            disabled={syncing}
          >
            {syncing ? <Loader2 className="w-4 h-4 spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? "Syncing..." : "Sync All"}
          </button>
          {syncMsg && <p className="text-xs text-[var(--text-muted)]">{syncMsg}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {connectorDefs.map((c) => {
          const connected = isConnected(c.provider);
          const isDisconnecting = disconnecting === c.provider;
          return (
            <div key={c.provider} className="glass-card p-6 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${c.bg} ${c.border} border flex items-center justify-center`}>
                  {c.icon}
                </div>
                {connected ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Connected
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                    Not configured
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-base mb-1">{c.label}</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4 flex-1">{c.desc}</p>

              {loadingConnectors ? (
                <Loader2 className="w-4 h-4 spin text-[var(--text-muted)]" />
              ) : connected ? (
                <div className="flex items-center gap-2">
                  <button
                    className="btn-secondary flex-1 py-2 flex items-center justify-center gap-2 text-sm"
                    onClick={() => fetch(`/api/sync/${c.provider}`, { method: "POST" })}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Sync
                  </button>
                  <DisconnectButton
                    onConfirm={() => disconnect(c.provider)}
                    loading={isDisconnecting}
                  />
                </div>
              ) : (
                <a
                  href={`/api/integrations/${c.provider}/connect`}
                  className="btn-secondary w-full py-2 flex items-center justify-center gap-2 text-sm"
                >
                  <Plug className="w-3.5 h-3.5" /> Connect
                </a>
              )}

              {connected && c.provider === "gmail" && <GmailSection />}
              {connected && c.provider === "slack" && <SlackSection />}
              {connected && c.provider === "github" && <GitHubSection />}
            </div>
          );
        })}
      </div>

      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Manual Context Injection</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="glass-card p-6 border-dashed border-2 hover:border-purple-500/50 cursor-pointer transition-colors flex flex-col items-center justify-center text-center h-48"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.csv,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFile}
          />
          <UploadCloud className="w-8 h-8 text-[var(--text-muted)] mb-3" />
          {fileName ? (
            <>
              <h3 className="font-medium text-sm text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> {fileName}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">Click to replace</p>
            </>
          ) : (
            <>
              <h3 className="font-medium text-sm">Upload Documents or Images</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">PDF, TXT, CSV, JPG, PNG up to 10MB</p>
            </>
          )}
        </div>
        <div className="glass-card p-6 flex flex-col">
          <h3 className="font-medium text-sm mb-3">Paste Code or Text</h3>
          <textarea
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg p-3 text-xs font-mono resize-none flex-1 focus:outline-none focus:border-purple-500/50 text-[var(--text-primary)]"
            placeholder="Paste snippets, meeting notes, or PRDs here..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          {injectMsg && (
            <p className={`text-xs mt-1 ${injectMsg.includes("success") ? "text-emerald-400" : "text-rose-400"}`}>
              {injectMsg}
            </p>
          )}
          <button
            className="btn-secondary w-full py-2 mt-3 flex items-center justify-center gap-2"
            onClick={injectContext}
            disabled={injecting || !text.trim()}
          >
            {injecting ? <Loader2 className="w-4 h-4 spin" /> : <Plus className="w-4 h-4" />}
            {injecting ? "Injecting..." : "Inject Context"}
          </button>
        </div>
      </div>
    </div>
  );
}
