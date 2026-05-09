import { NextResponse } from "next/server";

export async function POST() {
  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ ok: false, error: "GitHub not configured. Add GITHUB_TOKEN to .env.local" }, { status: 400 });
  }
  // TODO: real GitHub sync using Octokit
  return NextResponse.json({ ok: false, error: "GitHub sync not yet implemented. Use manual input." }, { status: 501 });
}
