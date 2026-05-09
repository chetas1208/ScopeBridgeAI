"use client";
import React from "react";
import type { SourceEvent } from "@/lib/types";
import { Mail, MessageSquare, Github, Pencil, Upload, Check } from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  gmail: <Mail className="w-3.5 h-3.5" />, slack: <MessageSquare className="w-3.5 h-3.5" />,
  github: <Github className="w-3.5 h-3.5" />, manual: <Pencil className="w-3.5 h-3.5" />,
  upload: <Upload className="w-3.5 h-3.5" />,
};
const BADGE: Record<string, string> = {
  gmail: "badge-gmail", slack: "badge-slack", github: "badge-github", manual: "badge-manual", upload: "badge-upload",
};

interface Props {
  events: SourceEvent[];
  onToggle: (id: string) => void;
  onAddManual: (title: string, content: string, author: string) => void;
}

export default function SourceInbox({ events, onToggle, onAddManual }: Props) {
  const [showForm, setShowForm] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [author, setAuthor] = React.useState("");

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    onAddManual(title.trim(), content.trim(), author.trim() || "Manual Entry");
    setTitle(""); setContent(""); setAuthor(""); setShowForm(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="col-header">
        <span className="flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-blue-400" />
          Source Inbox
          <span className="text-[10px] font-mono text-[var(--text-muted)]">({events.length})</span>
        </span>
        <button onClick={() => setShowForm(!showForm)} className="btn-ghost px-2 py-1 text-[11px]">
          + Add
        </button>
      </div>

      {/* Manual input form */}
      {showForm && (
        <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] fade-in">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (e.g. Client email about SSO)" className="w-full px-3 py-2 mb-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none" />
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Paste email, Slack message, meeting notes, or any project context..." rows={3} className="w-full px-3 py-2 mb-2" />
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author (optional)" className="w-full px-3 py-2 mb-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!title.trim() || !content.trim()} className="btn-primary px-3 py-1.5 text-xs flex-1">Add Source</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost px-3 py-1.5 text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 && !showForm && (
          <div className="p-6 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-2">No sources yet.</p>
            <button onClick={() => setShowForm(true)} className="btn-secondary px-3 py-1.5 text-xs">+ Add manual input</button>
          </div>
        )}
        {events.map(ev => (
          <div key={ev.id} onClick={() => onToggle(ev.id)} className={`card mx-2 my-1.5 p-3 cursor-pointer ${ev.selected ? "card-selected" : ""}`}>
            <div className="flex items-start gap-2.5">
              <div className={`custom-checkbox mt-0.5 ${ev.selected ? "checked" : ""}`}>
                {ev.selected && <Check className="w-3 h-3 text-[var(--bg-primary)]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${BADGE[ev.sourceType] || "badge-manual"}`}>
                    {ICONS[ev.sourceType]} {ev.sourceType}
                  </span>
                </div>
                <p className="text-xs font-medium text-[var(--text-primary)] leading-tight mb-0.5 truncate">{ev.title}</p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">{ev.content.slice(0, 80)}{ev.content.length > 80 ? "…" : ""}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{ev.author}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
