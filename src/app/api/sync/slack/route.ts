// ScopeBridge AI — Slack sync (recent messages from joined public channels)
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, serverError } from "@/lib/api/response";
import { getChannels, getChannelHistory } from "@/lib/connectors/slack";
import { getConnectedAccount, decryptAccessToken, getOrCreateWorkspace } from "@/lib/workspace";
import { db } from "@/lib/db";
import { estimateTokens } from "@/lib/context/token-budget";

export async function POST(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const account = await getConnectedAccount(workspace.id, "slack");
  if (!account || account.status === "disconnected") {
    return err("Slack account not connected", 400);
  }

  const accessToken = decryptAccessToken(account);

  const syncJob = await db.connectorSyncJob.create({
    data: {
      workspaceId: workspace.id,
      provider: "slack",
      status: "running",
    },
  });

  let channels;
  try {
    channels = await getChannels(accessToken);
  } catch (e) {
    console.error("[sync/slack] getChannels failed:", e);
    await db.connectorSyncJob.update({
      where: { id: syncJob.id },
      data: { status: "failed", errorMsg: String(e), completedAt: new Date() },
    });
    return serverError("Failed to fetch Slack channels");
  }

  // Fetch history for up to 10 channels, 50 messages each
  const targetChannels = channels.slice(0, 10);
  let itemsSynced = 0;

  await Promise.all(
    targetChannels.map(async (channel) => {
      try {
        const messages = await getChannelHistory(accessToken, channel.id, 50);
        await Promise.all(
          messages.map(async (m) => {
            try {
              const id = `slack-${workspace.id}-${m.ts}`.slice(0, 30);
              const content = `[${m.username}] ${m.text}`;
              await db.sourceItem.upsert({
                where: { id },
                create: {
                  id,
                  workspaceId: workspace.id,
                  sourceType: "slack",
                  externalId: m.ts,
                  title: `Slack: #${channel.name} — ${m.username}`,
                  content,
                  author: m.username,
                  tokenCount: estimateTokens(content),
                  occurredAt: m.timestamp,
                  metadata: { channel: channel.id, channelName: channel.name } as Prisma.InputJsonValue,
                },
                update: { content, tokenCount: estimateTokens(content) },
              });
              itemsSynced++;
            } catch {/* skip */}
          })
        );
      } catch (e) {
        console.warn(`[sync/slack] failed to fetch history for channel ${channel.id}:`, e);
      }
    })
  );

  await db.connectorSyncJob.update({
    where: { id: syncJob.id },
    data: { status: "complete", itemsSynced, completedAt: new Date() },
  });

  return ok({ ok: true, itemsSynced, syncJobId: syncJob.id });
}
