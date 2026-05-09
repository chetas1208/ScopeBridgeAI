import { NextResponse } from "next/server";

export async function POST() {
  if (!process.env.SLACK_BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: "Slack not configured. Add SLACK_BOT_TOKEN to .env.local" }, { status: 400 });
  }
  // TODO: real Slack sync using Slack API
  return NextResponse.json({ ok: false, error: "Slack sync not yet implemented. Use manual input." }, { status: 501 });
}
