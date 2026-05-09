// ScopeBridge AI — Token budget utilities
import type { ContextSource } from "@/lib/ai/types";

// 1 token ≈ 4 characters (conservative estimate for mixed English/code)
const CHARS_PER_TOKEN = 4;

/**
 * Estimates the token count for a string.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Applies the token budget to a list of sources.
 * Sources are included in order until the budget is exhausted.
 * Returns the trimmed list, total token count, and whether any sources were dropped.
 */
export function buildTokenBudget(
  sources: ContextSource[],
  budget: number
): {
  sources: ContextSource[];
  totalTokens: number;
  truncated: boolean;
  droppedCount: number;
} {
  let remaining = budget;
  const included: ContextSource[] = [];
  let droppedCount = 0;

  for (const source of sources) {
    const tokens = source.tokenCount || estimateTokens(source.content);
    if (tokens <= remaining) {
      included.push({ ...source, tokenCount: tokens });
      remaining -= tokens;
    } else if (remaining > 100) {
      // Partially include the source if there's meaningful budget left
      const truncated = truncateSource(source, remaining);
      included.push(truncated);
      remaining = 0;
      droppedCount++;
      break;
    } else {
      droppedCount++;
    }
  }

  const totalTokens = budget - remaining;

  return {
    sources: included,
    totalTokens,
    truncated: droppedCount > 0,
    droppedCount,
  };
}

/**
 * Truncates a source's content to fit within maxTokens.
 * Preserves the title and metadata — only trims content.
 */
export function truncateSource(source: ContextSource, maxTokens: number): ContextSource {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (source.content.length <= maxChars) {
    return source;
  }

  const truncatedContent = source.content.slice(0, maxChars) + "\n[...truncated]";
  return {
    ...source,
    content: truncatedContent,
    tokenCount: maxTokens,
  };
}
