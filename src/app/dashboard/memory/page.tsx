"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Database, Search, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface MemorySnapshot {
  id: string;
  kind: string;
  text: string;
  confidence: number;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

interface SessionMemory {
  id: string;
  kind: string;
  text: string;
  createdAt: string;
}

const KIND_COLOR: Record<string, string> = {
  commitment: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  project_fact: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  risk_pattern: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  decision: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  context: "text-[var(--accent-lavender)] bg-purple-500/10 border-purple-500/30",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  accepted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  rejected: "text-[var(--text-muted)] bg-[var(--bg-primary)] border-[var(--border-subtle)]",
};

function kindColor(kind: string) {
  return KIND_COLOR[kind] ?? "text-[var(--text-muted)] bg-[var(--bg-primary)] border-[var(--border-subtle)]";
}

function SnapshotCard({ snap, onAction }: { snap: MemorySnapshot; onAction: (id: string, action: "accept" | "reject") => void }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);

  async function act(action: "accept" | "reject") {
    setLoading(action);
    try {
      await fetch(`/api/memory/snapshots/${snap.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      onAction(snap.id, action);
    } catch {
      // silently fail
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="glass-card p-4 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${kindColor(snap.kind)}`}>
              {snap.kind.replace(/_/g, " ")}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLOR[snap.status] ?? STATUS_COLOR.pending}`}>
              {snap.status}
            </span>
            <span className="text-xs text-[var(--text-muted)]">{snap.confidence}% confidence</span>
          </div>
          <p className={`text-xs text-[var(--text-secondary)] ${expanded ? "" : "line-clamp-2"}`}>
            {snap.text}
          </p>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="shrink-0 p-1 rounded hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)]"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {snap.status === "pending" && (
        <div className="flex items-center gap-2 pt-1">
          <button
            className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            onClick={() => act("accept")}
            disabled={!!loading}
          >
            {loading === "accept" ? <Loader2 className="w-3 h-3 spin" /> : null}
            Accept
          </button>
          <button
            className="px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-rose-400 hover:border-rose-500/30 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            onClick={() => act("reject")}
            disabled={!!loading}
          >
            {loading === "reject" ? <Loader2 className="w-3 h-3 spin" /> : null}
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

export default function MemoryPage() {
  const [snapshots, setSnapshots] = useState<MemorySnapshot[]>([]);
  const [sessionMemory, setSessionMemory] = useState<SessionMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<string>("");

  const loadMemory = useCallback(async () => {
    setLoading(true);
    try {
      const [memRes, snapRes] = await Promise.all([
        fetch("/api/memory").then(r => r.json()),
        fetch("/api/memory/snapshots").then(r => r.json()),
      ]);
      setSessionMemory(memRes.sessionMemory ?? []);
      setSnapshots(snapRes.snapshots ?? []);
    } catch {
      // silently retain empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMemory(); }, [loadMemory]);

  function handleSnapshotAction(id: string, action: "accept" | "reject") {
    setSnapshots(prev => prev.map(s =>
      s.id === id ? { ...s, status: action === "accept" ? "accepted" : "rejected" } : s
    ));
  }

  async function searchMemory() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults("");
    try {
      const res = await fetch("/api/memory/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      setSearchResults(data.results ?? "No results found.");
    } catch {
      setSearchResults("Network error during search.");
    } finally {
      setSearching(false);
    }
  }

  const pendingSnaps = snapshots.filter(s => s.status === "pending");
  const acceptedSnaps = snapshots.filter(s => s.status === "accepted");
  const allSnaps = [...pendingSnaps, ...acceptedSnaps, ...snapshots.filter(s => s.status === "rejected")];

  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Memory Audit</h1>
          <p className="page-subtitle mb-0">Review semantic memories stored in HydraDB and accept context merges.</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 spin text-[var(--text-muted)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Long-term Memory */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Long-term Memory</h2>
            {allSnaps.length === 0 ? (
              <div className="glass-card p-6 flex flex-col items-center justify-center text-center py-16">
                <Database className="w-10 h-10 mx-auto mb-4 text-[var(--accent-mint)]" />
                <h3 className="text-base font-medium text-[var(--text-primary)] mb-2">Perfectly synced.</h3>
                <p className="text-sm text-[var(--text-secondary)] max-w-xs">
                  No pending contradictions or new commitments requiring review. HydraDB is maintaining your context securely.
                </p>
              </div>
            ) : (
              <>
                {pendingSnaps.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-400 font-medium uppercase tracking-wider">{pendingSnaps.length} pending review</p>
                    {pendingSnaps.map(s => (
                      <SnapshotCard key={s.id} snap={s} onAction={handleSnapshotAction} />
                    ))}
                  </div>
                )}
                {acceptedSnaps.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider">{acceptedSnaps.length} accepted</p>
                    {acceptedSnaps.map(s => (
                      <SnapshotCard key={s.id} snap={s} onAction={handleSnapshotAction} />
                    ))}
                  </div>
                )}
              </>
            )}
            <button
              className="btn-secondary px-4 py-2 w-full mt-2"
              disabled={acceptedSnaps.length === 0}
              title={acceptedSnaps.length === 0 ? "No accepted memories yet" : undefined}
            >
              View Memory Graph
            </button>
          </div>

          {/* Session Memory and Search */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Session Memory &amp; Search</h2>

            {sessionMemory.length > 0 ? (
              <div className="glass-card p-4 space-y-2 max-h-72 overflow-y-auto">
                {sessionMemory.slice(0, 10).map(m => (
                  <div key={m.id} className="flex items-start gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 ${kindColor(m.kind)}`}>
                      {m.kind.replace(/_/g, " ")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{m.text}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-4 text-center py-8">
                <p className="text-xs text-[var(--text-muted)]">No session memory yet. Run an audit to populate.</p>
              </div>
            )}

            <div className="glass-card p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Search All Context</h3>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-500/50"
                  placeholder="Search all context..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchMemory()}
                />
                <button
                  className="btn-primary px-3 py-2 flex items-center gap-2 shrink-0"
                  onClick={searchMemory}
                  disabled={searching || !searchQuery.trim()}
                >
                  {searching ? <Loader2 className="w-4 h-4 spin" /> : <Search className="w-4 h-4" />}
                  {searching ? "" : "Search"}
                </button>
              </div>
              {searchResults && (
                <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] whitespace-pre-wrap max-h-52 overflow-y-auto">
                  {searchResults}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
