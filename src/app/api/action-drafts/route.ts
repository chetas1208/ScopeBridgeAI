// ScopeBridge AI — List pending ActionDrafts for workspace
import { auth } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const drafts = await db.actionDraft.findMany({
    where: {
      workspaceId: workspace.id,
      status: { in: ["pending", "approved"] },
    },
    include: {
      risk: {
        select: {
          id: true,
          title: true,
          severity: true,
          category: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok({ ok: true, drafts });
}
