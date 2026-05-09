// ScopeBridge AI — Memory overview (accepted snapshots + recent session memory)
import { auth } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const [snapshots, sessionMemory] = await Promise.all([
    db.memorySnapshot.findMany({
      where: { workspaceId: workspace.id, status: "accepted" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.sessionMemory.findMany({
      where: { workspaceId: workspace.id, userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return ok({ ok: true, snapshots, sessionMemory });
}
