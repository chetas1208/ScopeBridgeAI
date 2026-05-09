"use client";
import React from "react";
import { Plug, Plus, UploadCloud, RefreshCw, Mail, MessageSquare, Github } from "lucide-react";

export default function SourcesPage() {
  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Source Connectors</h1>
          <p className="page-subtitle mb-0">Connect external tools and upload manual context to fuel your DeliveryGuard audits.</p>
        </div>
        <button className="btn-primary px-4 py-2 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Sync All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[
          { name: "Gmail", icon: <Mail className="w-6 h-6 text-red-400" />, desc: "Sync client emails and promises.", status: "Connected", bg: "bg-red-500/10", border: "border-red-500/20" },
          { name: "Slack", icon: <MessageSquare className="w-6 h-6 text-purple-400" />, desc: "Sync internal discussions and blockers.", status: "Connected", bg: "bg-purple-500/10", border: "border-purple-500/20" },
          { name: "GitHub", icon: <Github className="w-6 h-6 text-slate-300" />, desc: "Sync PRs, issues, and code reality.", status: "Connected", bg: "bg-slate-500/10", border: "border-slate-500/20" },
        ].map((c, i) => (
          <div key={i} className="glass-card p-6 flex flex-col">
            <div className={`w-12 h-12 rounded-xl ${c.bg} ${c.border} border flex items-center justify-center mb-4`}>
              {c.icon}
            </div>
            <h3 className="font-semibold text-base mb-1">{c.name}</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6 flex-1">{c.desc}</p>
            <button className="btn-secondary w-full py-2 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> {c.status}
            </button>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Manual Context Injection</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 border-dashed border-2 hover:border-purple-500/50 cursor-pointer transition-colors flex flex-col items-center justify-center text-center h-48">
          <UploadCloud className="w-8 h-8 text-[var(--text-muted)] mb-3" />
          <h3 className="font-medium text-sm">Upload Documents or Images</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">PDF, TXT, CSV, JPG, PNG up to 10MB</p>
        </div>
        <div className="glass-card p-6 flex flex-col">
          <h3 className="font-medium text-sm mb-3">Paste Code or Text</h3>
          <textarea 
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg p-3 text-xs font-mono resize-none flex-1 focus:outline-none focus:border-purple-500/50"
            placeholder="Paste snippets, meeting notes, or PRDs here..."
          />
          <button className="btn-secondary w-full py-2 mt-3 flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Inject Context
          </button>
        </div>
      </div>
    </div>
  );
}
