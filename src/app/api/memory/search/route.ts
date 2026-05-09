// ScopeBridge AI — HydraDB semantic memory search
import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, serverError } from "@/lib/api/response";
import { fullRecall } from "@/lib/hydradb";
import { getOrCreateWorkspace } from "@/lib/workspace";

const SearchSchema = z.object({
  query: z.string().min(1, "Query is required"),
});

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = SearchSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return err("Invalid request body", 400, parsed.error.flatten());
  }

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  try {
    const results = await fullRecall(workspace.id, session.user.id, parsed.data.query);
    return ok({ ok: true, results });
  } catch (e) {
    console.error("[memory/search] HydraDB error:", e);
    return serverError("Memory search failed");
  }
}
