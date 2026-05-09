"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ShieldAlert, Plug, Database, Zap, Settings, Command } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard/pulse", label: "System Pulse", icon: <Activity className="w-4 h-4" /> },
    { href: "/dashboard/insights", label: "Insight Center", icon: <ShieldAlert className="w-4 h-4" /> },
    { href: "/dashboard/sources", label: "Source Connectors", icon: <Plug className="w-4 h-4" /> },
    { href: "/dashboard/memory", label: "Memory Audit", icon: <Database className="w-4 h-4" /> },
    { href: "/dashboard/actions", label: "Action Center", icon: <Zap className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col h-full flex-shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--text-primary)] leading-tight">ScopeBridge</h1>
            <p className="text-[10px] text-cyan-400 font-semibold tracking-widest uppercase">DeliveryGuard</p>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1">
        <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 px-2">Intelligence</div>
        <nav className="space-y-1">
          {links.map(l => {
            const active = pathname === l.href;
            return (
              <Link key={l.href} href={l.href} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${active ? "bg-purple-500/10 text-purple-400 font-medium" : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"}`}>
                {l.icon} {l.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-[var(--border-subtle)]">
        <Link href="/dashboard/settings" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${pathname === "/dashboard/settings" ? "bg-purple-500/10 text-purple-400 font-medium" : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"}`}>
          <Settings className="w-4 h-4" /> Settings
        </Link>
      </div>
    </aside>
  );
}
