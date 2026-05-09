// ScopeBridge AI — Update or reject a specific ActionDraft
import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, notFound, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/workspace";

const PatchSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  target: z.string().optional(),
}).refine((d) => d.title !== undefined || d.body !== undefined || d.target !== undefined, {
  message: "At least one of title, body, or target must be provided",
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const draft = await db.actionDraft.findFirst({
    where: { id, workspaceId: workspace.id },
  });
  if (!draft) return notFound("ActionDraft");

  if (draft.status === "executed" || draft.status === "rejected") {
    return err(`Cannot edit a draft with status "${draft.status}"`, 400);
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return err("Invalid request body", 400, parsed.error.flatten());
  }

  try {
    const updated = await db.actionDraft.update({
      where: { id },
      data: {
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
        ...(parsed.data.body ? { body: parsed.data.body } : {}),
        ...(parsed.data.target !== undefined ? { target: parsed.data.target } : {}),
      },
    });

    return ok({ ok: true, draft: updated });
  } catch (e) {
    console.error("[action-drafts/[id]] PATCH error:", e);
    return serverError("Failed to update draft");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const draft = await db.actionDraft.findFirst({
    where: { id, workspaceId: workspace.id },
  });
  if (!draft) return notFound("ActionDraft");

  try {
    const updated = await db.actionDraft.update({
      where: { id },
      data: { status: "rejected" },
    });

    return ok({ ok: true, draft: updated });
  } catch (e) {
    console.error("[action-drafts/[id]] DELETE error:", e);
    return serverError("Failed to reject draft");
  }
}
