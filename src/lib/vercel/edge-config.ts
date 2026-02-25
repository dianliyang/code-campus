type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const EDGE_CACHE_TTL_MS = 30_000;
const itemCache = new Map<string, CacheEntry>();

function buildItemUrl(key: string): URL | null {
  const connectionString = process.env.EDGE_CONFIG;
  if (!connectionString) return null;

  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    return null;
  }

  const configId = parsed.pathname.replace(/^\/+/, "").split("/")[0];
  if (!configId) return null;

  const itemUrl = new URL(parsed.origin);
  itemUrl.pathname = `/${configId}/item/${encodeURIComponent(key)}`;

  const token = parsed.searchParams.get("token");
  if (token) itemUrl.searchParams.set("token", token);

  const teamId = parsed.searchParams.get("teamId");
  if (teamId) itemUrl.searchParams.set("teamId", teamId);

  return itemUrl;
}

export async function getEdgeConfigItem<T>(key: string): Promise<T | undefined> {
  const now = Date.now();
  const cacheKey = `item:${key}`;
  const cached = itemCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const itemUrl = buildItemUrl(key);
  if (!itemUrl) return undefined;

  try {
    const response = await fetch(itemUrl.toString(), {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    const value = (await response.json()) as T;
    itemCache.set(cacheKey, { value, expiresAt: now + EDGE_CACHE_TTL_MS });
    return value;
  } catch {
    return undefined;
  }
}

