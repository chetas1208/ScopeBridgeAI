"use client";
import React from "react";
import { ShieldAlert, Info } from "lucide-react";

export default function InsightsPage() {
  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Insight Center</h1>
          <p className="page-subtitle mb-0">Delivery risks, contradictions, and scope drift detected by Kimi K2.6.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
            <ShieldAlert className="w-8 h-8 text-[var(--text-muted)] mb-3 opacity-50" />
            <h3 className="text-sm font-medium text-[var(--text-primary)]">No Active Risks</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm">
              We haven't detected any contradictions or missing tickets in your recent context stream.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">Ask ScopeBridge</h3>
            <textarea 
              placeholder="Ask about a specific client promise..." 
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm resize-none mb-3 focus:outline-none focus:border-purple-500/50"
              rows={4}
            />
            <button className="btn-secondary w-full py-2">Query Context</button>
          </div>
          <div className="glass-card p-5 bg-indigo-500/5 border-indigo-500/20">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-2"><Info className="w-3.5 h-3.5" /> Context Window</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Your insights are currently generated using up to 128,000 tokens of recent context, prioritized by HydraDB's semantic recall engine.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
