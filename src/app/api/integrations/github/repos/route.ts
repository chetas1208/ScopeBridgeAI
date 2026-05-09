// ScopeBridge AI — List GitHub repositories
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, serverError } from "@/lib/api/response";
import { listRepos } from "@/lib/connectors/github";
import { getConnectedAccount, decryptAccessToken, getOrCreateWorkspace } from "@/lib/workspace";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const account = await getConnectedAccount(workspace.id, "github");
  if (!account || account.status === "disconnected") {
    return err("GitHub account not connected", 400);
  }

  const accessToken = decryptAccessToken(account);

  try {
    const repos = await listRepos(accessToken);
    return ok({ ok: true, repos });
  } catch (e) {
    console.error("[github/repos] error:", e);
    return serverError("Failed to fetch GitHub repositories");
  }
}
