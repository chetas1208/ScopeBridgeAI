import { NextResponse } from "next/server";

export async function GET() {
  const health = {
    database: !!process.env.DATABASE_URL,
    gmail: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    slack: !!process.env.SLACK_BOT_TOKEN,
    github: !!process.env.GITHUB_TOKEN,
    model: !!(process.env.PIPESHIFT_API_KEY && process.env.PIPESHIFT_BASE_URL && process.env.MODEL_NAME),
    hydradb: !!(process.env.HYDRADB_API_KEY && process.env.HYDRADB_BASE_URL),
    demoMode: process.env.DEMO_MODE === "true",
  };
  return NextResponse.json(health);
}
