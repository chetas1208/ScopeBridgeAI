// ScopeBridge AI — Update risk status
import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, notFound, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/workspace";

const PatchSchema = z.object({
  status: z.enum(["active", "reviewed", "mitigated", "dismissed"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const risk = await db.deliveryRisk.findFirst({
    where: { id, workspaceId: workspace.id },
  });
  if (!risk) return notFound("DeliveryRisk");

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return err("Invalid request body", 400, parsed.error.flatten());
  }

  try {
    const updated = await db.deliveryRisk.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    return ok({ ok: true, risk: updated });
  } catch (e) {
    console.error("[risks/[id]] PATCH error:", e);
    return serverError("Failed to update risk");
  }
}
