// ScopeBridge AI — GitHub sync (refresh context for connected repos)
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, serverError } from "@/lib/api/response";
import { getRepoContext } from "@/lib/connectors/github";
import { getConnectedAccount, decryptAccessToken, getOrCreateWorkspace } from "@/lib/workspace";
import { db } from "@/lib/db";
import { uploadKnowledge } from "@/lib/hydradb";
import { estimateTokens } from "@/lib/context/token-budget";

export async function POST(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const workspace = await getOrCreateWorkspace(session.user.id, session.user.name);

  const account = await getConnectedAccount(workspace.id, "github");
  if (!account || account.status === "disconnected") {
    return err("GitHub account not connected", 400);
  }

  const accessToken = decryptAccessToken(account);

  const syncJob = await db.connectorSyncJob.create({
    data: {
      workspaceId: workspace.id,
      provider: "github",
      status: "running",
    },
  });

  // Find existing GitHub source items to determine which repos to refresh
  const githubSources = await db.sourceItem.findMany({
    where: { workspaceId: workspace.id, sourceType: "github" },
    select: { externalId: true, metadata: true },
  });

  // Extract owner/repo pairs from metadata or externalId
  const repoPairs = new Set<string>();
  for (const source of githubSources) {
    const meta = source.metadata as Record<string, string> | null;
    if (meta?.owner && meta?.repo) {
      repoPairs.add(`${meta.owner}/${meta.repo}`);
    } else if (source.externalId && source.externalId.includes("/")) {
      repoPairs.add(source.externalId);
    }
  }

  let itemsSynced = 0;

  await Promise.all(
    Array.from(repoPairs).slice(0, 10).map(async (fullName) => {
      const [owner, repo] = fullName.split("/");
      if (!owner || !repo) return;

      try {
        const context = await getRepoContext(accessToken, owner, repo);

        const content = [
          `# ${context.repo.fullName}`,
          context.repo.description ? `\n${context.repo.description}\n` : "",
          context.readme ? `\n## README\n${context.readme.slice(0, 4000)}\n` : "",
          context.openIssues.length
            ? `\n## Open Issues\n` +
              context.openIssues.slice(0, 20).map((i) => `- #${i.number}: ${i.title}`).join("\n")
            : "",
          context.openPRs.length
            ? `\n## Open PRs\n` +
              context.openPRs.slice(0, 20).map((p) => `- #${p.number}: ${p.title}`).join("\n")
            : "",
          context.recentCommits.length
            ? `\n## Recent Commits\n` +
              context.recentCommits.slice(0, 10).map((c) => `- ${c.sha} ${c.message}`).join("\n")
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
            externalId: fullName,
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

        await uploadKnowledge(workspace.id, session.user.id, content, `GitHub: ${owner}/${repo}`);
        itemsSynced++;
      } catch (e) {
        console.warn(`[sync/github] failed to refresh ${fullName}:`, e);
      }
    })
  );

  await db.connectorSyncJob.update({
    where: { id: syncJob.id },
    data: { status: "complete", itemsSynced, completedAt: new Date() },
  });

  return ok({ ok: true, itemsSynced, syncJobId: syncJob.id });
}
