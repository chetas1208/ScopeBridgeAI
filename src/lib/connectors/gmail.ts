// ScopeBridge AI — Gmail API connector (server-side only)
import { env } from "@/lib/env";

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  snippet: string;
  labels: string[];
}

// Internal type for the raw Gmail API response shape
interface GmailApiMessagePart {
  mimeType: string;
  body?: { data?: string };
  parts?: GmailApiMessagePart[];
}

interface GmailApiMessageHeader {
  name: string;
  value: string;
}

export interface GmailApiMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: GmailApiMessageHeader[];
    body?: { data?: string };
    parts?: GmailApiMessagePart[];
    mimeType?: string;
  };
}

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export function buildGmailAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID(),
    redirect_uri: env.GOOGLE_REDIRECT_URI(),
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGmailCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}> {
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID(),
    client_secret: env.GOOGLE_CLIENT_SECRET(),
    redirect_uri: env.GOOGLE_REDIRECT_URI(),
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gmail token exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope,
  };
}

export async function refreshGmailToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: env.GOOGLE_CLIENT_ID(),
    client_secret: env.GOOGLE_CLIENT_SECRET(),
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gmail token refresh failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

async function gmailFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  const res = await fetch(`${GMAIL_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gmail API error ${res.status} on ${path}: ${text}`);
  }

  return res.json();
}

export async function searchGmailMessages(
  accessToken: string,
  options: {
    query?: string;
    maxResults?: number;
    labelIds?: string[];
  }
): Promise<GmailMessage[]> {
  const params = new URLSearchParams({
    maxResults: String(options.maxResults ?? 25),
  });
  if (options.query) params.set("q", options.query);
  if (options.labelIds?.length) {
    options.labelIds.forEach((l) => params.append("labelIds", l));
  }

  const listData = (await gmailFetch(
    accessToken,
    `/users/me/messages?${params.toString()}`
  )) as { messages?: Array<{ id: string; threadId: string }> };

  const messageRefs = listData.messages ?? [];
  if (messageRefs.length === 0) return [];

  const messages = await Promise.all(
    messageRefs.map((m) => getGmailMessage(accessToken, m.id))
  );

  return messages;
}

export async function getGmailMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessage> {
  const data = (await gmailFetch(
    accessToken,
    `/users/me/messages/${messageId}?format=full`
  )) as GmailApiMessage;

  return parseGmailMessage(data);
}

export async function sendGmailMessage(
  accessToken: string,
  options: { to: string; subject: string; body: string; isHtml?: boolean }
): Promise<{ id: string }> {
  const contentType = options.isHtml ? "text/html" : "text/plain";
  const rawEmail = [
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    `Content-Type: ${contentType}; charset=utf-8`,
    "",
    options.body,
  ].join("\r\n");

  const encoded = Buffer.from(rawEmail)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const data = (await gmailFetch(accessToken, "/users/me/messages/send", {
    method: "POST",
    body: JSON.stringify({ raw: encoded }),
  })) as { id: string };

  return { id: data.id };
}

export function decodeMessageBody(message: GmailApiMessage): string {
  const payload = message.payload;
  if (!payload) return "";

  // Try direct body first
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Walk parts to find text/plain or text/html
  if (payload.parts) {
    const plain = findPartByMime(payload.parts, "text/plain");
    if (plain?.body?.data) return decodeBase64Url(plain.body.data);

    const html = findPartByMime(payload.parts, "text/html");
    if (html?.body?.data) return decodeBase64Url(html.body.data);
  }

  return message.snippet ?? "";
}

function findPartByMime(
  parts: GmailApiMessagePart[],
  mimeType: string
): GmailApiMessagePart | null {
  for (const part of parts) {
    if (part.mimeType === mimeType) return part;
    if (part.parts) {
      const found = findPartByMime(part.parts, mimeType);
      if (found) return found;
    }
  }
  return null;
}

function decodeBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function getHeader(headers: GmailApiMessageHeader[] | undefined, name: string): string {
  if (!headers) return "";
  const h = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

function parseGmailMessage(data: GmailApiMessage): GmailMessage {
  const headers = data.payload?.headers;
  const body = decodeMessageBody(data);

  return {
    id: data.id,
    threadId: data.threadId,
    subject: getHeader(headers, "Subject"),
    from: getHeader(headers, "From"),
    to: getHeader(headers, "To"),
    date: getHeader(headers, "Date"),
    body,
    snippet: data.snippet ?? "",
    labels: data.labelIds ?? [],
  };
}
