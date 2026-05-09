// HydraDB API Wrappers

const HYDRADB_BASE_URL = process.env.HYDRADB_BASE_URL || "https://api.hydradb.com";
const HYDRADB_API_KEY = process.env.HYDRADB_API_KEY;
const HYDRADB_PROJECT_ID = process.env.HYDRADB_PROJECT_ID;

const headers = {
  "Authorization": `Bearer ${HYDRADB_API_KEY}`,
  "Content-Type": "application/json"
};

export async function fetchHydraDB(endpoint: string, options: RequestInit = {}) {
  if (!HYDRADB_API_KEY) throw new Error("HYDRADB_API_KEY not configured");
  
  const res = await fetch(`${HYDRADB_BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });

  if (!res.ok) {
    throw new Error(`HydraDB Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function addMemory(tenantId: string, subTenantId: string, text: string) {
  return fetchHydraDB("/memories/add_memory", {
    method: "POST",
    body: JSON.stringify({ tenant_id: tenantId, sub_tenant_id: subTenantId, text })
  });
}

export async function fullRecall(tenantId: string, subTenantId: string, query: string) {
  return fetchHydraDB("/recall/full_recall", {
    method: "POST",
    body: JSON.stringify({ tenant_id: tenantId, sub_tenant_id: subTenantId, query, mode: "thinking" })
  });
}

export async function uploadKnowledge(tenantId: string, subTenantId: string, content: string) {
  return fetchHydraDB("/ingestion/upload_knowledge", {
    method: "POST",
    body: JSON.stringify({ tenant_id: tenantId, sub_tenant_id: subTenantId, content })
  });
}
