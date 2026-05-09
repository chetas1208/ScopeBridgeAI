import { NextResponse } from "next/server";

export async function POST() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ ok: false, error: "Gmail not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local" }, { status: 400 });
  }
  // TODO: real Gmail sync using OAuth tokens + Gmail API
  return NextResponse.json({ ok: false, error: "Gmail sync not yet implemented. Use manual input." }, { status: 501 });
}
