// ScopeBridge AI — Slack OAuth callback
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { err, unauthorized } from "@/lib/api/response";
import { exchangeSlackCode } from "@/lib/connectors/slack";
import { upsertConnectedAccount } from "@/lib/workspace";

export async function GET(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return err(`Slack OAuth denied: ${errorParam}`, 400);
  }

  if (!code || !state) {
    return err("Missing code or state parameter", 400);
  }

  let workspaceId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8")) as {
      workspaceId: string;
    };
    workspaceId = decoded.workspaceId;
  } catch {
    return err("Invalid state parameter", 400);
  }

  try {
    const tokens = await exchangeSlackCode(code);
    await upsertConnectedAccount(
      workspaceId,
      "slack",
      tokens.accessToken,
      undefined,
      tokens.scope
    );
  } catch (e) {
    console.error("[slack/callback] token exchange failed:", e);
    return err("Failed to connect Slack account", 500);
  }

  return redirect("/dashboard/sources?connected=slack");
}
