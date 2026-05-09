"use client";
import React, { useState, useEffect } from "react";
import { Activity, Play, Plus, Server, Mail, MessageSquare, Github, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { HealthStatus } from "@/lib/types";

export default function PulsePage() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditLog, setAuditLog] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(setHealth);
  }, []);

  async function runAudit() {
    setAuditRunning(true);
    setAuditLog(["Starting audit..."]);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceEvents: [], engineeringSignals: [] }),
      });
      const data = await res.json();
      if (data.ok) {
        setAuditLog([`Audit complete. Found ${data.risks.length} risk(s).`, "Redirecting to Insight Center..."]);
        setTimeout(() => router.push("/dashboard/insights"), 1200);
      } else {
        setAuditLog([`Audit failed: ${data.error}`]);
      }
    } catch {
      setAuditLog(["Network error during audit."]);
    } finally {
      setAuditRunning(false);
    }
  }

  const connectors = [
    { name: "Gmail", icon: <Mail className="w-5 h-5 text-red-400" />, bg: "bg-red-500/10", border: "border-red-500/20", key: "gmail" as keyof HealthStatus },
    { name: "Slack", icon: <MessageSquare className="w-5 h-5 text-purple-400" />, bg: "bg-purple-500/10", border: "border-purple-500/20", key: "slack" as keyof HealthStatus },
    { name: "GitHub", icon: <Github className="w-5 h-5 text-slate-300" />, bg: "bg-slate-500/10", border: "border-slate-500/20", key: "github" as keyof HealthStatus },
  ];

  const configured = health ? [health.gmail, health.slack, health.github].filter(Boolean).length : 0;
  const healthPct = health ? Math.round((configured / 3) * 100) : null;

  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">System Pulse</h1>
          <p className="page-subtitle mb-0">Overview of your DeliveryGuard environment and integrations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="btn-secondary px-4 py-2 flex items-center gap-2"
            onClick={() => router.push("/dashboard/sources")}
          >
            <Plus className="w-4 h-4" /> Inject Context
          </button>
          <button
            className="btn-primary px-4 py-2 flex items-center gap-2"
            onClick={runAudit}
            disabled={auditRunning}
          >
            {auditRunning ? <Loader2 className="w-4 h-4 spin" /> : <Play className="w-4 h-4" />}
            {auditRunning ? "Running..." : "Run Audit"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Connector Health", value: healthPct !== null ? `${healthPct}%` : "...", icon: <Activity className="text-emerald-400 w-5 h-5" /> },
          { label: "Database", value: health ? (health.database ? "Connected" : "None") : "...", icon: <Server className="text-rose-400 w-5 h-5" /> },
          { label: "Model Ready", value: health ? (health.model ? "Yes" : "No") : "...", icon: <Server className="text-cyan-400 w-5 h-5" /> },
          { label: "Demo Mode", value: health ? (health.demoMode ? "On" : "Off") : "...", icon: <Server className="text-amber-400 w-5 h-5" /> },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{stat.label}</span>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Connector Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {connectors.map((c) => {
          const isConnected = health ? !!health[c.key] : null;
          return (
            <div key={c.name} className="glass-card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg ${c.bg} ${c.border} border flex items-center justify-center`}>
                {c.icon}
              </div>
              <div>
                <div className="text-sm font-medium">{c.name}</div>
                {isConnected === null ? (
                  <div className="text-xs text-[var(--text-muted)]">Checking...</div>
                ) : isConnected ? (
                  <div className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Connected
                  </div>
                ) : (
                  <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" /> Not configured
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Recent Audit Stream</h2>
      <div className="glass-card p-4">
        {auditLog.length > 0 ? (
          <div className="font-mono text-xs space-y-1 p-2">
            {auditLog.map((line, i) => (
              <div key={i} className="text-[var(--accent-mint)]">{`> ${line}`}</div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-[var(--text-muted)] text-center py-10">
            No recent audits. Click &ldquo;Run Audit&rdquo; to analyze your connected sources.
          </div>
        )}
      </div>
    </div>
  );
}
