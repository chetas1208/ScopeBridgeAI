// ScopeBridge AI — Server-side action executor
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { getConnectedAccount, decryptAccessToken, decryptRefreshToken } from "@/lib/workspace";
import { refreshGmailToken, sendGmailMessage } from "@/lib/connectors/gmail";
import { postMessage as slackPostMessage } from "@/lib/connectors/slack";
import { createIssue } from "@/lib/connectors/github";
import { saveMemorySnapshot } from "@/lib/memory/context-memory";
import { addMemory } from "@/lib/hydradb";
import { saveSessionMemory } from "@/lib/memory/session-memory";

export interface ExecuteActionInput {
  draftId: string;
  workspaceId: string;
  userId: string;
}

export interface ExecuteActionResult {
  ok: boolean;
  externalUrl?: string;
  error?: string;
}

export async function executeAction(
  input: ExecuteActionInput
): Promise<ExecuteActionResult> {
  const { draftId, workspaceId, userId } = input;

  // 1. Load the draft, verify it belongs to this workspace
  const draft = await db.actionDraft.findFirst({
    where: { id: draftId, workspaceId },
  });

  if (!draft) {
    return { ok: false, error: "Action draft not found" };
  }

  if (draft.status !== "approved") {
    return { ok: false, error: `Draft is not approved (status: ${draft.status})` };
  }

  let result: ExecuteActionResult;

  try {
    switch (draft.type) {
      case "email": {
        const account = await getConnectedAccount(workspaceId, "gmail");
        if (!account) {
          result = { ok: false, error: "Gmail account not connected" };
          break;
        }

        let accessToken = decryptAccessToken(account);

        // Refresh token if expired
        if (account.expiresAt && account.expiresAt < new Date()) {
          const refreshToken = decryptRefreshToken(account);
          if (!refreshToken) {
            result = { ok: false, error: "Gmail refresh token missing; please reconnect" };
            break;
          }
          const refreshed = await refreshGmailToken(refreshToken);
          accessToken = refreshed.accessToken;
          // Update stored token
          await db.connectedAccount.update({
            where: { id: account.id },
            data: {
              encryptedAccessToken: encrypt(refreshed.accessToken),
              expiresAt: refreshed.expiresAt,
            },
          });
        }

        const to = draft.target ?? "";
        if (!to) {
          result = { ok: false, error: "Email target address is missing" };
          break;
        }

        const sent = await sendGmailMessage(accessToken, {
          to,
          subject: draft.title,
          body: draft.body,
        });

        result = {
          ok: true,
          externalUrl: `https://mail.google.com/mail/u/0/#sent/${sent.id}`,
        };
        break;
      }

      case "slack": {
        const account = await getConnectedAccount(workspaceId, "slack");
        if (!account) {
          result = { ok: false, error: "Slack account not connected" };
          break;
        }

        const accessToken = decryptAccessToken(account);
        const channelId = draft.target ?? "";
        if (!channelId) {
          result = { ok: false, error: "Slack channel ID is missing" };
          break;
        }

        const posted = await slackPostMessage(accessToken, channelId, draft.body);
        result = {
          ok: true,
          externalUrl: `https://slack.com/archives/${posted.channel}/p${posted.ts.replace(".", "")}`,
        };
        break;
      }

      case "github_issue": {
        const account = await getConnectedAccount(workspaceId, "github");
        if (!account) {
          result = { ok: false, error: "GitHub account not connected" };
          break;
        }

        const accessToken = decryptAccessToken(account);
        const target = draft.target ?? "";
        const parts = target.split("/");
        if (parts.length < 2) {
          result = { ok: false, error: `Invalid GitHub target format — expected "owner/repo", got "${target}"` };
          break;
        }
        const [owner, repo] = parts;

        const issue = await createIssue(
          accessToken,
          owner,
          repo,
          draft.title,
          draft.body,
          ["delivery-risk"]
        );

        result = { ok: true, externalUrl: issue.url };
        break;
      }

      case "memory_update": {
        await saveMemorySnapshot(workspaceId, userId, "project_fact", draft.body, 0.9);
        await addMemory(workspaceId, userId, draft.body, {
          kind: "project_fact",
          source: "action_draft",
          draftId,
        });
        result = { ok: true };
        break;
      }

      case "github_pr": {
        result = {
          ok: false,
          error: "PR creation requires manual approval via GitHub UI",
        };
        break;
      }

      default: {
        result = { ok: false, error: `Unknown action type: ${draft.type}` };
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Execution failed";
    console.error(`[execute-action] type=${draft.type} draftId=${draftId}`, err);
    result = { ok: false, error: message };
  }

  // 4. Persist ActionExecution record
  await db.actionExecution.create({
    data: {
      riskId: draft.riskId ?? undefined,
      draftId: draft.id,
      workspaceId,
      type: draft.type,
      status: result.ok ? "success" : "failed",
      externalUrl: result.externalUrl ?? null,
      errorMsg: result.error ?? null,
      result: result as unknown as Prisma.InputJsonValue,
    },
  });

  // 5. Mark draft as executed (or keep as approved if failed)
  await db.actionDraft.update({
    where: { id: draftId },
    data: { status: result.ok ? "executed" : "approved" },
  });

  // 6. Save outcome to session memory
  await saveSessionMemory(
    workspaceId,
    userId,
    "session_summary",
    `Action "${draft.title}" (${draft.type}) ${result.ok ? "executed successfully" : `failed: ${result.error}`}`,
    { draftId, type: draft.type, ok: result.ok }
  ).catch(() => {/* non-fatal */});

  return result;
}
