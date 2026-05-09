// ScopeBridge AI — Update workspace settings
import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, serverError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/workspace";

const SettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tokenBudget: z.number().int().min(1000).max(200000).optional(),
}).refine((d) => d.name !== undefined || d.tokenBudget !== undefined, {
  message: "At least one field (name or tokenBudget) must be provided",
});

export async function PATCH(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = SettingsSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return err("Invalid request body", 400, parsed.error.flatten());
  }

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  try {
    const updated = await db.workspace.update({
      where: { id: workspace.id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
      },
    });

    return ok({ ok: true, workspace: updated });
  } catch (e) {
    console.error("[workspace/settings] PATCH error:", e);
    return serverError("Failed to update workspace settings");
  }
}
