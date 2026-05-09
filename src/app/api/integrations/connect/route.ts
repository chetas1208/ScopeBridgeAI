import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !session.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider } = await req.json(); // gmail, slack, github

  if (!["gmail", "slack", "github"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  // Find or create workspace for user
  let workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } }
  });

  if (!workspace) {
    workspace = await db.workspace.create({
      data: {
        name: "My Workspace",
        slug: `ws-${Date.now()}`,
        members: { create: { userId: session.user.id, role: "OWNER" } }
      }
    });
  }

  // Simulate OAuth connection by just creating a connected account
  await db.connectedAccount.upsert({
    where: { workspaceId_provider: { workspaceId: workspace.id, provider } },
    create: {
      workspaceId: workspace.id,
      provider,
      providerAccountId: "simulated-id",
      encryptedAccessToken: "simulated-access-token",
      status: "active"
    },
    update: { status: "active" }
  });

  return NextResponse.json({ ok: true, provider, status: "Connected" });
}
