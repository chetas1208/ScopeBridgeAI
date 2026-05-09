// ScopeBridge AI — Disconnect an OAuth provider
import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, serverError } from "@/lib/api/response";
import { disconnectProvider, getOrCreateWorkspace } from "@/lib/workspace";

const DisconnectSchema = z.object({
  provider: z.enum(["gmail", "slack", "github"]),
});

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = DisconnectSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return err("Invalid request body — provider must be gmail, slack, or github", 400);
  }

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  try {
    await disconnectProvider(workspace.id, parsed.data.provider);
    return ok({ ok: true, provider: parsed.data.provider });
  } catch (e) {
    console.error("[connectors/disconnect] error:", e);
    return serverError("Failed to disconnect provider");
  }
}
