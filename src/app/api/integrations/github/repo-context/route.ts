// ScopeBridge AI — Fetch full GitHub repo context, store as SourceItem, upload to HydraDB
import { type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, serverError } from "@/lib/api/response";
import { getRepoContext } from "@/lib/connectors/github";
import { getConnectedAccount, decryptAccessToken, getOrCreateWorkspace } from "@/lib/workspace";
import { db } from "@/lib/db";
import { uploadKnowledge } from "@/lib/hydradb";
import { estimateTokens } from "@/lib/context/token-budget";

const RepoContextSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const body = await req.json().catch(() => null);
  const parsed = RepoContextSchema.safeParse(body);
  if (!parsed.success) {
    return err("Invalid request body", 400, parsed.error.flatten());
  }

  const { owner, repo } = parsed.data;

  const account = await getConnectedAccount(workspace.id, "github");
  if (!account || account.status === "disconnected") {
    return err("GitHub account not connected", 400);
  }

  const accessToken = decryptAccessToken(account);

  let context;
  try {
    context = await getRepoContext(accessToken, owner, repo);
  } catch (e) {
    console.error("[github/repo-context] error:", e);
    return serverError("Failed to fetch repository context");
  }

  // Build a rich content string for storage
  const content = [
    `# ${context.repo.fullName}`,
    context.repo.description ? `\n${context.repo.description}\n` : "",
    context.readme ? `\n## README\n${context.readme.slice(0, 4000)}\n` : "",
    context.openIssues.length
      ? `\n## Open Issues (${context.openIssues.length})\n` +
        context.openIssues
          .slice(0, 20)
          .map((i) => `- #${i.number}: ${i.title} [${i.state}]`)
          .join("\n")
      : "",
    context.openPRs.length
      ? `\n## Open Pull Requests (${context.openPRs.length})\n` +
        context.openPRs
          .slice(0, 20)
          .map((p) => `- #${p.number}: ${p.title}${p.isDraft ? " [draft]" : ""}`)
          .join("\n")
      : "",
    context.recentCommits.length
      ? `\n## Recent Commits\n` +
        context.recentCommits
          .slice(0, 10)
          .map((c) => `- ${c.sha} ${c.message} (${c.author})`)
          .join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const sourceId = `github-${workspace.id}-${owner}-${repo}`.slice(0, 30);

  await db.sourceItem.upsert({
    where: { id: sourceId },
    create: {
      id: sourceId,
      workspaceId: workspace.id,
      sourceType: "github",
      externalId: `${owner}/${repo}`,
      title: `GitHub: ${owner}/${repo}`,
      content,
      author: owner,
      url: context.repo.url,
      tokenCount: estimateTokens(content),
      occurredAt: new Date(context.repo.updatedAt),
      metadata: { owner, repo, openIssuesCount: context.repo.openIssuesCount } as Prisma.InputJsonValue,
    },
    update: {
      content,
      tokenCount: estimateTokens(content),
      occurredAt: new Date(context.repo.updatedAt),
    },
  });

  // Upload to HydraDB for long-term recall
  await uploadKnowledge(workspace.id, session.user.id, content, `GitHub: ${owner}/${repo}`);

  return ok({ ok: true, context });
}
