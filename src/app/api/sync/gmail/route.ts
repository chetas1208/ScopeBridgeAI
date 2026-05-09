// ScopeBridge AI — Gmail sync (last 7 days, up to 50 messages)
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, serverError } from "@/lib/api/response";
import {
  searchGmailMessages,
  refreshGmailToken,
} from "@/lib/connectors/gmail";
import {
  getConnectedAccount,
  decryptAccessToken,
  decryptRefreshToken,
  getOrCreateWorkspace,
} from "@/lib/workspace";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { estimateTokens } from "@/lib/context/token-budget";

export async function POST(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const account = await getConnectedAccount(workspace.id, "gmail");
  if (!account || account.status === "disconnected") {
    return err("Gmail account not connected", 400);
  }

  // Create sync job record
  const syncJob = await db.connectorSyncJob.create({
    data: {
      workspaceId: workspace.id,
      provider: "gmail",
      status: "running",
    },
  });

  let accessToken = decryptAccessToken(account);

  // Refresh token if expired
  if (account.expiresAt && account.expiresAt < new Date()) {
    const refreshToken = decryptRefreshToken(account);
    if (!refreshToken) {
      await db.connectorSyncJob.update({
        where: { id: syncJob.id },
        data: { status: "failed", errorMsg: "Refresh token missing", completedAt: new Date() },
      });
      return err("Gmail refresh token missing. Please reconnect.", 401);
    }
    try {
      const refreshed = await refreshGmailToken(refreshToken);
      accessToken = refreshed.accessToken;
      await db.connectedAccount.update({
        where: { id: account.id },
        data: {
          encryptedAccessToken: encrypt(refreshed.accessToken),
          expiresAt: refreshed.expiresAt,
        },
      });
    } catch (e) {
      console.error("[sync/gmail] token refresh failed:", e);
      await db.connectorSyncJob.update({
        where: { id: syncJob.id },
        data: { status: "failed", errorMsg: "Token refresh failed", completedAt: new Date() },
      });
      return err("Failed to refresh Gmail token. Please reconnect.", 401);
    }
  }

  // Build query for last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const afterDate = Math.floor(sevenDaysAgo.getTime() / 1000);

  let messages;
  try {
    messages = await searchGmailMessages(accessToken, {
      query: `after:${afterDate}`,
      maxResults: 50,
    });
  } catch (e) {
    console.error("[sync/gmail] search failed:", e);
    await db.connectorSyncJob.update({
      where: { id: syncJob.id },
      data: { status: "failed", errorMsg: String(e), completedAt: new Date() },
    });
    return serverError("Gmail search failed");
  }

  // Upsert as SourceItems
  let itemsSynced = 0;
  await Promise.all(
    messages.map(async (m) => {
      try {
        const content = `From: ${m.from}\nTo: ${m.to}\nSubject: ${m.subject}\nDate: ${m.date}\n\n${m.body || m.snippet}`;
        const id = `gmail-${workspace.id}-${m.id}`.slice(0, 30);
        await db.sourceItem.upsert({
          where: { id },
          create: {
            id,
            workspaceId: workspace.id,
            sourceType: "gmail",
            externalId: m.id,
            title: m.subject || `Email from ${m.from}`,
            content,
            author: m.from,
            tokenCount: estimateTokens(content),
            occurredAt: m.date ? new Date(m.date) : new Date(),
          },
          update: { content, tokenCount: estimateTokens(content) },
        });
        itemsSynced++;
      } catch {/* skip individual failures */}
    })
  );

  await db.connectorSyncJob.update({
    where: { id: syncJob.id },
    data: { status: "complete", itemsSynced, completedAt: new Date() },
  });

  return ok({ ok: true, itemsSynced, syncJobId: syncJob.id });
}
