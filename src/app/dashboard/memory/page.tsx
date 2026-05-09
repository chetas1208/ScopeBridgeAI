"use client";
import React, { useState, useEffect } from "react";
import { Database } from "lucide-react";
import type { HealthStatus } from "@/lib/types";

export default function MemoryPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(setHealth);
  }, []);

  const hydraConnected = health?.hydradb;

  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Memory Audit & Diffs</h1>
          <p className="page-subtitle mb-0">Review semantic memories stored in HydraDB and accept context merges.</p>
        </div>
      </div>

      <div className="glass-card p-6 text-center py-20">
        <Database className={`w-10 h-10 mx-auto mb-4 ${hydraConnected ? "text-[var(--accent-mint)]" : "text-[var(--text-muted)] opacity-50"}`} />
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
          {hydraConnected ? "Memory synced." : "HydraDB not configured."}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-6">
          {hydraConnected
            ? "No pending contradictions or new commitments requiring review. HydraDB is maintaining your 128k context pack securely."
            : "Add HYDRADB_API_KEY and HYDRADB_BASE_URL to .env.local to enable long-context organizational memory."}
        </p>
        <button
          className="btn-secondary px-6 py-2"
          disabled={!hydraConnected}
          title={hydraConnected ? undefined : "Configure HydraDB to enable this"}
        >
          View Memory Graph
        </button>
      </div>
    </div>
  );
}
