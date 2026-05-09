// ScopeBridge AI — Streaming audit via Server-Sent Events
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { buildContextPack } from "@/lib/context/build-context-pack";
import { callKimi, isPipeshiftAvailable } from "@/lib/kimi";
import { AUDIT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { safeJsonParse } from "@/lib/utils";
import { saveSessionMemory } from "@/lib/memory/session-memory";
import { saveMemorySnapshot } from "@/lib/memory/context-memory";
import { addMemory } from "@/lib/hydradb";
import { DEMO_SOURCE_EVENTS } from "@/lib/mockData";
import { estimateTokens } from "@/lib/context/token-budget";
import type { AuditOutput, AuditRisk, AuditActionDraft, MemoryUpdate } from "@/lib/ai/types";

// Deterministic fallback when Kimi is not available
function buildDeterministicOutput(sourceCount: number): AuditOutput {
  return {
    summary: `Deterministic audit of ${sourceCount} sources. Enable Pipeshift (PIPESHIFT_API_KEY) for AI-powered analysis.`,
    health_score: 70,
    risks: [
      {
        title: "AI analysis unavailable",
        severity: "medium",
        category: "other",
        confidence: 1.0,
        client_promise: "N/A",
        engineering_reality: "Pipeshift API key is not configured",
        evidence: [],
        recommended_action: "Add PIPESHIFT_API_KEY, PIPESHIFT_BASE_URL, and MODEL_NAME to your environment",
        missing_information: [],
      },
    ],
    action_drafts: [],
    memory_updates: [],
  };
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json().catch(() => ({})) as {
    workspaceId?: string;
    sourceIds?: string[];
    syncFirst?: boolean;
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown): void {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        // 1. Auth + workspace
        send("status", { message: "Authenticating..." });
        const workspace = await getOrCreateWorkspace(userId, session.user?.name);
        const workspaceId = workspace.id;

        // 2. Load source items
        send("status", { message: "Loading sources..." });

        let sourceIds = body.sourceIds;
        let demoMode = false;

        // Check for demo mode with no sources
        const existingCount = await db.sourceItem.count({ where: { workspaceId } });
        if (process.env.DEMO_MODE === "true" && existingCount === 0) {
          demoMode = true;
          // Load demo events into DB temporarily
          await Promise.all(
            DEMO_SOURCE_EVENTS.map(async (e) => {
              const id = `demo-${workspaceId}-${e.id}`.slice(0, 30);
              return db.sourceItem.upsert({
                where: { id },
                create: {
                  id,
                  workspaceId,
                  sourceType: e.sourceType,
                  title: e.title,
                  content: e.content,
                  author: e.author,
                  tokenCount: estimateTokens(e.content),
                  occurredAt: new Date(e.occurredAt),
                },
                update: {},
              });
            })
          );
        }

        const dbSources = await db.sourceItem.findMany({
          where: {
            workspaceId,
            ...(sourceIds && sourceIds.length > 0 ? { id: { in: sourceIds } } : {}),
          },
          orderBy: { occurredAt: "desc" },
          take: 200,
        });

        if (dbSources.length === 0) {
          send("error", { message: "No sources found. Add sources before running an audit." });
          controller.close();
          return;
        }

        send("status", { message: `Loaded ${dbSources.length} sources` });

        // 3. Pull HydraDB context
        send("status", { message: "Recalling long-term memory..." });

        // 4. Build context pack
        send("status", { message: "Building context pack..." });
        const contextPack = await buildContextPack(
          workspaceId,
          userId,
          sourceIds,
          "delivery risk audit"
        );

        send("status", {
          message: `Context pack ready (${contextPack.totalTokens} tokens, ${contextPack.sources.length} sources${contextPack.truncated ? ", truncated" : ""})`,
        });

        // 5. Call Kimi
        let auditOutput: AuditOutput;

        if (!isPipeshiftAvailable()) {
          send("status", { message: "Pipeshift not configured — using deterministic analysis..." });
          auditOutput = buildDeterministicOutput(dbSources.length);
        } else {
          send("status", { message: "Calling Kimi K2.6 via Pipeshift..." });

          const userContent = JSON.stringify({
            sources: contextPack.sources.map((s) => ({
              id: s.id,
              sourceType: s.sourceType,
              title: s.title,
              content: s.content,
              author: s.author,
              timestamp: s.timestamp,
            })),
            hydra_context: contextPack.hydraContext || null,
            workspace_id: workspaceId,
          });

          const kimiResult = await callKimi({
            system: AUDIT_SYSTEM_PROMPT,
            messages: [{ role: "user", content: userContent }],
            temperature: 0.1,
            maxTokens: 8192,
            jsonMode: true,
          });

          if (!kimiResult || !kimiResult.content) {
            send("status", { message: "Kimi returned no output — using deterministic fallback..." });
            auditOutput = buildDeterministicOutput(dbSources.length);
          } else {
            const parsed = safeJsonParse<AuditOutput>(kimiResult.content, {
              summary: "Failed to parse audit output",
              health_score: 50,
              risks: [],
              action_drafts: [],
              memory_updates: [],
            });
            auditOutput = parsed;
          }
        }

        // 6. Persist AuditRun
        send("status", { message: `Persisting ${auditOutput.risks.length} risks...` });

        const auditRun = await db.auditRun.create({
          data: {
            workspaceId,
            status: "complete",
            sourceEventCount: dbSources.length,
            risksFound: auditOutput.risks.length,
          },
        });

        // 7. Persist risks, evidence, and action drafts
        const savedRisks = await Promise.all(
          auditOutput.risks.map(async (risk: AuditRisk) => {
            const dbRisk = await db.deliveryRisk.create({
              data: {
                workspaceId,
                auditRunId: auditRun.id,
                type: risk.category ?? "other",
                category: risk.category,
                severity: risk.severity,
                title: risk.title,
                clientPromise: risk.client_promise,
                engineeringReality: risk.engineering_reality,
                evidenceQuote: risk.evidence.map((e) => e.quote).join("\n---\n") || risk.title,
                missingInformation: risk.missing_information as unknown as import("@prisma/client").Prisma.InputJsonValue,
                confidence: risk.confidence,
                recommendedAction: risk.recommended_action,
                status: "active",
              },
            });

            // Persist evidence
            if (risk.evidence?.length) {
              await Promise.all(
                risk.evidence.map((ev) =>
                  db.riskEvidence.create({
                    data: {
                      riskId: dbRisk.id,
                      sourceType: ev.sourceType,
                      sourceId: ev.sourceId,
                      quote: ev.quote,
                      timestamp: ev.timestamp ? new Date(ev.timestamp) : null,
                    },
                  }).catch(() => {/* non-fatal */})
                )
              );
            }

            return dbRisk;
          })
        );

        // 8. Persist action drafts (linked to first risk if available)
        const savedDrafts = await Promise.all(
          auditOutput.action_drafts.map(async (draft: AuditActionDraft, i: number) => {
            const riskId = savedRisks[i]?.id ?? savedRisks[0]?.id ?? null;
            return db.actionDraft.create({
              data: {
                workspaceId,
                riskId,
                type: draft.type,
                title: draft.title,
                body: draft.body,
                target: draft.target || null,
                status: "pending",
                requiresConfirmation: draft.requiresConfirmation ?? true,
              },
            });
          })
        );

        // 9. Store audit summary in session memory
        send("status", { message: "Saving to memory..." });

        await saveSessionMemory(
          workspaceId,
          userId,
          "session_summary",
          `Audit completed. Health score: ${auditOutput.health_score}/100. ${auditOutput.risks.length} risks found. Summary: ${auditOutput.summary}`,
          { auditRunId: auditRun.id, healthScore: auditOutput.health_score, riskCount: auditOutput.risks.length }
        ).catch(() => {/* non-fatal */});

        // 10. Store memory updates
        await Promise.all(
          (auditOutput.memory_updates ?? []).map(async (mu: MemoryUpdate) => {
            await saveMemorySnapshot(workspaceId, userId, mu.kind, mu.text, mu.confidence).catch(() => {});
            await addMemory(workspaceId, userId, mu.text, { kind: mu.kind, confidence: mu.confidence }).catch(() => {});
          })
        );

        // 11. Clean up demo sources if we injected them
        if (demoMode) {
          await db.sourceItem.deleteMany({
            where: { workspaceId, id: { startsWith: `demo-${workspaceId}-` } },
          }).catch(() => {});
        }

        send("complete", {
          auditRunId: auditRun.id,
          risks: savedRisks,
          actionDrafts: savedDrafts,
          healthScore: auditOutput.health_score,
          summary: auditOutput.summary,
        });
      } catch (err) {
        console.error("[audit/run] stream error:", err);
        send("error", {
          message: err instanceof Error ? err.message : "Audit failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
