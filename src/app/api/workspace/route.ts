// ScopeBridge AI — Current workspace info
import { auth } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const [workspaceData, connectedAccounts] = await Promise.all([
    db.workspace.findUnique({ where: { id: workspace.id } }),
    db.connectedAccount.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        provider: true,
        status: true,
        scopes: true,
        expiresAt: true,
        providerAccountId: true,
        createdAt: true,
        updatedAt: true,
        // Intentionally omit encryptedAccessToken and encryptedRefreshToken
      },
    }),
  ]);

  return ok({
    ok: true,
    workspace: workspaceData,
    connectedAccounts,
  });
}
