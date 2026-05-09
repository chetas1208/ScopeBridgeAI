// ScopeBridge AI — List Slack channels
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, serverError } from "@/lib/api/response";
import { getChannels } from "@/lib/connectors/slack";
import { getConnectedAccount, decryptAccessToken, getOrCreateWorkspace } from "@/lib/workspace";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const account = await getConnectedAccount(workspace.id, "slack");
  if (!account || account.status === "disconnected") {
    return err("Slack account not connected", 400);
  }

  const accessToken = decryptAccessToken(account);

  try {
    const channels = await getChannels(accessToken);
    return ok({ ok: true, channels });
  } catch (e) {
    console.error("[slack/channels] error:", e);
    return serverError("Failed to fetch Slack channels");
  }
}
