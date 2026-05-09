// ScopeBridge AI — Manual source item ingestion
import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { uploadKnowledge } from "@/lib/hydradb";
import { saveSessionMemory } from "@/lib/memory/session-memory";
import { estimateTokens } from "@/lib/context/token-budget";

const ManualIngestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  author: z.string().optional().default("Manual Entry"),
  sourceType: z.enum(["manual", "upload"]).optional().default("manual"),
});

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = ManualIngestSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return err("Invalid input", 400, parsed.error.flatten());
  }

  const { title, content, author, sourceType } = parsed.data;

  try {
    const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

    const tokenCount = estimateTokens(content);

    const sourceItem = await db.sourceItem.create({
      data: {
        workspaceId: workspace.id,
        sourceType,
        title,
        content,
        author,
        tokenCount,
        occurredAt: new Date(),
      },
    });

    // Upload to HydraDB for long-term recall
    await uploadKnowledge(workspace.id, session.user.id, content, title);

    // Save to session memory
    await saveSessionMemory(
      workspace.id,
      session.user.id,
      "project_fact",
      `Ingested source: "${title}" (${sourceType}) — ${tokenCount} tokens`,
      { sourceItemId: sourceItem.id, sourceType }
    ).catch(() => {/* non-fatal */});

    return ok({ ok: true, sourceItem });
  } catch (e) {
    console.error("[ingest/manual] error:", e);
    return serverError("Ingestion failed");
  }
}
