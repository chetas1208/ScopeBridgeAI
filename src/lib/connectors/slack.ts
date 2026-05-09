// ScopeBridge AI — Slack API connector (server-side only)
import { env } from "@/lib/env";

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  memberCount: number;
  topic: string;
}

export interface SlackMessage {
  ts: string;
  userId: string;
  username: string;
  text: string;
  channel: string;
  timestamp: Date;
}

const SLACK_AUTH_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_API_BASE = "https://slack.com/api";
const SLACK_SCOPES = "channels:read,channels:history,chat:write,users:read";

export function buildSlackAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID(),
    redirect_uri: env.SLACK_REDIRECT_URI(),
    scope: SLACK_SCOPES,
    state,
  });
  return `${SLACK_AUTH_URL}?${params.toString()}`;
}

export async function exchangeSlackCode(code: string): Promise<{
  accessToken: string;
  teamId: string;
  teamName: string;
  botUserId: string;
  scope: string;
}> {
  const body = new URLSearchParams({
    code,
    client_id: env.SLACK_CLIENT_ID(),
    client_secret: env.SLACK_CLIENT_SECRET(),
    redirect_uri: env.SLACK_REDIRECT_URI(),
  });

  const res = await fetch(`${SLACK_API_BASE}/oauth.v2.access`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Slack token exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    access_token: string;
    scope: string;
    team: { id: string; name: string };
    bot_user_id: string;
  };

  if (!data.ok) {
    throw new Error(`Slack OAuth error: ${data.error ?? "unknown"}`);
  }

  return {
    accessToken: data.access_token,
    teamId: data.team.id,
    teamName: data.team.name,
    botUserId: data.bot_user_id,
    scope: data.scope,
  };
}

async function slackApiCall<T>(
  accessToken: string,
  method: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    query.set(k, String(v));
  }

  const res = await fetch(`${SLACK_API_BASE}/${method}?${query.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Slack API HTTP error ${res.status} on ${method}`);
  }

  const data = (await res.json()) as { ok: boolean; error?: string } & T;
  if (!data.ok) {
    throw new Error(`Slack API error on ${method}: ${data.error ?? "unknown"}`);
  }

  return data;
}

export async function getChannels(accessToken: string): Promise<SlackChannel[]> {
  const data = await slackApiCall<{
    channels: Array<{
      id: string;
      name: string;
      is_private: boolean;
      num_members: number;
      topic: { value: string };
    }>;
  }>(accessToken, "conversations.list", {
    types: "public_channel",
    limit: 200,
    exclude_archived: "true",
  });

  return (data.channels ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    isPrivate: c.is_private,
    memberCount: c.num_members ?? 0,
    topic: c.topic?.value ?? "",
  }));
}

export async function getChannelHistory(
  accessToken: string,
  channelId: string,
  limit = 100
): Promise<SlackMessage[]> {
  const data = await slackApiCall<{
    messages: Array<{
      ts: string;
      user?: string;
      username?: string;
      text: string;
    }>;
  }>(accessToken, "conversations.history", { channel: channelId, limit });

  return (data.messages ?? []).map((m) => ({
    ts: m.ts,
    userId: m.user ?? "",
    username: m.username ?? m.user ?? "unknown",
    text: m.text,
    channel: channelId,
    timestamp: new Date(parseFloat(m.ts) * 1000),
  }));
}

export async function searchMessages(
  accessToken: string,
  query: string
): Promise<SlackMessage[]> {
  const data = await slackApiCall<{
    messages: {
      matches: Array<{
        ts: string;
        user?: string;
        username?: string;
        text: string;
        channel: { id: string };
      }>;
    };
  }>(accessToken, "search.messages", { query, count: 50 });

  return (data.messages?.matches ?? []).map((m) => ({
    ts: m.ts,
    userId: m.user ?? "",
    username: m.username ?? m.user ?? "unknown",
    text: m.text,
    channel: m.channel?.id ?? "",
    timestamp: new Date(parseFloat(m.ts) * 1000),
  }));
}

export async function postMessage(
  accessToken: string,
  channelId: string,
  text: string
): Promise<{ ts: string; channel: string }> {
  const res = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: channelId, text }),
  });

  if (!res.ok) {
    throw new Error(`Slack postMessage HTTP error: ${res.status}`);
  }

  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    ts: string;
    channel: string;
  };

  if (!data.ok) {
    throw new Error(`Slack postMessage error: ${data.error ?? "unknown"}`);
  }

  return { ts: data.ts, channel: data.channel };
}
