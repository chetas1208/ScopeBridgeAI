// ScopeBridge AI — GitHub OAuth callback
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { err, unauthorized } from "@/lib/api/response";
import { exchangeGitHubCode } from "@/lib/connectors/github";
import { upsertConnectedAccount } from "@/lib/workspace";

export async function GET(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return err(`GitHub OAuth denied: ${errorParam}`, 400);
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
    const tokens = await exchangeGitHubCode(code);
    await upsertConnectedAccount(
      workspaceId,
      "github",
      tokens.accessToken,
      undefined,
      tokens.scope
    );
  } catch (e) {
    console.error("[github/callback] token exchange failed:", e);
    return err("Failed to connect GitHub account", 500);
  }

  return redirect("/dashboard/sources?connected=github");
}
