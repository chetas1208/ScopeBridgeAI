"use client";
import React from "react";
import type { DeliveryRisk } from "@/lib/types";
import { ShieldAlert, AlertTriangle, GitCompare, Ban, Clock, UserX, BookX } from "lucide-react";

const TYPE_ICON: Record<string, React.ReactNode> = {
  missing_ticket: <AlertTriangle className="w-3.5 h-3.5" />,
  scope_drift: <GitCompare className="w-3.5 h-3.5" />,
  contradiction: <ShieldAlert className="w-3.5 h-3.5" />,
  blocker: <Ban className="w-3.5 h-3.5" />,
  deadline_risk: <Clock className="w-3.5 h-3.5" />,
  ownership_gap: <UserX className="w-3.5 h-3.5" />,
  forgotten_commitment: <BookX className="w-3.5 h-3.5" />,
};
const TYPE_LABEL: Record<string, string> = {
  missing_ticket: "Missing Ticket", scope_drift: "Scope Drift", contradiction: "Contradiction",
  blocker: "Blocker", deadline_risk: "Deadline Risk", ownership_gap: "Ownership Gap", forgotten_commitment: "Forgotten Commitment",
};
const SEV_BADGE: Record<string, string> = { critical: "badge-critical", high: "badge-high", medium: "badge-medium", low: "badge-low" };

interface Props {
  risks: DeliveryRisk[];
  selectedRiskId: string | null;
  onSelect: (risk: DeliveryRisk) => void;
}

export default function RiskColumn({ risks, selectedRiskId, onSelect }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="col-header">
        <span className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          Delivery Risks
          <span className="text-[10px] font-mono text-[var(--text-muted)]">({risks.length})</span>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {risks.length === 0 && (
          <div className="p-6 text-center">
            <ShieldAlert className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
            <p className="text-xs text-[var(--text-muted)]">No risks detected yet.</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Add sources and run an audit.</p>
          </div>
        )}
        {risks.map(r => (
          <div key={r.id} onClick={() => onSelect(r)} className={`card mx-2 my-1.5 p-3 cursor-pointer ${selectedRiskId === r.id ? "card-selected" : ""}`}>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`badge ${SEV_BADGE[r.severity]}`}>{r.severity}</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                {TYPE_ICON[r.type]} {TYPE_LABEL[r.type] || r.type}
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)] ml-auto">{Math.round(r.confidence * 100)}%</span>
            </div>
            <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-1.5 leading-tight">{r.title}</h3>
            <div className="space-y-1.5">
              <div className="bg-blue-500/5 rounded px-2.5 py-1.5 border border-blue-500/10">
                <p className="text-[9px] font-semibold text-blue-400 uppercase tracking-wider mb-0.5">Client Promise</p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">{r.clientPromise}</p>
              </div>
              <div className="bg-red-500/5 rounded px-2.5 py-1.5 border border-red-500/10">
                <p className="text-[9px] font-semibold text-red-400 uppercase tracking-wider mb-0.5">Engineering Reality</p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">{r.engineeringReality}</p>
              </div>
            </div>
            <div className="mt-2 bg-emerald-500/5 rounded px-2.5 py-1.5 border border-emerald-500/10">
              <p className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider mb-0.5">Action</p>
              <p className="text-[11px] text-[var(--text-secondary)]">{r.recommendedAction}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
