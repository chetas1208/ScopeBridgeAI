// ScopeBridge AI — Prompts shim
// The canonical prompts live in src/lib/ai/prompts.ts.
// This file re-exports them so existing imports (agents.ts, etc.) continue to work.
export {
  AUDIT_SYSTEM_PROMPT,
  GITHUB_ISSUE_SYSTEM_PROMPT,
  CLIENT_EMAIL_SYSTEM_PROMPT,
  SLACK_ESCALATION_SYSTEM_PROMPT,
  PM_SUMMARY_SYSTEM_PROMPT,
  // Backwards-compat aliases
  AUDIT_PROMPT,
  GITHUB_ISSUE_PROMPT,
  CLIENT_EMAIL_PROMPT,
  SLACK_ESCALATION_PROMPT,
} from "./ai/prompts";
