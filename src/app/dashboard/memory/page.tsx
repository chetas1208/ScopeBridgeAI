"use client";
import React from "react";
import { Database, GitMerge } from "lucide-react";

export default function MemoryPage() {
  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Memory Audit & Diffs</h1>
          <p className="page-subtitle mb-0">Review semantic memories stored in HydraDB and accept context merges.</p>
        </div>
      </div>

      <div className="glass-card p-6 text-center py-20">
        <Database className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Your memory is perfectly synced.</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-6">
          There are no pending contradictions or new commitments requiring your review. HydraDB is maintaining your 128k context pack securely.
        </p>
        <button className="btn-secondary px-6 py-2">View Memory Graph</button>
      </div>
    </div>
  );
}
