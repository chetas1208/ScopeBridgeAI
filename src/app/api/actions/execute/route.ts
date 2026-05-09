// ScopeBridge AI — Approve and execute an ActionDraft
import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, notFound, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getOrCreateWorkspace, verifyWorkspaceAccess } from "@/lib/workspace";
import { executeAction } from "@/lib/actions/execute-action";

const ExecuteSchema = z.object({
  draftId: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = ExecuteSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return err("Invalid request body", 400, parsed.error.flatten());
  }

  const { draftId } = parsed.data;
  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const hasAccess = await verifyWorkspaceAccess(session.user.id, workspace.id);
  if (!hasAccess) return err("Access denied", 403);

  const draft = await db.actionDraft.findFirst({
    where: { id: draftId, workspaceId: workspace.id },
  });
  if (!draft) return notFound("ActionDraft");

  if (draft.status === "executed") {
    return err("Draft has already been executed", 400);
  }

  if (draft.status === "rejected") {
    return err("Cannot execute a rejected draft", 400);
  }

  // Approve before executing
  await db.actionDraft.update({
    where: { id: draftId },
    data: { status: "approved" },
  });

  try {
    const result = await executeAction({
      draftId,
      workspaceId: workspace.id,
      userId: session.user.id,
    });

    if (!result.ok) {
      return err(result.error ?? "Execution failed", 500);
    }

    return ok({ ok: true, externalUrl: result.externalUrl });
  } catch (e) {
    console.error("[actions/execute] error:", e);
    return serverError("Execution failed");
  }
}
