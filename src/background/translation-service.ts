import { cacheKey, normalizeCaption } from '../core/caption';
import { getCached, putCached, type TranslationCache } from '../core/cache';
import { ProviderError, requestOpenAI, requestOpenAIBatch } from './openai';
import type { Settings, TranslationResponse } from '../shared/types';

const PREFETCH_BATCH_SIZE = 20;

export class TranslationService {
  private readonly pending = new Map<string, Promise<TranslationResponse>>();
  private readonly prefetchPending = new Set<string>();
  private activeRunning = false;
  private prefetchRunning = false;
  private readonly activeQueue: Array<() => Promise<void>> = [];
  private readonly prefetchQueue: Array<() => Promise<void>> = [];
  constructor(
    private readonly loadCache: () => Promise<TranslationCache>,
    private readonly saveCache: (cache: TranslationCache) => Promise<void>,
    private readonly translate = requestOpenAI,
    private readonly translateBatch = requestOpenAIBatch,
  ) {}

  async translateCaption(text: string, settings: Settings): Promise<TranslationResponse> {
    const normalized = normalizeCaption(text);
    if (!settings.apiKey) return { status: 'error', error: 'missing_api_key' };
    if (!normalized) return { status: 'error', error: 'invalid_response' };
    const key = cacheKey(normalized);
    const cache = await this.loadCache();
    const cached = getCached(cache, key);
    if (cached) { await this.saveCache(cache); return { status: 'translated', translation: cached, cached: true, prefetchHit: cache[key]?.prefetched }; }
    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;
    const request = this.enqueue('active', () => this.fetchAndStore(key, normalized, settings, cache));
    this.pending.set(key, request);
    try { return await request; } finally { this.pending.delete(key); }
  }

  async prefetchCaptions(texts: string[], settings: Settings): Promise<void> {
    if (!settings.apiKey) return;
    const normalized = [...new Set(texts.map(normalizeCaption).filter(Boolean))];
    if (!normalized.length) return;
    const cache = await this.loadCache();
    const missing = normalized.filter((text) => {
      const key = cacheKey(text);
      return !cache[key] && !this.prefetchPending.has(key);
    });
    if (!missing.length) return;
    const batches: string[][] = [];
    for (let index = 0; index < missing.length; index += PREFETCH_BATCH_SIZE) {
      const batch = missing.slice(index, index + PREFETCH_BATCH_SIZE);
      batch.forEach((text) => this.prefetchPending.add(cacheKey(text)));
      batches.push(batch);
    }
    await Promise.all(batches.map((batch) => this.enqueue('prefetch', () => this.fetchBatchAndStore(batch, settings, cache))));
  }

  private async fetchAndStore(key: string, text: string, settings: Settings, cache: TranslationCache): Promise<TranslationResponse> {
    try {
      const translation = await this.translate(settings.apiKey, settings.model, text);
      putCached(cache, key, translation);
      await this.saveCache(cache);
      return { status: 'translated', translation, cached: false };
    } catch (error) { return { status: 'error', error: error instanceof ProviderError ? error.kind : 'network_error' }; }
  }

  private async fetchBatchAndStore(texts: string[], settings: Settings, cache: TranslationCache): Promise<void> {
    try {
      const translations = await this.translateBatch(settings.apiKey, settings.model, texts);
      for (const text of texts) {
        const translation = translations.get(text);
        if (translation) putCached(cache, cacheKey(text), translation, Date.now(), undefined, true);
      }
      await this.saveCache(cache);
    } catch {} finally {
      texts.forEach((text) => this.prefetchPending.delete(cacheKey(text)));
    }
  }

  private enqueue<T>(kind: 'active' | 'prefetch', task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queued = async (): Promise<void> => {
        try { resolve(await task()); } catch (error) { reject(error); }
      };
      (kind === 'active' ? this.activeQueue : this.prefetchQueue).push(queued);
      void this.drain(kind);
    });
  }

  private async drain(kind: 'active' | 'prefetch'): Promise<void> {
    if (kind === 'active' ? this.activeRunning : this.prefetchRunning) return;
    const queue = kind === 'active' ? this.activeQueue : this.prefetchQueue;
    const task = queue.shift();
    if (!task) return;
    if (kind === 'active') this.activeRunning = true; else this.prefetchRunning = true;
    try { await task(); } finally {
      if (kind === 'active') this.activeRunning = false; else this.prefetchRunning = false;
      void this.drain(kind);
    }
  }
}
