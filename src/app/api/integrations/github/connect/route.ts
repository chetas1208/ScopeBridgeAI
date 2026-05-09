// ScopeBridge AI — GitHub OAuth initiation
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/api/response";
import { buildGitHubAuthUrl } from "@/lib/connectors/github";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const state = Buffer.from(
    JSON.stringify({
      workspaceId: workspace.id,
      nonce: Math.random().toString(36).slice(2),
    })
  ).toString("base64");

  return redirect(buildGitHubAuthUrl(state));
}
