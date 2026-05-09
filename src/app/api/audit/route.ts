import { NextRequest, NextResponse } from "next/server";
import { runClientPromiseAudit } from "@/lib/agents";
import { DEMO_SOURCE_EVENTS, DEMO_ENGINEERING_SIGNALS, DEMO_RISKS } from "@/lib/mockData";
import type { SourceEvent, EngineeringSignal } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sourceEvents: SourceEvent[] = body.sourceEvents || [];
    const engineeringSignals: EngineeringSignal[] = body.engineeringSignals || [];

    if (sourceEvents.length === 0 && process.env.DEMO_MODE === "true") {
      // Demo mode: use demo data
      return NextResponse.json({ ok: true, risks: DEMO_RISKS, mode: "demo" });
    }

    if (sourceEvents.length === 0) {
      return NextResponse.json({ ok: false, error: "No source events provided. Add sources first." }, { status: 400 });
    }

    const risks = await runClientPromiseAudit(sourceEvents, engineeringSignals);
    return NextResponse.json({ ok: true, risks, mode: "live" });
  } catch (error) {
    console.error("Audit failed:", error);
    return NextResponse.json({ ok: false, error: "Audit failed" }, { status: 500 });
  }
}
