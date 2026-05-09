// DeliveryGuard AI — Demo Data (Acme Health, ONLY used when DEMO_MODE=true)
import type { SourceEvent, EngineeringSignal, DeliveryRisk, GeneratedAction } from "./types";

export const DEMO_SOURCE_EVENTS: SourceEvent[] = [
  {
    id: "de-1", projectId: "proj-1", sourceType: "gmail", title: "Client Email: SSO Request",
    content: "Hi team, can we have SSO ready before the pilot launch? Our IT department requires it for compliance.",
    author: "Dr. Sarah Chen (Acme Health)", occurredAt: "2025-05-06T09:15:00Z", createdAt: "2025-05-06T09:15:00Z",
    evidenceQuote: "Can we have SSO ready before the pilot?",
  } as SourceEvent & { evidenceQuote: string },
  {
    id: "de-2", projectId: "proj-1", sourceType: "gmail", title: "Client Email: Mobile Demo",
    content: "Also, can we get a mobile app demo for the board presentation? They want to see it on tablets.",
    author: "Dr. Sarah Chen (Acme Health)", occurredAt: "2025-05-06T09:18:00Z", createdAt: "2025-05-06T09:18:00Z",
  },
  {
    id: "de-3", projectId: "proj-1", sourceType: "slack", title: "PM Response: SSO",
    content: "Re: SSO — we should be able to make it work. Let me check with engineering.",
    author: "Marcus (PM)", occurredAt: "2025-05-06T10:30:00Z", createdAt: "2025-05-06T10:30:00Z",
  },
  {
    id: "de-4", projectId: "proj-1", sourceType: "slack", title: "Engineering Blocker: API Keys",
    content: "Backend deployment is still blocked. Waiting on API keys from infra team. Day 5 now. Can't proceed.",
    author: "Jordan (Backend)", occurredAt: "2025-05-07T11:00:00Z", createdAt: "2025-05-07T11:00:00Z",
  },
  {
    id: "de-5", projectId: "proj-1", sourceType: "slack", title: "Engineering: SSO Not Scoped",
    content: "SSO has not been scoped. No ticket exists. This would be at least 2 weeks of work.",
    author: "Jordan (Backend)", occurredAt: "2025-05-07T14:00:00Z", createdAt: "2025-05-07T14:00:00Z",
  },
  {
    id: "de-6", projectId: "proj-1", sourceType: "github", title: "Issue #42: Backend blocked",
    content: "Backend cannot be deployed to staging. Blocked by missing API keys from infrastructure team.",
    author: "Jordan (Backend)", url: "https://github.com/acme/intake/issues/42",
    occurredAt: "2025-05-05T10:00:00Z", createdAt: "2025-05-05T10:00:00Z",
  },
  {
    id: "de-7", projectId: "proj-1", sourceType: "gmail", title: "PM Draft: Client Status Update",
    content: "Hi Dr. Chen, quick update — the Patient Intake Portal is progressing well. We are on track for May 12 go-live.",
    author: "Marcus (PM)", occurredAt: "2025-05-07T16:00:00Z", createdAt: "2025-05-07T16:00:00Z",
  },
  {
    id: "de-8", projectId: "proj-1", sourceType: "manual", title: "Original Scope Agreement",
    content: "Scope: Web dashboard only. Includes intake form, admin dashboard, CSV export. SSO explicitly out of scope. Mobile out of scope. Go-live: May 15.",
    author: "Marcus (PM)", occurredAt: "2025-04-15T10:00:00Z", createdAt: "2025-04-15T10:00:00Z",
  },
];

export const DEMO_ENGINEERING_SIGNALS: EngineeringSignal[] = [
  { id: "es-1", projectId: "proj-1", provider: "github", title: "Issue #40: Build intake form UI", status: "in_progress", owner: "Lina", labels: ["frontend", "mvp"], content: "In progress", updatedAt: "2025-05-06T00:00:00Z" },
  { id: "es-2", projectId: "proj-1", provider: "github", title: "Issue #41: Build admin dashboard", status: "in_progress", owner: "Lina", labels: ["frontend", "mvp"], content: "In progress", updatedAt: "2025-05-05T00:00:00Z" },
  { id: "es-3", projectId: "proj-1", provider: "github", title: "Issue #43: CSV export endpoint", status: "open", owner: "Jordan", labels: ["backend"], content: "Not started", updatedAt: "2025-05-03T00:00:00Z" },
  { id: "es-4", projectId: "proj-1", provider: "github", title: "Issue #42: Backend deployment", status: "blocked", owner: "Jordan", labels: ["devops", "blocked"], url: "https://github.com/acme/intake/issues/42", content: "Blocked by missing API keys. Day 5.", updatedAt: "2025-05-07T11:00:00Z" },
];

export const DEMO_RISKS: DeliveryRisk[] = [
  {
    id: "dr-1", projectId: "proj-1", auditRunId: "ar-1", type: "missing_ticket", severity: "critical",
    title: "SSO requested — no engineering ticket exists",
    clientPromise: "\"Can we have SSO ready before the pilot?\" — Dr. Chen",
    engineeringReality: "\"SSO has not been scoped. No ticket exists. 2+ weeks of work.\" — Jordan",
    evidenceQuote: "Client email asks for SSO. Slack confirms no ticket, no scope, no estimate.",
    confidence: 0.95, recommendedAction: "Create scope change request. Do not promise SSO without engineering sign-off.",
    status: "active",
  },
  {
    id: "dr-2", projectId: "proj-1", auditRunId: "ar-1", type: "contradiction", severity: "critical",
    title: "Client update says on track — backend is blocked",
    clientPromise: "\"We are on track for May 12 go-live.\" — Marcus (PM draft)",
    engineeringReality: "\"Backend deployment blocked. Waiting on API keys. Day 5.\" — Jordan + GitHub #42",
    evidenceQuote: "PM email: \"on track\" vs Engineering: \"blocked, day 5\"",
    confidence: 0.97, recommendedAction: "Do NOT send current client update. Revise with honest blockers.",
    status: "active",
  },
  {
    id: "dr-3", projectId: "proj-1", auditRunId: "ar-1", type: "scope_drift", severity: "high",
    title: "Mobile demo outside original scope",
    clientPromise: "\"Can we get a mobile app demo for the board?\" — Dr. Chen",
    engineeringReality: "Original scope: \"Web dashboard only. Mobile out of scope.\"",
    evidenceQuote: "Scope agreement says web only. Client now asks for mobile/tablet demo.",
    confidence: 0.93, recommendedAction: "Offer responsive web as compromise or create change request.",
    status: "active",
  },
  {
    id: "dr-4", projectId: "proj-1", auditRunId: "ar-1", type: "blocker", severity: "critical",
    title: "Backend blocked by missing API keys — 5 days",
    clientPromise: "CSV export promised by May 10 (depends on backend)",
    engineeringReality: "\"Backend deployment still blocked. Day 5.\" — Jordan",
    evidenceQuote: "Slack + GitHub #42 confirm backend has been blocked for 5 days.",
    confidence: 0.97, recommendedAction: "Escalate API key delivery to leadership immediately.",
    status: "active",
  },
  {
    id: "dr-5", projectId: "proj-1", auditRunId: "ar-1", type: "deadline_risk", severity: "high",
    title: "Go-live moved from May 15 → May 12 with expanded scope",
    clientPromise: "Go-live May 12 (moved up from May 15)",
    engineeringReality: "Scope expanded (SSO + mobile). Backend blocked. No sprint adjustment.",
    evidenceQuote: "Deadline accelerated by 3 days while adding SSO and mobile requests.",
    confidence: 0.90, recommendedAction: "Emergency scope review. Cut features or push back on timeline.",
    status: "active",
  },
  {
    id: "dr-6", projectId: "proj-1", auditRunId: "ar-1", type: "ownership_gap", severity: "high",
    title: "SSO promise has no engineering owner",
    clientPromise: "PM implied SSO would be done. No owner assigned.",
    engineeringReality: "No ticket, no owner, no estimate, no sprint allocation.",
    evidenceQuote: "PM: \"we should be able to make it work\" — no engineering assignment followed.",
    confidence: 0.92, recommendedAction: "Assign owner or formally decline SSO for v1.",
    status: "active",
  },
];

export const DEMO_ACTIONS: GeneratedAction[] = [
  {
    id: "ga-1", projectId: "proj-1", riskId: "dr-1", type: "github_issue",
    title: "[Scope Change] SSO Authentication — Client Request",
    body: `## Context
Dr. Sarah Chen (Acme Health) requested SSO before the pilot launch for IT compliance.

## Current Status
- SSO was explicitly out of scope in the original agreement
- No engineering ticket exists
- Engineering estimates 2+ weeks of work
- PM implied agreement without engineering sign-off

## Acceptance Criteria
- [ ] Evaluate SSO scope and estimate
- [ ] Get client sign-off on timeline impact
- [ ] Create technical design document
- [ ] Update project timeline

## Labels
scope-change, client-request, needs-estimate

## Priority
Critical — client expects this for pilot compliance`,
    createdAt: "2025-05-07T17:00:00Z",
  },
  {
    id: "ga-2", projectId: "proj-1", riskId: "dr-2", type: "client_email",
    title: "Revised Project Status — Patient Intake Portal",
    body: `Hi Dr. Chen,

Thank you for your patience. Here is an honest update on the Patient Intake Portal.

**On track:**
• Patient intake form UI is progressing well (near completion).
• Admin dashboard build is underway.

**Current blocker:**
• Backend deployment is blocked by API key delivery from our infrastructure team. This has been an open issue for 5 days and we are actively escalating.
• This affects the CSV export feature promised by May 10 — we may need to adjust that timeline.

**Regarding SSO:**
SSO was not in the original scope. Implementing it properly would require ~2 weeks. We'd like to discuss a phased approach or alternative timeline.

**Regarding mobile:**
The original scope was web-only. We can make the web dashboard responsive for tablets as a faster alternative.

**Next steps:**
1. Escalating API key blocker today — target resolution by EOD May 8.
2. Propose a call to discuss SSO and mobile scope.
3. Revised timeline within 24 hours of blocker resolution.

Best regards,
Marcus`,
    createdAt: "2025-05-07T17:00:00Z",
  },
  {
    id: "ga-3", projectId: "proj-1", riskId: "dr-4", type: "slack_escalation",
    title: "🚨 ESCALATION: Backend Blocked 5 Days — Acme Health At Risk",
    body: `@channel @engineering-leads

**ESCALATION: Backend deployment for Acme Health Patient Intake Portal has been blocked for 5 days.**

**Blocker:** Missing API keys from infrastructure team.
**Impact:** CSV export (promised May 10), staging deployment, and integration testing are all blocked.
**Client risk:** Go-live is May 12. Client was told "on track" — this is not accurate.

**Action needed:**
1. Infrastructure team: Deliver API keys by EOD today.
2. If keys cannot be delivered, we need an alternative (mock API layer for staging).
3. PM: Do NOT send the current client update — it says "on track" when we are blocked.

cc @marcus @jordan`,
    createdAt: "2025-05-07T17:00:00Z",
  },
];
