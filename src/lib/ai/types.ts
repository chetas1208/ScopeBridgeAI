// ScopeBridge AI — AI layer TypeScript types

export interface KimiContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface KimiMessage {
  role: "system" | "user" | "assistant";
  content: string | KimiContent[];
}

export interface KimiOptions {
  system?: string;
  messages: KimiMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  jsonMode?: boolean;
  contextBudget?: number;
}

export interface KimiResponse {
  content: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
}

// ── Audit Output Shape ─────────────────────────────────────────────────

export interface AuditEvidence {
  sourceType: "gmail" | "slack" | "github" | "manual" | "image" | "file" | "hydradb";
  sourceId: string;
  quote: string;
  timestamp: string | null;
}

export interface AuditRisk {
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  category:
    | "missing_ticket"
    | "contradiction"
    | "scope_drift"
    | "blocked_backend"
    | "stale_promise"
    | "repo_risk"
    | "other";
  confidence: number;
  client_promise: string;
  engineering_reality: string;
  evidence: AuditEvidence[];
  recommended_action: string;
  missing_information: string[];
}

export interface AuditActionDraft {
  type: "email" | "slack" | "github_issue" | "github_pr" | "memory_update";
  title: string;
  body: string;
  target: string;
  requiresConfirmation: boolean;
}

export interface MemoryUpdate {
  kind:
    | "commitment"
    | "project_fact"
    | "risk_pattern"
    | "user_preference"
    | "session_summary";
  text: string;
  confidence: number;
}

export interface AuditOutput {
  summary: string;
  health_score: number;
  risks: AuditRisk[];
  action_drafts: AuditActionDraft[];
  memory_updates: MemoryUpdate[];
}

// ── Context Pack ────────────────────────────────────────────────────────

export interface ContextSource {
  id: string;
  sourceType: string;
  title: string;
  content: string;
  author?: string;
  url?: string;
  timestamp: string;
  tokenCount: number;
}

export interface ContextPack {
  sources: ContextSource[];
  hydraContext: string;
  totalTokens: number;
  budget: number;
  truncated: boolean;
}
