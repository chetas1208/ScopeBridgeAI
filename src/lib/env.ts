// ScopeBridge AI — Typed environment accessor
// Functions (not values) so they are evaluated lazily server-side.

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, defaultValue = ""): string {
  return process.env[key] ?? defaultValue;
}

export const env = {
  DATABASE_URL: () => required("DATABASE_URL"),
  AUTH_SECRET: () => required("AUTH_SECRET"),
  APP_ENCRYPTION_KEY: () => required("APP_ENCRYPTION_KEY"),

  PIPESHIFT_API_KEY: () => optional("PIPESHIFT_API_KEY"),
  PIPESHIFT_BASE_URL: () => optional("PIPESHIFT_BASE_URL", "https://api.pipeshift.com/api/v0"),
  MODEL_NAME: () => optional("MODEL_NAME", "moonshotai/Kimi-K2.6"),
  MAX_CONTEXT_TOKENS: () => parseInt(optional("MAX_CONTEXT_TOKENS", "128000"), 10),

  HYDRADB_API_KEY: () => required("HYDRADB_API_KEY"),
  HYDRADB_BASE_URL: () => required("HYDRADB_BASE_URL"),
  HYDRADB_PROJECT_ID: () => required("HYDRADB_PROJECT_ID"),

  GOOGLE_CLIENT_ID: () => required("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: () => required("GOOGLE_CLIENT_SECRET"),
  GOOGLE_REDIRECT_URI: () =>
    optional(
      "GOOGLE_REDIRECT_URI",
      `${optional("NEXT_PUBLIC_APP_URL", "https://scope-bridge-ai.vercel.app")}/api/integrations/gmail/callback`
    ),

  SLACK_CLIENT_ID: () => required("SLACK_CLIENT_ID"),
  SLACK_CLIENT_SECRET: () => required("SLACK_CLIENT_SECRET"),
  SLACK_BOT_TOKEN: () => required("SLACK_BOT_TOKEN"),
  SLACK_REDIRECT_URI: () =>
    optional(
      "SLACK_REDIRECT_URI",
      `${optional("NEXT_PUBLIC_APP_URL", "https://scope-bridge-ai.vercel.app")}/api/integrations/slack/callback`
    ),

  GITHUB_CLIENT_ID: () => required("GITHUB_CLIENT_ID"),
  GITHUB_CLIENT_SECRET: () => required("GITHUB_CLIENT_SECRET"),
  GITHUB_TOKEN: () => required("GITHUB_TOKEN"),

  NEXT_PUBLIC_APP_URL: () => optional("NEXT_PUBLIC_APP_URL", "https://scope-bridge-ai.vercel.app"),

  DEMO_MODE: () => process.env.DEMO_MODE === "true",

  // Convenience availability booleans
  isPipeshiftAvailable: () =>
    !!(process.env.PIPESHIFT_API_KEY && process.env.PIPESHIFT_BASE_URL && process.env.MODEL_NAME),

  isHydraDBAvailable: () =>
    !!(process.env.HYDRADB_API_KEY && process.env.HYDRADB_BASE_URL),

  isGmailConfigured: () =>
    !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),

  isSlackConfigured: () =>
    !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET) ||
    !!process.env.SLACK_BOT_TOKEN,

  isGitHubConfigured: () =>
    !!(
      process.env.GITHUB_TOKEN ||
      (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
    ),
} as const;
