// DeliveryGuard AI — Agents (Audit Pipeline)
import type { SourceEvent, EngineeringSignal, DeliveryRisk, GeneratedAction } from "./types";
import { callModel, isPipeshiftAvailable } from "./pipeshift";
import { safeJsonParse, generateId } from "./utils";
import { AUDIT_PROMPT, GITHUB_ISSUE_PROMPT, CLIENT_EMAIL_PROMPT, SLACK_ESCALATION_PROMPT } from "./prompts";
import { DEMO_RISKS, DEMO_ACTIONS } from "./mockData";

const isDemoMode = () => process.env.DEMO_MODE === "true";

export async function runClientPromiseAudit(
  sourceEvents: SourceEvent[],
  engineeringSignals: EngineeringSignal[]
): Promise<DeliveryRisk[]> {
  if (isPipeshiftAvailable()) {
    try {
      const messages = [
        { role: "system" as const, content: AUDIT_PROMPT },
        { role: "user" as const, content: JSON.stringify({ sourceEvents: sourceEvents.map(e => ({ id: e.id, title: e.title, content: e.content, author: e.author, sourceType: e.sourceType })), engineeringSignals: engineeringSignals.map(s => ({ id: s.id, title: s.title, status: s.status, owner: s.owner, labels: s.labels })) }) },
      ];
      const result = await callModel(messages, { temperature: 0.1, maxTokens: 4096 });
      if (result) {
        const parsed = safeJsonParse<DeliveryRisk[]>(result, []);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(r => ({ ...r, id: r.id || generateId(), projectId: "proj-1", auditRunId: generateId(), status: "active" as const }));
        }
      }
    } catch (err) { console.error("LLM audit failed:", err); }
  }
  if (isDemoMode()) return DEMO_RISKS;
  if (!isPipeshiftAvailable()) {
    return buildDeterministicAudit(sourceEvents, engineeringSignals);
  }
  return [];
}

export async function generateGitHubIssueDraft(risk: DeliveryRisk): Promise<GeneratedAction> {
  if (isPipeshiftAvailable()) {
    try {
      const result = await callModel([
        { role: "system", content: GITHUB_ISSUE_PROMPT },
        { role: "user", content: JSON.stringify(risk) },
      ], { temperature: 0.3, maxTokens: 1024 });
      if (result) {
        const parsed = safeJsonParse<{ title?: string; body?: string }>(result, {});
        if (parsed.title && parsed.body) {
          return { id: generateId(), projectId: risk.projectId, riskId: risk.id, type: "github_issue", title: parsed.title, body: parsed.body, createdAt: new Date().toISOString() };
        }
      }
    } catch (err) { console.error("GitHub issue generation failed:", err); }
  }
  const demo = DEMO_ACTIONS.find(a => a.type === "github_issue");
  if (demo) return { ...demo, riskId: risk.id };
  return { id: generateId(), projectId: risk.projectId, riskId: risk.id, type: "github_issue", title: `[Action Needed] ${risk.title}`, body: `## Risk\n${risk.title}\n\n## Client Promise\n${risk.clientPromise}\n\n## Engineering Reality\n${risk.engineeringReality}\n\n## Evidence\n${risk.evidenceQuote}\n\n## Recommended Action\n${risk.recommendedAction}`, createdAt: new Date().toISOString() };
}

export async function generateClientEmail(risk: DeliveryRisk): Promise<GeneratedAction> {
  if (isPipeshiftAvailable()) {
    try {
      const result = await callModel([
        { role: "system", content: CLIENT_EMAIL_PROMPT },
        { role: "user", content: JSON.stringify(risk) },
      ], { temperature: 0.3, maxTokens: 1024 });
      if (result) {
        const parsed = safeJsonParse<{ title?: string; body?: string }>(result, {});
        if (parsed.title && parsed.body) {
          return { id: generateId(), projectId: risk.projectId, riskId: risk.id, type: "client_email", title: parsed.title, body: parsed.body, createdAt: new Date().toISOString() };
        }
      }
    } catch (err) { console.error("Client email generation failed:", err); }
  }
  const demo = DEMO_ACTIONS.find(a => a.type === "client_email");
  if (demo) return { ...demo, riskId: risk.id };
  return { id: generateId(), projectId: risk.projectId, riskId: risk.id, type: "client_email", title: `Status Update: ${risk.title}`, body: `This is a generated client email regarding: ${risk.title}\n\nClient Promise: ${risk.clientPromise}\n\nCurrent Status: ${risk.engineeringReality}\n\nRecommended: ${risk.recommendedAction}`, createdAt: new Date().toISOString() };
}

export async function generateSlackEscalation(risk: DeliveryRisk): Promise<GeneratedAction> {
  if (isPipeshiftAvailable()) {
    try {
      const result = await callModel([
        { role: "system", content: SLACK_ESCALATION_PROMPT },
        { role: "user", content: JSON.stringify(risk) },
      ], { temperature: 0.3, maxTokens: 1024 });
      if (result) {
        const parsed = safeJsonParse<{ title?: string; body?: string }>(result, {});
        if (parsed.title && parsed.body) {
          return { id: generateId(), projectId: risk.projectId, riskId: risk.id, type: "slack_escalation", title: parsed.title, body: parsed.body, createdAt: new Date().toISOString() };
        }
      }
    } catch (err) { console.error("Slack escalation generation failed:", err); }
  }
  const demo = DEMO_ACTIONS.find(a => a.type === "slack_escalation");
  if (demo) return { ...demo, riskId: risk.id };
  return { id: generateId(), projectId: risk.projectId, riskId: risk.id, type: "slack_escalation", title: `🚨 ESCALATION: ${risk.title}`, body: `@channel\n\n**${risk.title}**\n\nClient Promise: ${risk.clientPromise}\nEngineering Reality: ${risk.engineeringReality}\nEvidence: ${risk.evidenceQuote}\n\nAction needed: ${risk.recommendedAction}`, createdAt: new Date().toISOString() };
}

// Deterministic audit when no LLM and no demo mode — pattern-match real source events
function buildDeterministicAudit(events: SourceEvent[], signals: EngineeringSignal[]): DeliveryRisk[] {
  const risks: DeliveryRisk[] = [];
  const auditRunId = generateId();
  const blocked = signals.filter(s => s.status === "blocked");
  blocked.forEach(s => {
    risks.push({ id: generateId(), projectId: s.projectId, auditRunId, type: "blocker", severity: "critical", title: `Blocked: ${s.title}`, clientPromise: "Delivery depends on this.", engineeringReality: `${s.title} is blocked.`, evidenceQuote: s.content, confidence: 0.9, recommendedAction: "Escalate blocker immediately.", status: "active" });
  });
  // Find client asks (gmail) without matching github signals
  const gmailEvents = events.filter(e => e.sourceType === "gmail");
  const githubTitles = signals.map(s => s.title.toLowerCase());
  gmailEvents.forEach(e => {
    const keywords = e.content.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const hasMatch = keywords.some(kw => githubTitles.some(gt => gt.includes(kw)));
    if (!hasMatch) {
      risks.push({ id: generateId(), projectId: e.projectId, auditRunId, type: "missing_ticket", severity: "high", title: `No engineering ticket for: ${e.title}`, clientPromise: e.content.slice(0, 100), engineeringReality: "No matching GitHub issue found.", evidenceQuote: e.content.slice(0, 150), sourceEventId: e.id, confidence: 0.7, recommendedAction: "Create a GitHub issue or confirm it's out of scope.", status: "active" });
    }
  });
  return risks;
}
