// ScopeBridge AI — Pipeshift LLM Integration

interface PipeshiftConfig {
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

function getConfig(): PipeshiftConfig | null {
  const apiKey = process.env.PIPESHIFT_API_KEY;
  const baseUrl = process.env.PIPESHIFT_BASE_URL;
  const modelName = process.env.MODEL_NAME;

  if (!apiKey || !baseUrl || !modelName) {
    return null;
  }

  return { apiKey, baseUrl, modelName };
}

export function isPipeshiftAvailable(): boolean {
  return getConfig() !== null;
}

export async function callModel(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string | null> {
  const config = getConfig();
  if (!config) return null;

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelName,
        messages,
        temperature: options?.temperature ?? 0.1,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      console.error(
        `Pipeshift API error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    console.error("Pipeshift call failed:", error);
    return null;
  }
}
