"use client";
import React, { useState, useEffect, useRef } from "react";
import { Plug, Plus, UploadCloud, RefreshCw, Mail, MessageSquare, Github, Loader2, Check } from "lucide-react";
import type { HealthStatus } from "@/lib/types";

export default function SourcesPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [text, setText] = useState("");
  const [injecting, setInjecting] = useState(false);
  const [injectMsg, setInjectMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(setHealth);
  }, []);

  async function syncAll() {
    setSyncing(true);
    setSyncMsg("Syncing...");
    const sources = (["gmail", "slack", "github"] as const).filter(
      s => health?.[s as keyof HealthStatus]
    );
    if (sources.length === 0) {
      setSyncMsg("No connectors configured. Add API keys to .env.local.");
      setSyncing(false);
      return;
    }
    try {
      await Promise.all(sources.map(s => fetch(`/api/sync/${s}`, { method: "POST" })));
      setSyncMsg(`Synced: ${sources.join(", ")}.`);
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
        setInjectMsg(data.error || "Injection failed.");
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

  const connectors = [
    { name: "Gmail", icon: <Mail className="w-6 h-6 text-red-400" />, desc: "Sync client emails and promises.", bg: "bg-red-500/10", border: "border-red-500/20", key: "gmail" as keyof HealthStatus },
    { name: "Slack", icon: <MessageSquare className="w-6 h-6 text-purple-400" />, desc: "Sync internal discussions and blockers.", bg: "bg-purple-500/10", border: "border-purple-500/20", key: "slack" as keyof HealthStatus },
    { name: "GitHub", icon: <Github className="w-6 h-6 text-slate-300" />, desc: "Sync PRs, issues, and code reality.", bg: "bg-slate-500/10", border: "border-slate-500/20", key: "github" as keyof HealthStatus },
  ];

  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Source Connectors</h1>
          <p className="page-subtitle mb-0">Connect external tools and upload manual context to fuel your DeliveryGuard audits.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {connectors.map((c) => {
          const connected = health ? !!health[c.key] : null;
          return (
            <div key={c.name} className="glass-card p-6 flex flex-col">
              <div className={`w-12 h-12 rounded-xl ${c.bg} ${c.border} border flex items-center justify-center mb-4`}>
                {c.icon}
              </div>
              <h3 className="font-semibold text-base mb-1">{c.name}</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6 flex-1">{c.desc}</p>
              <button
                className="btn-secondary w-full py-2 flex items-center justify-center gap-2"
                disabled={connected === null}
              >
                {connected === null ? (
                  <Loader2 className="w-3 h-3 spin" />
                ) : connected ? (
                  <><span className="w-2 h-2 rounded-full bg-emerald-400" /> Connected</>
                ) : (
                  <><Plug className="w-3 h-3" /> Configure in .env.local</>
                )}
              </button>
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
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg p-3 text-xs font-mono resize-none flex-1 focus:outline-none focus:border-purple-500/50"
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
