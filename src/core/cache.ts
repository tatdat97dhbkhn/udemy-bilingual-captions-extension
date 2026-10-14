import { CACHE_LIMIT, type CacheEntry } from '../shared/types';

export type TranslationCache = Record<string, CacheEntry>;

export function getCached(cache: TranslationCache, key: string, now = Date.now()): string | undefined {
  const entry = cache[key];
  if (!entry) return undefined;
  entry.lastAccessedAt = now;
  return entry.translation;
}

export function putCached(cache: TranslationCache, key: string, translation: string, now = Date.now(), limit = CACHE_LIMIT, prefetched = false): void {
  cache[key] = {
    translation,
    createdAt: cache[key]?.createdAt ?? now,
    lastAccessedAt: now,
    ...(prefetched ? { prefetched: true } : {}),
  };
  const keys = Object.keys(cache);
  if (keys.length <= limit) return;
  const oldest = keys.reduce((oldestKey, keyToCheck) =>
    cache[keyToCheck].lastAccessedAt < cache[oldestKey].lastAccessedAt ? keyToCheck : oldestKey,
  );
  delete cache[oldest];
}
