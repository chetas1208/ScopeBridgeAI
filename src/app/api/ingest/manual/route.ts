import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateId } from "@/lib/utils";
import type { SourceEvent } from "@/lib/types";

const ManualIngestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  author: z.string().optional().default("Manual Entry"),
  sourceType: z.enum(["manual", "upload"]).optional().default("manual"),
  projectId: z.string().optional().default("proj-1"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ManualIngestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { title, content, author, sourceType, projectId } = parsed.data;
    const event: SourceEvent = {
      id: generateId(),
      projectId,
      sourceType,
      title,
      content,
      author,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, event });
  } catch (error) {
    console.error("Manual ingest failed:", error);
    return NextResponse.json({ ok: false, error: "Ingestion failed" }, { status: 500 });
  }
}
