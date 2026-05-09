import { NextRequest, NextResponse } from "next/server";
import { generateSlackEscalation } from "@/lib/agents";
import type { DeliveryRisk } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const risk: DeliveryRisk = body.risk;
    if (!risk) return NextResponse.json({ ok: false, error: "Missing risk" }, { status: 400 });
    const action = await generateSlackEscalation(risk);
    return NextResponse.json({ ok: true, action });
  } catch (error) {
    console.error("Slack escalation generation failed:", error);
    return NextResponse.json({ ok: false, error: "Generation failed" }, { status: 500 });
  }
}
