import { ProviderError, parseVietnameseTranslation, requestOpenAI } from './openai';
import { TranslationService } from './translation-service';
import type { TranslationCache } from '../core/cache';

const settings = { enabled: true, apiKey: 'test-key', model: 'gpt-4o-mini' };

describe('OpenAI result validation', () => {
  it('accepts Vietnamese chat-completion content', () => {
    expect(parseVietnameseTranslation({ choices: [{ message: { content: 'Xin chào bạn' } }] })).toBe('Xin chào bạn');
  });

  it('rejects empty or non-Vietnamese provider content', () => {
    expect(() => parseVietnameseTranslation({ choices: [{ message: { content: 'Hello world' } }] })).toThrow(ProviderError);
  });

  it('retries a transient provider response once before accepting a translation', async () => {
    let requests = 0;
    const fetcher = async () => {
      requests += 1;
      return requests === 1
        ? new Response('', { status: 429 })
        : new Response(JSON.stringify({ choices: [{ message: { content: 'Xin chào' } }] }), { status: 200 });
    };
    await expect(requestOpenAI('key', 'gpt-4o-mini', 'Hello', fetcher as typeof fetch)).resolves.toBe('Xin chào');
    expect(requests).toBe(2);
  });
});

describe('TranslationService', () => {
  it('coalesces matching in-flight translation requests', async () => {
    let calls = 0;
    let resolve!: (value: string) => void;
    const translation = new Promise<string>((done) => { resolve = done; });
    const cache: TranslationCache = {};
    const service = new TranslationService(async () => cache, async () => {}, async () => { calls += 1; return translation; });
    const first = service.translateCaption('Hello world', settings);
    const second = service.translateCaption(' hello   world ', settings);
    resolve('Xin chào thế giới');
    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: 'translated', translation: 'Xin chào thế giới', cached: false },
      { status: 'translated', translation: 'Xin chào thế giới', cached: false },
    ]);
    expect(calls).toBe(1);
  });

  it('returns a clear missing-key error without calling the provider', async () => {
    const service = new TranslationService(async () => ({}), async () => {}, async () => { throw new Error('must not run'); });
    await expect(service.translateCaption('Hello', { ...settings, apiKey: '' })).resolves.toEqual({ status: 'error', error: 'missing_api_key' });
  });

  it('stores every successful prefetched caption for a later active cache hit', async () => {
    const cache: TranslationCache = {};
    const service = new TranslationService(
      async () => cache,
      async () => {},
      async () => { throw new Error('single translation should not run'); },
      async (_apiKey, _model, texts) => new Map(texts.map((text) => [text, `vi:${text}`])),
    );

    await service.prefetchCaptions(['First', 'Second'], settings);

    await expect(service.translateCaption('Second', settings)).resolves.toEqual({
      status: 'translated', translation: 'vi:Second', cached: true, prefetchHit: true,
    });
  });

  it('starts an active caption while a prefetch batch is still in flight', async () => {
    const cache: TranslationCache = {};
    let startPrefetch!: () => void;
    const prefetchStarted = new Promise<void>((resolve) => { startPrefetch = resolve; });
    let releasePrefetch!: () => void;
    const prefetch = new Promise<Map<string, string>>((resolve) => { releasePrefetch = () => resolve(new Map([['Later', 'Sau'] ])); });
    const calls: string[] = [];
    const service = new TranslationService(
      async () => cache,
      async () => {},
      async (_apiKey, _model, text) => { calls.push(text); return 'Hiện tại'; },
      async () => { startPrefetch(); return prefetch; },
    );

    const queuedPrefetch = service.prefetchCaptions(['Later'], settings);
    await prefetchStarted;
    await expect(service.translateCaption('Now', settings)).resolves.toMatchObject({ status: 'translated', translation: 'Hiện tại' });
    expect(calls).toEqual(['Now']);
    releasePrefetch();
    await queuedPrefetch;
  });

  it('isolates a failed prefetch batch from a later active translation', async () => {
    const cache: TranslationCache = {};
    const service = new TranslationService(
      async () => cache,
      async () => {},
      async () => 'Hiện tại',
      async () => { throw new ProviderError('invalid_response', false); },
    );

    await service.prefetchCaptions(['Malformed batch'], settings);

    await expect(service.translateCaption('Current', settings)).resolves.toMatchObject({ status: 'translated', translation: 'Hiện tại', cached: false });
  });

  it('batches newly rendered transcript cues in groups of 20 without requeueing duplicates', async () => {
    const cache: TranslationCache = {};
    const batches: string[][] = [];
    const cues = Array.from({ length: 21 }, (_, index) => `Cue ${index + 1}`);
    const service = new TranslationService(
      async () => cache,
      async () => {},
      async () => { throw new Error('single translation should not run'); },
      async (_apiKey, _model, texts) => {
        batches.push(texts);
        return new Map(texts.map((text) => [text, `vi:${text}`]));
      },
    );

    await Promise.all([service.prefetchCaptions(cues, settings), service.prefetchCaptions(cues, settings)]);

    expect(batches).toEqual([cues.slice(0, 20), cues.slice(20)]);
  });
});
