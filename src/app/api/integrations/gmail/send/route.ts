// ScopeBridge AI — Send email via approved ActionDraft
import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, notFound, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { executeAction } from "@/lib/actions/execute-action";

const SendSchema = z.object({
  draftId: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const body = await req.json().catch(() => null);
  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) {
    return err("Invalid request body", 400, parsed.error.flatten());
  }

  const { draftId } = parsed.data;

  const draft = await db.actionDraft.findFirst({
    where: { id: draftId, workspaceId: workspace.id },
  });
  if (!draft) return notFound("ActionDraft");

  if (draft.type !== "email") {
    return err(`Draft type "${draft.type}" is not an email`, 400);
  }

  // Approve the draft before executing
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
    if (!result.ok) return err(result.error ?? "Send failed", 500);
    return ok({ ok: true, externalUrl: result.externalUrl });
  } catch (e) {
    console.error("[gmail/send] executeAction failed:", e);
    return serverError("Failed to send email");
  }
}
