// ScopeBridge AI — Gmail message search
import { type NextRequest } from "next/server";
import { z } from "zod";
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

const SearchSchema = z.object({
  query: z.string().optional(),
  maxResults: z.number().int().min(1).max(100).optional().default(25),
  labelIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const body = await req.json().catch(() => null);
  const parsed = SearchSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return err("Invalid request body", 400, parsed.error.flatten());
  }

  const account = await getConnectedAccount(workspace.id, "gmail");
  if (!account || account.status === "disconnected") {
    return err("Gmail account not connected", 400);
  }

  let accessToken = decryptAccessToken(account);

  // Refresh if expired
  if (account.expiresAt && account.expiresAt < new Date()) {
    const refreshToken = decryptRefreshToken(account);
    if (!refreshToken) {
      return err("Gmail refresh token missing. Please reconnect your Gmail account.", 400);
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
      console.error("[gmail/search] token refresh failed:", e);
      return err("Failed to refresh Gmail token. Please reconnect.", 401);
    }
  }

  let messages;
  try {
    messages = await searchGmailMessages(accessToken, parsed.data);
  } catch (e) {
    console.error("[gmail/search] Gmail API error:", e);
    return serverError("Gmail search failed");
  }

  // Store results as SourceItems
  const stored = await Promise.all(
    messages.map(async (m) => {
      const content = `From: ${m.from}\nTo: ${m.to}\nSubject: ${m.subject}\nDate: ${m.date}\n\n${m.body || m.snippet}`;
      return db.sourceItem.upsert({
        where: {
          // Use externalId uniqueness per workspace+sourceType to avoid duplicates
          id: `gmail-${workspace.id}-${m.id}`.slice(0, 30),
        },
        create: {
          id: `gmail-${workspace.id}-${m.id}`.slice(0, 30),
          workspaceId: workspace.id,
          sourceType: "gmail",
          externalId: m.id,
          title: m.subject || `Email from ${m.from}`,
          content,
          author: m.from,
          tokenCount: estimateTokens(content),
          occurredAt: m.date ? new Date(m.date) : new Date(),
        },
        update: {
          content,
          tokenCount: estimateTokens(content),
        },
      });
    })
  );

  return ok({ ok: true, messages, stored: stored.length });
}
