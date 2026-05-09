"use client";
import React from "react";
import { Zap, CheckCircle2 } from "lucide-react";

export default function ActionsPage() {
  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Action Center</h1>
          <p className="page-subtitle mb-0">Review and approve AI-generated action drafts to execute across your tools.</p>
        </div>
      </div>

      <div className="glass-card p-6 text-center py-20">
        <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Inbox Zero</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
          You have no pending action drafts to approve. Run a new audit to generate GitHub issues, Slack escalations, or client emails.
        </p>
      </div>
    </div>
  );
}
