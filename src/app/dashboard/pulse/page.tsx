"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Activity, Play, Plus, Mail, MessageSquare, Github, Loader2, Cpu, ShieldAlert, ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";

interface ConnectorAccount {
  id: string;
  provider: string;
  status: string;
  updatedAt: string;
}

interface ConnectorsResponse {
  ok: boolean;
  connectors: ConnectorAccount[];
}

interface RisksResponse {
  ok: boolean;
  risks: { id: string }[];
}

interface DraftsResponse {
  ok: boolean;
  drafts: { id: string }[];
}

interface HealthResponse {
  model?: string;
  demoMode?: boolean;
}

const PROVIDERS = ["gmail", "slack", "github"] as const;
type Provider = typeof PROVIDERS[number];

const PROVIDER_META: Record<Provider, { label: string; icon: React.ReactNode; bg: string; border: string }> = {
  gmail: {
    label: "Gmail",
    icon: <Mail className="w-5 h-5 text-red-400" />,
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  slack: {
    label: "Slack",
    icon: <MessageSquare className="w-5 h-5 text-purple-400" />,
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  github: {
    label: "GitHub",
    icon: <Github className="w-5 h-5 text-slate-300" />,
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
  },
};

export default function PulsePage() {
  const router = useRouter();
  const [connectors, setConnectors] = useState<ConnectorAccount[]>([]);
  const [riskCount, setRiskCount] = useState<number | null>(null);
  const [draftCount, setDraftCount] = useState<number | null>(null);
  const [modelLabel, setModelLabel] = useState<string>("...");
  const [loading, setLoading] = useState(true);
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditLog, setAuditLog] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [connRes, riskRes, draftRes, healthRes] = await Promise.all([
        fetch("/api/connectors/status").then(r => r.json()) as Promise<ConnectorsResponse>,
        fetch("/api/risks?status=active").then(r => r.json()) as Promise<RisksResponse>,
        fetch("/api/action-drafts").then(r => r.json()) as Promise<DraftsResponse>,
        fetch("/api/health").then(r => r.json()) as Promise<HealthResponse>,
      ]);
      setConnectors(connRes.connectors ?? []);
      setRiskCount(riskRes.risks?.length ?? 0);
      setDraftCount(draftRes.drafts?.length ?? 0);
      setModelLabel(healthRes.demoMode ? "Demo" : (healthRes.model ?? "Kimi K2.6"));
    } catch {
      // silently retain defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const configuredCount = PROVIDERS.filter(p =>
    connectors.some(c => c.provider === p && c.status === "active")
  ).length;

  async function runAudit() {
    setAuditRunning(true);
    setAuditLog(["Initializing audit..."]);
    try {
      const res = await fetch("/api/audit/run", { method: "POST" });
      if (!res.body) {
        setAuditLog(["No stream returned from server."]);
        setAuditRunning(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const block of parts) {
          let eventType = "message";
          let dataLine = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            if (line.startsWith("data: ")) dataLine = line.slice(6).trim();
          }
          if (dataLine) {
            if (eventType === "complete") {
              setAuditLog(prev => [...prev, "Audit complete. Redirecting to Insight Center..."]);
              setTimeout(() => router.push("/dashboard/insights"), 1200);
            } else if (eventType === "error") {
              setAuditLog(prev => [...prev, `Error: ${dataLine}`]);
            } else {
              setAuditLog(prev => [...prev, dataLine]);
            }
          }
        }
      }
    } catch {
      setAuditLog(prev => [...prev, "Network error during audit."]);
    } finally {
      setAuditRunning(false);
    }
  }

  const statCards = [
    {
      label: "Connector Health",
      value: loading ? "..." : `${configuredCount}/3`,
      icon: <Activity className="w-5 h-5 text-emerald-400" />,
    },
    {
      label: "Active Risks",
      value: riskCount === null ? "..." : String(riskCount),
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
    },
    {
      label: "Pending Actions",
      value: draftCount === null ? "..." : String(draftCount),
      icon: <ListChecks className="w-5 h-5 text-amber-400" />,
    },
    {
      label: "Model",
      value: loading ? "..." : modelLabel,
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">System Pulse</h1>
          <p className="page-subtitle mb-0">Overview of your ScopeBridge environment and integrations.</p>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{s.label}</span>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{s.value}</div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Connector Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {PROVIDERS.map((p) => {
          const meta = PROVIDER_META[p];
          const account = connectors.find(c => c.provider === p);
          const connected = account?.status === "active";
          return (
            <button
              key={p}
              className="glass-card p-4 flex items-center gap-4 text-left hover:cursor-pointer"
              onClick={() => router.push("/dashboard/sources")}
            >
              <div className={`w-10 h-10 rounded-lg ${meta.bg} ${meta.border} border flex items-center justify-center shrink-0`}>
                {meta.icon}
              </div>
              <div>
                <div className="text-sm font-medium">{meta.label}</div>
                {loading ? (
                  <div className="text-xs text-[var(--text-muted)]">Checking...</div>
                ) : connected ? (
                  <div className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Connected
                  </div>
                ) : (
                  <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" /> Not configured
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Recent Audit Stream</h2>
      <div className="glass-card p-4">
        {auditLog.length > 0 ? (
          <div className="font-mono text-xs space-y-1 p-2 max-h-60 overflow-y-auto">
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
