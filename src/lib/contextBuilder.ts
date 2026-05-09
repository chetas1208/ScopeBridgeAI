import { SourceItem } from "@prisma/client";
import { fullRecall } from "./hydradb";

export interface ContextPack {
  selected_sources: string[];
  source_summaries: string;
  raw_evidence_snippets: string;
  hydradb_recall: string | null;
  token_budget_report: { total: number; limit: number };
}

export async function buildContextPack(workspaceId: string, sources: SourceItem[]): Promise<ContextPack> {
  // Deduplicate and rank by recency (simplified for hackathon)
  const dedupedSources = sources.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
  
  let rawSnippets = dedupedSources.map(s => `[${s.sourceType.toUpperCase()} - ${s.id}]\nTitle: ${s.title}\nContent: ${s.content}`).join("\n\n");
  
  // Approximate token count (1 token ≈ 4 chars)
  const tokenCount = Math.floor(rawSnippets.length / 4);
  const limit = parseInt(process.env.MAX_CONTEXT_TOKENS || "128000");

  if (tokenCount > limit) {
    rawSnippets = rawSnippets.substring(0, limit * 4);
  }

  // HydraDB query if available
  let hydraRecall = null;
  if (process.env.HYDRADB_API_KEY && process.env.HYDRADB_PROJECT_ID) {
    try {
      const queryStr = dedupedSources.map(s => s.title).join(" ").substring(0, 100);
      const res = await fullRecall(process.env.HYDRADB_PROJECT_ID, workspaceId, queryStr);
      hydraRecall = JSON.stringify(res);
    } catch (e) {
      console.error("HydraDB recall failed, continuing without memory", e);
    }
  }

  return {
    selected_sources: dedupedSources.map(s => s.id),
    source_summaries: "Sources assembled.",
    raw_evidence_snippets: rawSnippets,
    hydradb_recall: hydraRecall,
    token_budget_report: { total: tokenCount, limit }
  };
}
