// ScopeBridge AI — Fetch Slack channel history and store as SourceItems
import { type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, serverError } from "@/lib/api/response";
import { getChannelHistory } from "@/lib/connectors/slack";
import { getConnectedAccount, decryptAccessToken, getOrCreateWorkspace } from "@/lib/workspace";
import { db } from "@/lib/db";
import { estimateTokens } from "@/lib/context/token-budget";

const HistorySchema = z.object({
  channelId: z.string().min(1),
  limit: z.number().int().min(1).max(200).optional().default(100),
});

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const body = await req.json().catch(() => null);
  const parsed = HistorySchema.safeParse(body);
  if (!parsed.success) {
    return err("Invalid request body", 400, parsed.error.flatten());
  }

  const account = await getConnectedAccount(workspace.id, "slack");
  if (!account || account.status === "disconnected") {
    return err("Slack account not connected", 400);
  }

  const accessToken = decryptAccessToken(account);

  let messages;
  try {
    messages = await getChannelHistory(accessToken, parsed.data.channelId, parsed.data.limit);
  } catch (e) {
    console.error("[slack/history] API error:", e);
    return serverError("Failed to fetch Slack history");
  }

  // Store as SourceItems
  const stored = await Promise.all(
    messages.map(async (m) => {
      const id = `slack-${workspace.id}-${m.ts}`.slice(0, 30);
      const content = `[${m.username}] ${m.text}`;
      return db.sourceItem.upsert({
        where: { id },
        create: {
          id,
          workspaceId: workspace.id,
          sourceType: "slack",
          externalId: m.ts,
          title: `Slack message from ${m.username}`,
          content,
          author: m.username,
          tokenCount: estimateTokens(content),
          occurredAt: m.timestamp,
          metadata: { channel: m.channel } as Prisma.InputJsonValue,
        },
        update: { content, tokenCount: estimateTokens(content) },
      });
    })
  );

  return ok({ ok: true, messages, stored: stored.length });
}
