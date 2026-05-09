"use client";
import React, { useState, useEffect, useCallback } from "react";
import { ShieldAlert, Info, Loader2, ChevronDown, ChevronUp, X, CheckSquare } from "lucide-react";

interface RiskEvidence {
  id: string;
  kind: string;
  quote: string;
  sourceLabel?: string;
}

interface ActionDraftSummary {
  id: string;
  type: string;
  title: string;
  status: string;
}

interface DeliveryRisk {
  id: string;
  workspaceId: string;
  type: string;
  severity: string;
  category?: string;
  title: string;
  clientPromise: string;
  engineeringReality: string;
  evidenceQuote: string;
  confidence: number;
  recommendedAction: string;
  missingInformation?: string;
  status: string;
  evidence: RiskEvidence[];
  actionDrafts: ActionDraftSummary[];
  createdAt: string;
}

const SEV_COLOR: Record<string, string> = {
  critical: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  high: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  low: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
};

function RiskCard({ risk, onDismiss, onReviewed }: {
  risk: DeliveryRisk;
  onDismiss: (id: string) => void;
  onReviewed: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  async function dismiss() {
    setDismissing(true);
    try {
      await fetch(`/api/risks/${risk.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      onDismiss(risk.id);
    } catch {
      setDismissing(false);
    }
  }

  async function markReviewed() {
    setReviewing(true);
    try {
      await fetch(`/api/risks/${risk.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewed" }),
      });
      onReviewed(risk.id);
    } catch {
      setReviewing(false);
    }
  }

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${SEV_COLOR[risk.severity] ?? SEV_COLOR.low}`}>
              {risk.severity}
            </span>
            {risk.category && (
              <span className="text-xs px-2 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-muted)]">
                {risk.category}
              </span>
            )}
            <span className="text-xs text-[var(--text-muted)]">{risk.confidence}% confidence</span>
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{risk.title}</h3>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="shrink-0 p-1 rounded hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)]"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 text-xs pt-1">
          <div className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)] font-medium">Client Promise: </span>
            <span className="text-[var(--text-secondary)]">{risk.clientPromise}</span>
          </div>
          <div className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)] font-medium">Engineering Reality: </span>
            <span className="text-[var(--text-secondary)]">{risk.engineeringReality}</span>
          </div>
          {risk.evidenceQuote && (
            <div className="text-[var(--text-muted)] italic p-2 border-l-2 border-[var(--border-active)]">
              &ldquo;{risk.evidenceQuote}&rdquo;
            </div>
          )}
          <div className="text-[var(--accent-lavender)]">
            <span className="font-medium">Recommended: </span>{risk.recommendedAction}
          </div>
          {risk.missingInformation && (
            <div className="text-amber-400/80">
              <span className="font-medium">Missing info: </span>{risk.missingInformation}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-emerald-500/40 hover:text-emerald-400 transition-colors disabled:opacity-40"
          onClick={markReviewed}
          disabled={reviewing}
        >
          {reviewing ? <Loader2 className="w-3 h-3 spin" /> : <CheckSquare className="w-3 h-3" />}
          Mark Reviewed
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-rose-500/40 hover:text-rose-400 transition-colors disabled:opacity-40"
          onClick={dismiss}
          disabled={dismissing}
        >
          {dismissing ? <Loader2 className="w-3 h-3 spin" /> : <X className="w-3 h-3" />}
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [risks, setRisks] = useState<DeliveryRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [querying, setQuerying] = useState(false);
  const [queryAnswer, setQueryAnswer] = useState("");
  const [tokenBudget, setTokenBudget] = useState<number | null>(null);

  const loadRisks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/risks?status=active");
      const data = await res.json() as { ok: boolean; risks: DeliveryRisk[] };
      if (data.ok) setRisks(data.risks ?? []);
    } catch {
      // silently retain empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRisks();
    fetch("/api/workspace")
      .then(r => r.json())
      .then((d: { workspace?: { tokenBudget?: number } }) => {
        if (d.workspace?.tokenBudget) setTokenBudget(d.workspace.tokenBudget);
      })
      .catch(() => null);
  }, [loadRisks]);

  function removeRisk(id: string) {
    setRisks(prev => prev.filter(r => r.id !== id));
  }

  async function queryContext() {
    if (!query.trim()) return;
    setQuerying(true);
    setQueryAnswer("");
    try {
      await fetch("/api/ingest/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: query.slice(0, 80), content: query, author: "User" }),
      });
      const auditRes = await fetch("/api/audit/run", { method: "POST" });
      if (!auditRes.body) {
        setQueryAnswer("No response from audit.");
        return;
      }
      const reader = auditRes.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const lines: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const block of parts) {
          for (const line of block.split("\n")) {
            if (line.startsWith("data: ")) lines.push(line.slice(6).trim());
          }
        }
      }
      setQueryAnswer(lines.join("\n") || "Audit complete. Check Insight Center for updated risks.");
      await loadRisks();
    } catch {
      setQueryAnswer("Network error during query.");
    } finally {
      setQuerying(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Insight Center</h1>
          <p className="page-subtitle mb-0">Delivery risks, contradictions, and scope drift detected by your AI model.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="glass-card p-6 flex items-center justify-center min-h-[200px]">
              <Loader2 className="w-6 h-6 spin text-[var(--text-muted)]" />
            </div>
          ) : risks.length === 0 ? (
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
              <ShieldAlert className="w-8 h-8 text-[var(--text-muted)] mb-3 opacity-50" />
              <h3 className="text-sm font-medium text-[var(--text-primary)]">No Active Risks</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm">
                No contradictions or missing tickets detected in your recent context stream.
              </p>
            </div>
          ) : (
            risks.map(risk => (
              <RiskCard
                key={risk.id}
                risk={risk}
                onDismiss={removeRisk}
                onReviewed={removeRisk}
              />
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">Ask ScopeBridge</h3>
            <textarea
              placeholder="Ask about a specific client promise or risk..."
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm resize-none mb-3 focus:outline-none focus:border-purple-500/50 text-[var(--text-primary)]"
              rows={4}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button
              className="btn-secondary w-full py-2 flex items-center justify-center gap-2"
              onClick={queryContext}
              disabled={querying || !query.trim()}
            >
              {querying && <Loader2 className="w-4 h-4 spin" />}
              {querying ? "Analyzing..." : "Query Context"}
            </button>
            {queryAnswer && (
              <div className="mt-3 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] whitespace-pre-wrap max-h-40 overflow-y-auto">
                {queryAnswer}
              </div>
            )}
          </div>

          <div className="glass-card p-5 bg-indigo-500/5 border-indigo-500/20">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-2">
              <Info className="w-3.5 h-3.5" /> Context Window
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {tokenBudget
                ? `Using up to ${tokenBudget.toLocaleString()} tokens of recent context, prioritized by HydraDB semantic recall.`
                : "Insights are generated using up to 128,000 tokens of recent context, prioritized by HydraDB’s semantic recall engine."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
