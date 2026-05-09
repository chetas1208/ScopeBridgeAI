// DeliveryGuard AI — Core Types

export type SourceType = "gmail" | "slack" | "github" | "manual" | "upload";

export type RiskType =
  | "missing_ticket"
  | "scope_drift"
  | "contradiction"
  | "blocker"
  | "deadline_risk"
  | "ownership_gap"
  | "forgotten_commitment";

export type Severity = "low" | "medium" | "high" | "critical";

export type ActionType = "github_issue" | "client_email" | "slack_escalation" | "pm_summary";

export interface SourceEvent {
  id: string;
  projectId: string;
  sourceType: SourceType;
  externalId?: string;
  title: string;
  content: string;
  author: string;
  url?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  selected?: boolean;
}

export interface ClientPromise {
  id: string;
  projectId: string;
  sourceEventId: string;
  text: string;
  promisedBy: string;
  promisedTo: string;
  dueDate?: string;
  evidenceQuote: string;
  confidence: number;
  status: "open" | "linked" | "at_risk" | "delivered" | "blocked";
}

export interface EngineeringSignal {
  id: string;
  projectId: string;
  sourceEventId?: string;
  provider: "github" | "slack" | "manual";
  title: string;
  status: "open" | "in_progress" | "blocked" | "closed" | "merged";
  owner?: string;
  labels: string[];
  url?: string;
  content: string;
  updatedAt: string;
}

export interface DeliveryRisk {
  id: string;
  projectId: string;
  auditRunId: string;
  type: RiskType;
  severity: Severity;
  title: string;
  clientPromise: string;
  engineeringReality: string;
  evidenceQuote: string;
  sourceEventId?: string;
  confidence: number;
  recommendedAction: string;
  status: "active" | "reviewed" | "mitigated";
}

export interface GeneratedAction {
  id: string;
  projectId: string;
  riskId: string;
  type: ActionType;
  title: string;
  body: string;
  createdAt: string;
}

export interface AuditRun {
  id: string;
  projectId: string;
  status: "running" | "complete" | "failed";
  sourceEventCount: number;
  risksFound: number;
  createdAt: string;
}

export interface HealthStatus {
  database: boolean;
  gmail: boolean;
  slack: boolean;
  github: boolean;
  model: boolean;
  hydradb: boolean;
  demoMode: boolean;
}

export interface SetupItem {
  key: string;
  label: string;
  configured: boolean;
}
