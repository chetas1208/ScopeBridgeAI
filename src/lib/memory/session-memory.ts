// ScopeBridge AI — Session memory (short-lived, per-session facts)
import { db } from "@/lib/db";
import { addMemory } from "@/lib/hydradb";
import { Prisma } from "@prisma/client";
import type { SessionMemory } from "@prisma/client";

/**
 * Saves a session memory item to Postgres and, if available, to HydraDB.
 */
export async function saveSessionMemory(
  workspaceId: string,
  userId: string,
  kind: string,
  text: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.sessionMemory.create({
    data: {
      workspaceId,
      userId,
      kind,
      text,
      ...(metadata ? { metadata: metadata as Prisma.InputJsonValue } : {}),
    },
  });

  // Best-effort — don't let HydraDB failures block the caller
  await addMemory(workspaceId, userId, text, { kind, ...metadata }).catch((err) => {
    console.warn("[session-memory] HydraDB addMemory failed (non-fatal):", err);
  });
}

/**
 * Returns the most recent session memory items for a workspace user.
 * Defaults to the last 50 items.
 */
export async function getRecentSessionMemory(
  workspaceId: string,
  userId: string,
  limit = 50
): Promise<SessionMemory[]> {
  return db.sessionMemory.findMany({
    where: { workspaceId, userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Deletes all session memory for a workspace user.
 */
export async function clearSessionMemory(
  workspaceId: string,
  userId: string
): Promise<void> {
  await db.sessionMemory.deleteMany({ where: { workspaceId, userId } });
}
