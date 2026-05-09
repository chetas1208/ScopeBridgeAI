// ScopeBridge AI — Server-side workspace utilities
import { db } from "./db";
import { encrypt, decrypt } from "./crypto";
import type { ConnectedAccount } from "@prisma/client";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Gets or creates the primary workspace for a user.
 * On first call creates a workspace and adds the user as OWNER.
 */
export async function getOrCreateWorkspace(
  userId: string,
  userName?: string | null
): Promise<{ id: string; name: string; slug: string }> {
  // Check if user already has a workspace membership
  const existing = await db.workspaceMember.findFirst({
    where: { userId, role: "OWNER" },
    include: { workspace: true },
    orderBy: { workspace: { createdAt: "asc" } },
  });

  if (existing) {
    return {
      id: existing.workspace.id,
      name: existing.workspace.name,
      slug: existing.workspace.slug,
    };
  }

  // Create a new workspace
  const baseName = userName ? `${userName}'s Workspace` : "My Workspace";
  const baseSlug = slugify(baseName);

  // Ensure slug uniqueness by appending a short random suffix if needed
  let slug = baseSlug;
  const collision = await db.workspace.findUnique({ where: { slug } });
  if (collision) {
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const workspace = await db.workspace.create({
    data: {
      name: baseName,
      slug,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
  });

  return { id: workspace.id, name: workspace.name, slug: workspace.slug };
}

/**
 * Returns the primary workspaceId for a given userId, or null if none exists.
 */
export async function getWorkspaceId(userId: string): Promise<string | null> {
  const membership = await db.workspaceMember.findFirst({
    where: { userId, role: "OWNER" },
    include: { workspace: true },
    orderBy: { workspace: { createdAt: "asc" } },
  });

  return membership?.workspaceId ?? null;
}

/**
 * Returns true if the user is a member of the given workspace.
 */
export async function verifyWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return membership !== null;
}

/**
 * Returns the connected account for a provider, or null if not connected.
 */
export async function getConnectedAccount(
  workspaceId: string,
  provider: string
): Promise<ConnectedAccount | null> {
  return db.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider } },
  });
}

/**
 * Decrypts the access token from a connected account record.
 */
export function decryptAccessToken(account: ConnectedAccount): string {
  return decrypt(account.encryptedAccessToken);
}

/**
 * Decrypts the refresh token from a connected account record, returning null if not set.
 */
export function decryptRefreshToken(account: ConnectedAccount): string | null {
  return account.encryptedRefreshToken
    ? decrypt(account.encryptedRefreshToken)
    : null;
}

/**
 * Creates or updates a connected account with encrypted tokens.
 */
export async function upsertConnectedAccount(
  workspaceId: string,
  provider: string,
  accessToken: string,
  refreshToken?: string,
  scopes?: string,
  expiresAt?: Date
): Promise<void> {
  const encryptedAccessToken = encrypt(accessToken);
  const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : undefined;

  await db.connectedAccount.upsert({
    where: { workspaceId_provider: { workspaceId, provider } },
    create: {
      workspaceId,
      provider,
      encryptedAccessToken,
      ...(encryptedRefreshToken ? { encryptedRefreshToken } : {}),
      ...(scopes ? { scopes } : {}),
      ...(expiresAt ? { expiresAt } : {}),
      status: "active",
    },
    update: {
      encryptedAccessToken,
      ...(encryptedRefreshToken ? { encryptedRefreshToken } : {}),
      ...(scopes ? { scopes } : {}),
      ...(expiresAt ? { expiresAt } : {}),
      status: "active",
    },
  });
}

/**
 * Marks a connected account as disconnected.
 */
export async function disconnectProvider(
  workspaceId: string,
  provider: string
): Promise<void> {
  await db.connectedAccount.updateMany({
    where: { workspaceId, provider },
    data: { status: "disconnected" },
  });
}
