// ScopeBridge AI — HydraDB memory API wrappers

function isHydraDBAvailable(): boolean {
  return !!(process.env.HYDRADB_API_KEY && process.env.HYDRADB_BASE_URL);
}

function getBaseHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.HYDRADB_API_KEY ?? ""}`,
    "Content-Type": "application/json",
  };
}

function getBaseUrl(): string {
  return process.env.HYDRADB_BASE_URL ?? "https://api.hydradb.com";
}

/**
 * Generic fetch wrapper for HydraDB endpoints.
 * tenantId maps to HYDRADB_PROJECT_ID (or workspaceId as fallback).
 * subTenantId maps to userId for per-user memory isolation.
 */
export async function fetchHydraDB(
  endpoint: string,
  options: RequestInit = {},
  tenantId?: string,
  subTenantId?: string
): Promise<unknown> {
  if (!isHydraDBAvailable()) {
    throw new Error("HydraDB is not configured (missing HYDRADB_API_KEY or HYDRADB_BASE_URL)");
  }

  const url = `${getBaseUrl()}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getBaseHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    throw new Error(`HydraDB Error: ${res.status} ${res.statusText} — ${endpoint}`);
  }

  return res.json();
}

/**
 * Saves a text memory to HydraDB for a workspace user.
 * Silently no-ops if HydraDB is not configured.
 */
export async function addMemory(
  workspaceId: string,
  userId: string,
  text: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!isHydraDBAvailable()) return;

  const tenantId = process.env.HYDRADB_PROJECT_ID ?? workspaceId;

  try {
    await fetchHydraDB(
      "/memories/add_memory",
      {
        method: "POST",
        body: JSON.stringify({
          tenant_id: tenantId,
          sub_tenant_id: userId,
          text,
          ...(metadata ? { metadata } : {}),
        }),
      },
      tenantId,
      userId
    );
  } catch (err) {
    console.error("[hydradb] addMemory failed:", err);
  }
}

/**
 * Performs a full recall query against HydraDB.
 * Returns the recalled text string, or empty string on failure.
 */
export async function fullRecall(
  workspaceId: string,
  userId: string,
  query: string
): Promise<string> {
  if (!isHydraDBAvailable()) return "";

  const tenantId = process.env.HYDRADB_PROJECT_ID ?? workspaceId;

  try {
    const result = await fetchHydraDB(
      "/recall/full_recall",
      {
        method: "POST",
        body: JSON.stringify({
          tenant_id: tenantId,
          sub_tenant_id: userId,
          query,
          mode: "thinking",
        }),
      },
      tenantId,
      userId
    );

    if (typeof result === "string") return result;
    if (result && typeof result === "object" && "text" in result) {
      return String((result as { text: unknown }).text);
    }
    if (result && typeof result === "object" && "result" in result) {
      return String((result as { result: unknown }).result);
    }
    return JSON.stringify(result);
  } catch (err) {
    console.error("[hydradb] fullRecall failed:", err);
    return "";
  }
}

/**
 * Uploads a knowledge document to HydraDB for long-term context.
 * Silently no-ops if HydraDB is not configured.
 */
export async function uploadKnowledge(
  workspaceId: string,
  userId: string,
  content: string,
  title?: string
): Promise<void> {
  if (!isHydraDBAvailable()) return;

  const tenantId = process.env.HYDRADB_PROJECT_ID ?? workspaceId;

  try {
    await fetchHydraDB(
      "/ingestion/upload_knowledge",
      {
        method: "POST",
        body: JSON.stringify({
          tenant_id: tenantId,
          sub_tenant_id: userId,
          content,
          ...(title ? { title } : {}),
        }),
      },
      tenantId,
      userId
    );
  } catch (err) {
    console.error("[hydradb] uploadKnowledge failed:", err);
  }
}

/**
 * Recalls user preferences from HydraDB.
 * Returns empty string on failure.
 */
export async function recallPreferences(
  workspaceId: string,
  userId: string,
  query: string
): Promise<string> {
  if (!isHydraDBAvailable()) return "";

  const tenantId = process.env.HYDRADB_PROJECT_ID ?? workspaceId;

  try {
    const result = await fetchHydraDB(
      "/recall/full_recall",
      {
        method: "POST",
        body: JSON.stringify({
          tenant_id: tenantId,
          sub_tenant_id: userId,
          query,
          mode: "preferences",
        }),
      },
      tenantId,
      userId
    );

    if (typeof result === "string") return result;
    if (result && typeof result === "object" && "text" in result) {
      return String((result as { text: unknown }).text);
    }
    return "";
  } catch (err) {
    console.error("[hydradb] recallPreferences failed:", err);
    return "";
  }
}

/**
 * Recalls a boolean fact from HydraDB (e.g. "has the user set up Slack?").
 * Returns false on failure or when HydraDB is unavailable.
 */
export async function booleanRecall(
  workspaceId: string,
  userId: string,
  query: string
): Promise<boolean> {
  if (!isHydraDBAvailable()) return false;

  const tenantId = process.env.HYDRADB_PROJECT_ID ?? workspaceId;

  try {
    const result = await fetchHydraDB(
      "/recall/boolean_recall",
      {
        method: "POST",
        body: JSON.stringify({
          tenant_id: tenantId,
          sub_tenant_id: userId,
          query,
        }),
      },
      tenantId,
      userId
    );

    if (typeof result === "boolean") return result;
    if (result && typeof result === "object" && "result" in result) {
      return !!(result as { result: unknown }).result;
    }
    return false;
  } catch (err) {
    console.error("[hydradb] booleanRecall failed:", err);
    return false;
  }
}

/**
 * Returns the status of HydraDB for a given workspace tenant.
 */
export async function getTenantStatus(
  workspaceId: string
): Promise<{ ok: boolean; memoryCount?: number }> {
  if (!isHydraDBAvailable()) return { ok: false };

  const tenantId = process.env.HYDRADB_PROJECT_ID ?? workspaceId;

  try {
    const result = await fetchHydraDB(
      `/tenants/${tenantId}/status`,
      { method: "GET" },
      tenantId
    );

    if (result && typeof result === "object") {
      const r = result as { memory_count?: number; memoryCount?: number };
      return {
        ok: true,
        memoryCount: r.memory_count ?? r.memoryCount,
      };
    }
    return { ok: true };
  } catch (err) {
    console.error("[hydradb] getTenantStatus failed:", err);
    return { ok: false };
  }
}
