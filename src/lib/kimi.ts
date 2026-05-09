// ScopeBridge AI — Kimi (via Pipeshift) LLM client
import type { KimiOptions, KimiResponse } from "./ai/types";

interface OpenAICompatUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

interface OpenAICompatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: OpenAICompatUsage;
  model?: string;
}

function getConfig(): { apiKey: string; baseUrl: string; modelName: string } | null {
  const apiKey = process.env.PIPESHIFT_API_KEY;
  const baseUrl = process.env.PIPESHIFT_BASE_URL;
  const modelName = process.env.MODEL_NAME;

  if (!apiKey || !baseUrl || !modelName) return null;
  return { apiKey, baseUrl, modelName };
}

export function isPipeshiftAvailable(): boolean {
  return getConfig() !== null;
}

/**
 * Call the Kimi model via Pipeshift's OpenAI-compatible API.
 * Returns null content (not a throw) on provider errors so callers can degrade gracefully.
 */
export async function callKimi(options: KimiOptions): Promise<KimiResponse | null> {
  const config = getConfig();
  if (!config) {
    console.warn("[kimi] Pipeshift not configured — skipping LLM call");
    return null;
  }

  const { system, messages, temperature = 0.1, maxTokens = 4096, jsonMode = false } = options;

  // Prepend system as first message if provided
  const allMessages: Array<{ role: string; content: string | unknown[] }> = [];
  if (system) {
    allMessages.push({ role: "system", content: system });
  }
  for (const m of messages) {
    allMessages.push({ role: m.role, content: m.content });
  }

  const body: Record<string, unknown> = {
    model: config.modelName,
    messages: allMessages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const startMs = Date.now();

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[kimi] Fetch failed:", err);
    return null;
  }

  const latencyMs = Date.now() - startMs;

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`[kimi] Provider error ${response.status}: ${text}`);
    return null;
  }

  let data: OpenAICompatResponse;
  try {
    data = (await response.json()) as OpenAICompatResponse;
  } catch (err) {
    console.error("[kimi] Failed to parse response JSON:", err);
    return null;
  }

  const content = data.choices?.[0]?.message?.content ?? "";
  const tokensIn = data.usage?.prompt_tokens ?? 0;
  const tokensOut = data.usage?.completion_tokens ?? 0;
  const model = data.model ?? config.modelName;

  console.info(`[kimi] ${model} | in=${tokensIn} out=${tokensOut} latency=${latencyMs}ms`);

  return { content, tokensIn, tokensOut, model };
}

/**
 * Backwards-compatible wrapper for agents.ts which passes raw message arrays
 * and expects string | null back.
 */
export async function callModel(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string | null> {
  const result = await callKimi({
    messages: messages.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    })),
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });
  return result?.content ?? null;
}
