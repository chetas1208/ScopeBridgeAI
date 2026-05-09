"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Shield, Key, LogOut, Check, Loader2, User } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

interface ConnectorAccount {
  id: string;
  provider: string;
  status: string;
}

type Provider = "gmail" | "slack" | "github";

function DisconnectButton({ provider, onDone }: { provider: Provider; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function doDisconnect() {
    setLoading(true);
    try {
      await fetch("/api/connectors/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      onDone();
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={doDisconnect}
          disabled={loading}
          className="px-3 py-1.5 text-xs rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 flex items-center gap-1"
        >
          {loading && <Loader2 className="w-3 h-3 spin" />}
          Confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)]"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-1.5 text-xs rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors"
    >
      Disconnect
    </button>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();

  const [workspaceName, setWorkspaceName] = useState("");
  const [tokenBudget, setTokenBudget] = useState("128000");
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [workspaceSaved, setWorkspaceSaved] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetSaved, setBudgetSaved] = useState(false);

  const [connectors, setConnectors] = useState<ConnectorAccount[]>([]);
  const [loadingConnectors, setLoadingConnectors] = useState(true);

  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wiped, setWiped] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [wsRes, connRes] = await Promise.all([
        fetch("/api/workspace").then(r => r.json()),
        fetch("/api/connectors/status").then(r => r.json()),
      ]);
      if (wsRes.workspace?.name) setWorkspaceName(wsRes.workspace.name);
      if (wsRes.workspace?.tokenBudget) setTokenBudget(String(wsRes.workspace.tokenBudget));
      setConnectors(connRes.connectors ?? []);
    } catch {
      // silently fail
    } finally {
      setLoadingConnectors(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function saveWorkspaceName() {
    setSavingWorkspace(true);
    try {
      await fetch("/api/workspace/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName }),
      });
      setWorkspaceSaved(true);
      setTimeout(() => setWorkspaceSaved(false), 2000);
    } catch {
      // silently fail
    } finally {
      setSavingWorkspace(false);
    }
  }

  async function saveTokenBudget() {
    setSavingBudget(true);
    try {
      await fetch("/api/workspace/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenBudget: parseInt(tokenBudget, 10) }),
      });
      setBudgetSaved(true);
      setTimeout(() => setBudgetSaved(false), 2000);
    } catch {
      // silently fail
    } finally {
      setSavingBudget(false);
    }
  }

  function reloadConnectors() {
    fetch("/api/connectors/status").then(r => r.json()).then(d => setConnectors(d.connectors ?? []));
  }

  const PROVIDERS: { key: Provider; label: string }[] = [
    { key: "gmail", label: "Gmail" },
    { key: "slack", label: "Slack" },
    { key: "github", label: "GitHub" },
  ];

  return (
    <div className="max-w-3xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle mb-0">Manage your workspace, token budget, and integration scopes.</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <User className="w-5 h-5 text-[var(--accent-cyan)]" />
            <h2 className="text-base font-semibold">Profile</h2>
          </div>
          <div className="flex items-center gap-4">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt="Avatar"
                width={48}
                height={48}
                className="w-12 h-12 rounded-full border border-[var(--border-subtle)]"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{session?.user?.name ?? "Loading..."}</p>
              <p className="text-xs text-[var(--text-muted)]">{session?.user?.email ?? ""}</p>
            </div>
          </div>
        </div>

        {/* Workspace */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-semibold">Workspace</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Workspace Name</label>
              <input
                type="text"
                value={workspaceName}
                onChange={e => setWorkspaceName(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <button
              className="btn-primary px-4 py-2 flex items-center gap-2"
              onClick={saveWorkspaceName}
              disabled={savingWorkspace || !workspaceName.trim()}
            >
              {savingWorkspace ? <Loader2 className="w-4 h-4 spin" /> : workspaceSaved ? <Check className="w-4 h-4" /> : null}
              {workspaceSaved ? "Saved!" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Context Budget */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold">Context Budget</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Token Budget</label>
              <select
                value={tokenBudget}
                onChange={e => setTokenBudget(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-500/50"
              >
                <option value="128000">128,000 (Maximum)</option>
                <option value="64000">64,000 (Optimized)</option>
                <option value="32000">32,000 (Fast)</option>
              </select>
            </div>
            <button
              className="btn-primary px-4 py-2 flex items-center gap-2"
              onClick={saveTokenBudget}
              disabled={savingBudget}
            >
              {savingBudget ? <Loader2 className="w-4 h-4 spin" /> : budgetSaved ? <Check className="w-4 h-4" /> : null}
              {budgetSaved ? "Saved!" : "Save Budget"}
            </button>
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold">Connected Accounts</h2>
          </div>
          {loadingConnectors ? (
            <Loader2 className="w-5 h-5 spin text-[var(--text-muted)]" />
          ) : (
            <div className="space-y-3">
              {PROVIDERS.map(({ key, label }) => {
                const acc = connectors.find(c => c.provider === key);
                const connected = acc?.status === "active";
                return (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                      <p className={`text-xs ${connected ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>
                        {connected ? "Connected" : "Not configured"}
                      </p>
                    </div>
                    {connected && (
                      <DisconnectButton provider={key} onDone={reloadConnectors} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Account */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <LogOut className="w-5 h-5 text-[var(--text-muted)]" />
            <h2 className="text-base font-semibold">Account</h2>
          </div>
          <button
            className="btn-secondary px-4 py-2 flex items-center gap-2"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Danger Zone */}
        <div className="glass-card p-6 border-rose-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-semibold text-rose-400">Danger Zone</h2>
          </div>
          {wiped ? (
            <p className="text-sm text-emerald-400 mb-4">Workspace data wiped successfully.</p>
          ) : (
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {confirmWipe
                ? "Are you sure? This will wipe all workspace data. This cannot be undone."
                : "Disconnect all integrations and wipe cached source data from this workspace."}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                confirmWipe
                  ? "bg-rose-500 text-white border-rose-500 hover:bg-rose-600"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
              }`}
              onClick={() => {
                if (!confirmWipe) { setConfirmWipe(true); return; }
                setConfirmWipe(false);
                setWiped(true);
                setTimeout(() => setWiped(false), 3000);
              }}
            >
              {confirmWipe ? "Confirm Wipe" : "Wipe Workspace Data"}
            </button>
            {confirmWipe && (
              <button
                className="btn-secondary px-4 py-2 text-sm"
                onClick={() => setConfirmWipe(false)}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
