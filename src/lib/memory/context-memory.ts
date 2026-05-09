// ScopeBridge AI — Long-term context memory (persisted snapshots)
import { db } from "@/lib/db";
import { addMemory, fullRecall } from "@/lib/hydradb";
import type { MemorySnapshot } from "@prisma/client";

/**
 * Saves a long-term memory snapshot to Postgres (as pending) and to HydraDB.
 * The snapshot must be explicitly accepted before it is used in audits.
 */
export async function saveMemorySnapshot(
  workspaceId: string,
  userId: string,
  kind: string,
  text: string,
  confidence: number
): Promise<MemorySnapshot> {
  // Attempt HydraDB first (best-effort; addMemory returns void)
  try {
    await addMemory(workspaceId, userId, text, { kind, confidence });
  } catch (err) {
    console.warn("[context-memory] HydraDB addMemory failed (non-fatal):", err);
  }

  return db.memorySnapshot.create({
    data: {
      workspaceId,
      userId,
      kind,
      text,
      confidence,
      status: "pending",
    },
  });
}

/**
 * Marks a pending memory snapshot as accepted.
 */
export async function acceptMemorySnapshot(snapshotId: string): Promise<void> {
  await db.memorySnapshot.update({
    where: { id: snapshotId },
    data: { status: "accepted" },
  });
}

/**
 * Marks a pending memory snapshot as rejected.
 */
export async function rejectMemorySnapshot(snapshotId: string): Promise<void> {
  await db.memorySnapshot.update({
    where: { id: snapshotId },
    data: { status: "rejected" },
  });
}

/**
 * Returns all pending memory snapshots for a workspace (across all users).
 */
export async function getPendingSnapshots(
  workspaceId: string
): Promise<MemorySnapshot[]> {
  return db.memorySnapshot.findMany({
    where: { workspaceId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Returns all accepted memory snapshots for a workspace.
 */
export async function getAcceptedMemories(
  workspaceId: string
): Promise<MemorySnapshot[]> {
  return db.memorySnapshot.findMany({
    where: { workspaceId, status: "accepted" },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Recalls relevant context from HydraDB for use in an audit.
 * Falls back to empty string if HydraDB is unavailable or fails.
 */
export async function recallContextForAudit(
  workspaceId: string,
  userId: string,
  query: string
): Promise<string> {
  return fullRecall(workspaceId, userId, query);
}
