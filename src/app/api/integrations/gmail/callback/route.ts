// ScopeBridge AI — Gmail OAuth callback
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { err, unauthorized } from "@/lib/api/response";
import { exchangeGmailCode } from "@/lib/connectors/gmail";
import { upsertConnectedAccount } from "@/lib/workspace";

export async function GET(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return err(`Gmail OAuth denied: ${errorParam}`, 400);
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
    const tokens = await exchangeGmailCode(code);
    await upsertConnectedAccount(
      workspaceId,
      "gmail",
      tokens.accessToken,
      tokens.refreshToken,
      tokens.scope,
      tokens.expiresAt
    );
  } catch (e) {
    console.error("[gmail/callback] token exchange failed:", e);
    return err("Failed to connect Gmail account", 500);
  }

  return redirect("/dashboard/sources?connected=gmail");
}
