// ScopeBridge AI — Context pack builder
import { db } from "@/lib/db";
import { fullRecall } from "@/lib/hydradb";
import { env } from "@/lib/env";
import { estimateTokens, buildTokenBudget } from "./token-budget";
import type { ContextPack, ContextSource } from "@/lib/ai/types";

/**
 * Builds a ContextPack from workspace source items plus HydraDB long-term recall.
 *
 * @param workspaceId - The workspace to load sources from.
 * @param userId - Used for HydraDB sub-tenant isolation.
 * @param sourceIds - If provided, only these source items are included. Otherwise all workspace sources.
 * @param query - Query string for HydraDB recall. Defaults to source titles joined together.
 */
export async function buildContextPack(
  workspaceId: string,
  userId: string,
  sourceIds?: string[],
  query?: string
): Promise<ContextPack> {
  const budget = env.MAX_CONTEXT_TOKENS();

  // 1. Load source items from Postgres
  const dbSources = await db.sourceItem.findMany({
    where: {
      workspaceId,
      ...(sourceIds && sourceIds.length > 0 ? { id: { in: sourceIds } } : {}),
    },
    orderBy: { occurredAt: "desc" },
  });

  // 2. Map to ContextSource with token counts
  const rawSources: ContextSource[] = dbSources.map((s) => {
    const content = s.content;
    const tokenCount = s.tokenCount > 0 ? s.tokenCount : estimateTokens(content);
    return {
      id: s.id,
      sourceType: s.sourceType,
      title: s.title,
      content,
      author: s.author ?? undefined,
      url: s.url ?? undefined,
      timestamp: s.occurredAt.toISOString(),
      tokenCount,
    };
  });

  // 3. Reserve ~10% of budget for HydraDB context
  const hydraBudget = Math.floor(budget * 0.1);
  const sourceBudget = budget - hydraBudget;

  // 4. Apply token budget to sources
  const { sources, totalTokens, truncated } = buildTokenBudget(rawSources, sourceBudget);

  // 5. Recall from HydraDB if available
  let hydraContext = "";
  if (env.isHydraDBAvailable()) {
    const recallQuery =
      query ?? rawSources.map((s) => s.title).join(" ").slice(0, 200);
    try {
      hydraContext = await fullRecall(workspaceId, userId, recallQuery);
      // Trim hydra context if it exceeds its budget
      const hydraTokens = estimateTokens(hydraContext);
      if (hydraTokens > hydraBudget) {
        hydraContext = hydraContext.slice(0, hydraBudget * 4) + "\n[...hydra context truncated]";
      }
    } catch (err) {
      console.warn("[build-context-pack] HydraDB recall failed (non-fatal):", err);
    }
  }

  const hydraTokens = estimateTokens(hydraContext);

  return {
    sources,
    hydraContext,
    totalTokens: totalTokens + hydraTokens,
    budget,
    truncated,
  };
}
