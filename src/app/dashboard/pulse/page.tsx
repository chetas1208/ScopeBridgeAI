"use client";
import React from "react";
import { Activity, Play, Plus, Server, Mail, MessageSquare, Github } from "lucide-react";

export default function PulsePage() {
  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">System Pulse</h1>
          <p className="page-subtitle mb-0">Overview of your DeliveryGuard environment and integrations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary px-4 py-2 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Inject Context
          </button>
          <button className="btn-primary px-4 py-2 flex items-center gap-2">
            <Play className="w-4 h-4" /> Run Audit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Overall Health", value: "98%", icon: <Activity className="text-emerald-400 w-5 h-5" /> },
          { label: "Active Risks", value: "3", icon: <Server className="text-rose-400 w-5 h-5" /> },
          { label: "Context Tokens", value: "24.5k", icon: <Server className="text-cyan-400 w-5 h-5" /> },
          { label: "Pending Actions", value: "2", icon: <Server className="text-amber-400 w-5 h-5" /> },
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
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <Mail className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="text-sm font-medium">Gmail</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Connected</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
            <MessageSquare className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-medium">Slack</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Connected</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center border border-slate-500/20">
            <Github className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <div className="text-sm font-medium">GitHub</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Connected</div>
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Recent Audit Stream</h2>
      <div className="glass-card p-4">
        <div className="text-sm text-[var(--text-muted)] text-center py-10">
          No recent audits found. Click "Run Audit" to analyze your connected sources.
        </div>
      </div>
    </div>
  );
}
