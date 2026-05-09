// ScopeBridge AI — List memory snapshots (pending + accepted)
import { auth } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const snapshots = await db.memorySnapshot.findMany({
    where: {
      workspaceId: workspace.id,
      status: { in: ["pending", "accepted"] },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return ok({ ok: true, snapshots });
}
