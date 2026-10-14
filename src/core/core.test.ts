import { cacheKey, normalizeCaption } from './caption';
import { getCached, putCached, type TranslationCache } from './cache';

describe('caption normalization', () => {
  it('collapses whitespace and removes zero-width characters', () => {
    expect(normalizeCaption('  Hello\u200B   world\n')).toBe('Hello world');
  });

  it('creates equivalent Vietnamese cache keys for casing and whitespace variants', () => {
    expect(cacheKey(' Hello   WORLD ')).toBe('vi:hello world');
  });
});

describe('translation cache', () => {
  it('returns an entry and updates its recency', () => {
    const cache: TranslationCache = { 'vi:hello': { translation: 'Xin chào', createdAt: 1, lastAccessedAt: 1 } };
    expect(getCached(cache, 'vi:hello', 10)).toBe('Xin chào');
    expect(cache['vi:hello'].lastAccessedAt).toBe(10);
  });

  it('evicts the least recently used entry when capacity is exceeded', () => {
    const cache: TranslationCache = {
      one: { translation: 'một', createdAt: 1, lastAccessedAt: 1 },
      two: { translation: 'hai', createdAt: 2, lastAccessedAt: 2 },
    };
    putCached(cache, 'three', 'ba', 3, 2);
    expect(cache).toEqual({
      two: { translation: 'hai', createdAt: 2, lastAccessedAt: 2 },
      three: { translation: 'ba', createdAt: 3, lastAccessedAt: 3 },
    });
  });
});
