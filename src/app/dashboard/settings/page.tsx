"use client";
import React from "react";
import { Settings, Shield, Key } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle mb-0">Manage your workspace, token budget, and integration scopes.</p>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-semibold">Workspace Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Workspace Name</label>
              <input type="text" defaultValue="Acme Corp Delivery" className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Context Token Budget</label>
              <select className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-500/50">
                <option>128,000 (Maximum)</option>
                <option>64,000 (Optimized)</option>
                <option>32,000 (Fast)</option>
              </select>
            </div>
            <button className="btn-primary px-4 py-2 mt-2">Save Changes</button>
          </div>
        </div>

        <div className="glass-card p-6 border-rose-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-semibold text-rose-400">Danger Zone</h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-4">Disconnect all integrations and wipe cached source data from this workspace. This action cannot be undone.</p>
          <button className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-sm font-medium hover:bg-rose-500/20 transition-colors">
            Wipe Workspace Data
          </button>
        </div>
      </div>
    </div>
  );
}
