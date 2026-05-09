"use client";
import React from "react";
import type { DeliveryRisk, GeneratedAction } from "@/lib/types";
import { Github, Mail, MessageSquare, FileText, Copy, Check, Loader2, Pencil } from "lucide-react";

interface Props {
  selectedRisk: DeliveryRisk | null;
  actions: GeneratedAction[];
  onGenerate: (type: "github_issue" | "client_email" | "slack_escalation") => void;
  isGenerating: boolean;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  github_issue: { icon: <Github className="w-3.5 h-3.5" />, label: "GitHub Issue Draft", color: "text-slate-300" },
  client_email: { icon: <Mail className="w-3.5 h-3.5" />, label: "Client Email", color: "text-blue-400" },
  slack_escalation: { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Slack Escalation", color: "text-purple-400" },
  pm_summary: { icon: <FileText className="w-3.5 h-3.5" />, label: "PM Summary", color: "text-amber-400" },
};

export default function ActionColumn({ selectedRisk, actions, onGenerate, isGenerating }: Props) {
  const [copied, setCopied] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editBody, setEditBody] = React.useState("");

  const handleCopy = (id: string, body: string) => {
    navigator.clipboard.writeText(body);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const startEdit = (a: GeneratedAction) => {
    setEditingId(a.id);
    setEditBody(a.body);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="col-header">
        <span className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          Actions
        </span>
      </div>

      {!selectedRisk && actions.length === 0 && (
        <div className="p-6 text-center flex-1 flex flex-col items-center justify-center">
          <FileText className="w-6 h-6 text-[var(--text-muted)] mb-2 opacity-40" />
          <p className="text-xs text-[var(--text-muted)]">Select a risk to generate actions.</p>
        </div>
      )}

      {selectedRisk && (
        <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">Selected Risk</p>
          <p className="text-xs font-medium text-[var(--text-primary)] mb-3">{selectedRisk.title}</p>
          <div className="flex flex-wrap gap-1.5">
            {(["github_issue", "client_email", "slack_escalation"] as const).map(type => {
              const cfg = TYPE_CONFIG[type];
              return (
                <button key={type} onClick={() => onGenerate(type)} disabled={isGenerating} className="btn-secondary px-2.5 py-1.5 text-[11px] inline-flex items-center gap-1.5">
                  {isGenerating ? <Loader2 className="w-3 h-3 spin" /> : cfg.icon}
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {actions.map(a => {
          const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.pm_summary;
          const isEditing = editingId === a.id;
          return (
            <div key={a.id} className="card mx-2 my-1.5 overflow-hidden fade-in">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                <span className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => isEditing ? setEditingId(null) : startEdit(a)} className="btn-ghost px-1.5 py-1" title="Edit">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleCopy(a.id, isEditing ? editBody : a.body)} className="btn-ghost px-1.5 py-1" title="Copy">
                    {copied === a.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-[var(--text-primary)] mb-1.5">{a.title}</p>
                {isEditing ? (
                  <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={10} className="w-full px-3 py-2" />
                ) : (
                  <pre className="text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap font-[Inter,sans-serif] leading-relaxed max-h-[300px] overflow-y-auto">{a.body}</pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
