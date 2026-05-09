import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildContextPack } from "@/lib/contextBuilder";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, sourceIds } = await req.json();

  // Find workspace
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  // Load sources
  const sources = await db.sourceItem.findMany({
    where: { id: { in: sourceIds }, workspaceId }
  });

  // Build Context
  const contextPack = await buildContextPack(workspace.id, sources);

  // In a real stream, we would use Server-Sent Events (SSE) here with Next.js Streaming responses
  // and Pipeshift's OpenAI-compatible streaming API.
  // For this immediate API, we return the parsed structure synchronously (can be updated to SSE later).

  const mockRisks = [
    {
      title: "Missing engineering ticket for client promise",
      severity: "high",
      type: "missing_ticket",
      clientPromise: "We will deliver the SSO feature by next week.",
      engineeringReality: "No SSO tickets exist in the current sprint.",
      evidenceQuote: "We will deliver the SSO feature by next week.",
      confidence: 0.95,
      recommendedAction: "Create GitHub Issue for SSO implementation"
    }
  ];

  // Save risks to DB
  const auditRun = await db.auditRun.create({
    data: {
      workspaceId: workspace.id,
      status: "complete",
      sourceEventCount: sources.length,
      risksFound: mockRisks.length,
    }
  });

  for (const r of mockRisks) {
    const dbRisk = await db.deliveryRisk.create({
      data: {
        workspaceId: workspace.id,
        auditRunId: auditRun.id,
        type: r.type,
        severity: r.severity,
        title: r.title,
        clientPromise: r.clientPromise,
        engineeringReality: r.engineeringReality,
        evidenceQuote: r.evidenceQuote,
        confidence: r.confidence,
        recommendedAction: r.recommendedAction,
      }
    });

    // Create action draft
    await db.actionDraft.create({
      data: {
        riskId: dbRisk.id,
        type: "github_issue",
        title: "Draft GitHub Issue",
        body: "Title: Implement SSO\n\nClient has requested SSO. This is missing from our sprint.",
      }
    });
  }

  return NextResponse.json({ ok: true, auditRunId: auditRun.id, risks: mockRisks });
}
