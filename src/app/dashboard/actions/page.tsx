"use client";
import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Mail, MessageSquare, Github, Brain, Loader2, Pencil, X, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

interface RiskSummary {
  id: string;
  title: string;
  severity: string;
  category?: string;
  status: string;
}

interface ActionDraft {
  id: string;
  riskId?: string;
  type: string;
  title: string;
  body: string;
  target?: string;
  status: string;
  requiresConfirmation: boolean;
  risk?: RiskSummary;
  createdAt: string;
}

interface ExecuteResult {
  ok: boolean;
  externalUrl?: string;
  error?: string;
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  client_email: { label: "Email", icon: <Mail className="w-3.5 h-3.5" />, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  slack_escalation: { label: "Slack", icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  github_issue: { label: "GitHub Issue", icon: <Github className="w-3.5 h-3.5" />, color: "text-slate-300 bg-slate-500/10 border-slate-500/30" },
  pm_summary: { label: "Memory Update", icon: <Brain className="w-3.5 h-3.5" />, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
};

const SEV_COLOR: Record<string, string> = {
  critical: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  high: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  low: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
};

function DraftCard({ draft, onRemove }: { draft: ActionDraft; onRemove: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(draft.title);
  const [editBody, setEditBody] = useState(draft.body);
  const [editTarget, setEditTarget] = useState(draft.target ?? "");
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [result, setResult] = useState<ExecuteResult | null>(null);

  const meta = TYPE_META[draft.type] ?? TYPE_META.pm_summary;

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/action-drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, body: editBody, target: editTarget || undefined }),
      });
      setEditing(false);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function execute() {
    setExecuting(true);
    try {
      const res = await fetch("/api/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id }),
      });
      const data = await res.json() as ExecuteResult;
      setResult(data);
      if (data.ok) setTimeout(() => onRemove(draft.id), 2000);
    } catch {
      setResult({ ok: false, error: "Network error." });
    } finally {
      setExecuting(false);
    }
  }

  async function reject() {
    setRejecting(true);
    try {
      await fetch(`/api/action-drafts/${draft.id}`, { method: "DELETE" });
      onRemove(draft.id);
    } catch {
      setRejecting(false);
    }
  }

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded border font-medium flex items-center gap-1 ${meta.color}`}>
              {meta.icon} {meta.label}
            </span>
            {draft.risk && (
              <span className={`text-xs px-2 py-0.5 rounded border ${SEV_COLOR[draft.risk.severity] ?? SEV_COLOR.low}`}>
                {draft.risk.title.length > 30 ? draft.risk.title.slice(0, 30) + "..." : draft.risk.title}
              </span>
            )}
          </div>
          {editing ? (
            <input
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-500/50"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
            />
          ) : (
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{editTitle}</h3>
          )}
          {(draft.target || editing) && (
            editing ? (
              <input
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--text-muted)] focus:outline-none focus:border-purple-500/50"
                placeholder="Target (email, channel, repo...)"
                value={editTarget}
                onChange={e => setEditTarget(e.target.value)}
              />
            ) : (
              <p className="text-xs text-[var(--text-muted)]">{draft.target}</p>
            )
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing(e => !e)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)]"
            aria-label="Toggle body"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg p-3">
          {editing ? (
            <textarea
              className="w-full bg-transparent text-xs text-[var(--text-secondary)] resize-none focus:outline-none min-h-[80px]"
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
            />
          ) : (
            <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap">{editBody}</p>
          )}
        </div>
      )}

      {editing && (
        <button
          className="btn-primary px-3 py-1.5 text-xs flex items-center gap-2"
          onClick={save}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-3 h-3 spin" /> : <></>}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      )}

      {result && (
        <div className={`p-3 rounded-lg text-xs border ${result.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}>
          {result.ok ? (
            <span className="flex items-center gap-2">
              Executed successfully.
              {result.externalUrl && (
                <a href={result.externalUrl} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1">
                  View <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </span>
          ) : (
            `Failed: ${result.error}`
          )}
        </div>
      )}

      {!result && (
        <div className="flex items-center gap-2 pt-1">
          <button
            className="btn-primary px-3 py-1.5 text-xs flex items-center gap-2"
            onClick={execute}
            disabled={executing}
          >
            {executing ? <Loader2 className="w-3 h-3 spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {executing ? "Executing..." : "Approve & Execute"}
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-rose-500/40 hover:text-rose-400 transition-colors disabled:opacity-40"
            onClick={reject}
            disabled={rejecting}
          >
            {rejecting ? <Loader2 className="w-3 h-3 spin" /> : <X className="w-3 h-3" />}
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

function groupByType(drafts: ActionDraft[]): Map<string, ActionDraft[]> {
  const map = new Map<string, ActionDraft[]>();
  for (const d of drafts) {
    const key = d.type;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  return map;
}

export default function ActionsPage() {
  const [drafts, setDrafts] = useState<ActionDraft[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/action-drafts");
      const data = await res.json();
      setDrafts(data.drafts ?? []);
    } catch {
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  function removeDraft(id: string) {
    setDrafts(prev => prev.filter(d => d.id !== id));
  }

  const grouped = groupByType(drafts);

  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Action Center</h1>
          <p className="page-subtitle mb-0">Review and approve AI-generated action drafts to execute across your tools.</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 spin text-[var(--text-muted)]" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="glass-card p-6 text-center py-20">
          <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Inbox Zero</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            You have no pending action drafts to approve. Run a new audit to generate GitHub issues, Slack escalations, or client emails.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([type, items]) => {
            const meta = TYPE_META[type] ?? TYPE_META.pm_summary;
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.color}`}>
                    {meta.icon} {meta.label}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{items.length} draft{items.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-3">
                  {items.map(d => (
                    <DraftCard key={d.id} draft={d} onRemove={removeDraft} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
