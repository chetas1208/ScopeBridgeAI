import { NextResponse } from "next/server";
export async function POST() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ ok: false, error: "Gmail not configured." }, { status: 400 });
  }
  return NextResponse.json({ ok: false, error: "Gmail watch not yet implemented." }, { status: 501 });
}
