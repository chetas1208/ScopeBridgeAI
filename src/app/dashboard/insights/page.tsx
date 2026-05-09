"use client";
import React, { useState } from "react";
import { ShieldAlert, Info, Loader2 } from "lucide-react";
import type { DeliveryRisk } from "@/lib/types";

const SEV_COLOR: Record<string, string> = {
  critical: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  high: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  low: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
};

export default function InsightsPage() {
  const [query, setQuery] = useState("");
  const [risks, setRisks] = useState<DeliveryRisk[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function queryContext() {
    if (!query.trim()) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceEvents: [{
            id: "query-1",
            projectId: "proj-1",
            sourceType: "manual",
            title: query.slice(0, 80),
            content: query,
            author: "User",
            occurredAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          }],
          engineeringSignals: [],
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRisks(data.risks);
        if (data.risks.length === 0) setMsg("No risks detected for this context.");
      } else {
        setMsg(data.error || "Audit failed.");
      }
    } catch {
      setMsg("Network error.");
    } finally {
      setLoading(false);
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
          {risks.length === 0 ? (
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
              <ShieldAlert className="w-8 h-8 text-[var(--text-muted)] mb-3 opacity-50" />
              <h3 className="text-sm font-medium text-[var(--text-primary)]">No Active Risks</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm">
                {msg || "We haven't detected any contradictions or missing tickets in your recent context stream."}
              </p>
            </div>
          ) : (
            risks.map(risk => (
              <div key={risk.id} className="glass-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{risk.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium shrink-0 ${SEV_COLOR[risk.severity] ?? SEV_COLOR.low}`}>
                    {risk.severity}
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)] font-medium">Client Promise: </span>
                    <span className="text-[var(--text-secondary)]">{risk.clientPromise}</span>
                  </div>
                  <div className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)] font-medium">Engineering Reality: </span>
                    <span className="text-[var(--text-secondary)]">{risk.engineeringReality}</span>
                  </div>
                  <div className="text-[var(--text-muted)] italic">&ldquo;{risk.evidenceQuote}&rdquo;</div>
                </div>
                <div className="text-xs text-[var(--accent-lavender)]">Action: {risk.recommendedAction}</div>
              </div>
            ))
          )}
        </div>
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">Ask ScopeBridge</h3>
            <textarea
              placeholder="Ask about a specific client promise..."
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm resize-none mb-3 focus:outline-none focus:border-purple-500/50"
              rows={4}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button
              className="btn-secondary w-full py-2 flex items-center justify-center gap-2"
              onClick={queryContext}
              disabled={loading || !query.trim()}
            >
              {loading && <Loader2 className="w-4 h-4 spin" />}
              {loading ? "Analyzing..." : "Query Context"}
            </button>
          </div>
          <div className="glass-card p-5 bg-indigo-500/5 border-indigo-500/20">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-2">
              <Info className="w-3.5 h-3.5" /> Context Window
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Insights are generated using up to 128,000 tokens of recent context, prioritized by HydraDB&apos;s semantic recall engine.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
