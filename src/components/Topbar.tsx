"use client";
import React from "react";
import { Search, Bell, User as UserIcon } from "lucide-react";
import { useSession } from "next-auth/react";

export default function Topbar() {
  const { data: session } = useSession();

  return (
    <header className="h-16 bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search projects, risks, or memories... (Cmd+K)" 
            className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 ml-4">
        <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-[var(--bg-primary)]"></span>
        </button>
        <div className="flex items-center gap-2 pl-4 border-l border-[var(--border-subtle)]">
          <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
            {session?.user?.image ? (
              <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-4 h-4 text-[var(--text-secondary)]" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
