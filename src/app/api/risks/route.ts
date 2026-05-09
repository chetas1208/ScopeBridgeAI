// ScopeBridge AI — List DeliveryRisks for workspace
import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");

  const validStatuses = ["active", "reviewed", "mitigated", "dismissed"];
  const statusFilter =
    status && validStatuses.includes(status) ? status : undefined;

  const risks = await db.deliveryRisk.findMany({
    where: {
      workspaceId: workspace.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: {
      evidence: true,
      actionDrafts: {
        where: { status: { not: "rejected" } },
        select: {
          id: true,
          type: true,
          title: true,
          status: true,
          requiresConfirmation: true,
          target: true,
        },
      },
    },
    orderBy: [
      { severity: "asc" }, // critical first (alphabetical: critical < high < low < medium)
      { createdAt: "desc" },
    ],
  });

  return ok({ ok: true, risks });
}
