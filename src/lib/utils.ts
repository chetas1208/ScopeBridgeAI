// DeliveryGuard AI — Utilities
import { v4 as uuidv4 } from "uuid";

export function generateId(): string {
  return uuidv4();
}

export function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return dateStr; }
}

export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    const cleanText = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(cleanText.trim()) as T;
  } catch {
    try {
      const m = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]) as T;
    } catch { /* give up */ }
    return fallback;
  }
}

export function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
