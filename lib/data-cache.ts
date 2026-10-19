interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<any>>();
const ONE_HOUR = 60 * 60 * 1000;

export function setCacheData<T>(key: string, data: T, ttlMs: number = ONE_HOUR) {
  cache.set(key, {data, timestamp: Date.now(), ttl: ttlMs});
}

export function getCacheData<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function isCacheExpired(key: string): boolean {
  const entry = cache.get(key);
  if (!entry) return true;
  const age = Date.now() - entry.timestamp;
  return age > entry.ttl;
}

export function clearCache(key: string) {
  cache.delete(key);
}

export function clearAllCache() {
  cache.clear();
}

export function getCacheTTLRemaining(key: string): number {
  const entry = cache.get(key);
  if (!entry) return -1;
  const age = Date.now() - entry.timestamp;
  const remaining = entry.ttl - age;
  return Math.max(0, remaining);
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = ONE_HOUR
): Promise<T> {
  const cached = getCacheData<T>(key);
  if (cached) return cached;
  const data = await fetcher();
  setCacheData(key, data, ttlMs);
  return data;
}