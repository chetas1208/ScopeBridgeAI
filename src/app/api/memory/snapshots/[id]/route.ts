// ScopeBridge AI — Accept or reject a memory snapshot
import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, notFound, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { acceptMemorySnapshot, rejectMemorySnapshot } from "@/lib/memory/context-memory";
import { getOrCreateWorkspace } from "@/lib/workspace";

const ActionSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const snapshot = await db.memorySnapshot.findFirst({
    where: { id, workspaceId: workspace.id },
  });
  if (!snapshot) return notFound("MemorySnapshot");

  const body = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return err("Invalid request body — action must be 'accept' or 'reject'", 400);
  }

  try {
    if (parsed.data.action === "accept") {
      await acceptMemorySnapshot(id);
    } else {
      await rejectMemorySnapshot(id);
    }

    return ok({ ok: true, action: parsed.data.action, snapshotId: id });
  } catch (e) {
    console.error("[memory/snapshots/[id]] POST error:", e);
    return serverError("Failed to update snapshot");
  }
}
