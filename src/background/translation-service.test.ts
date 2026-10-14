import { ProviderError, parseVietnameseTranslation, requestOpenAI } from './openai';
import { libreTranslateOriginPattern, parseLibreTranslateTranslation, requestLibreTranslate, requestLibreTranslateBatch } from './libretranslate';
import { TranslationService } from './translation-service';
import type { TranslationCache } from '../core/cache';

const settings = { enabled: true, provider: 'openai' as const, apiKey: 'test-key', model: 'gpt-4o-mini', libreTranslateEndpoint: '' };

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

describe('LibreTranslate adapter', () => {
  it('translates one caption without including an empty API key', async () => {
    let body = '';
    const fetcher = async (_url: string, init?: RequestInit) => {
      body = String(init?.body);
      return new Response(JSON.stringify({ translatedText: 'Xin chào' }), { status: 200 });
    };

    await expect(requestLibreTranslate('http://localhost:5000', '', 'Hello', fetcher as typeof fetch)).resolves.toBe('Xin chào');
    expect(JSON.parse(body)).toEqual({ q: 'Hello', source: 'en', target: 'vi', format: 'text' });
  });

  it('translates a batch and rejects a response with the wrong result count', async () => {
    const fetcher = async () => new Response(JSON.stringify({ translatedText: ['Một'] }), { status: 200 });

    await expect(requestLibreTranslateBatch('http://localhost:5000/', 'key', ['One', 'Two'], fetcher as typeof fetch))
      .rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it('normalizes endpoint origins and validates translated text', () => {
    expect(libreTranslateOriginPattern('http://localhost:5000/')).toBe('http://localhost:5000/*');
    expect(() => libreTranslateOriginPattern('ftp://localhost:5000')).toThrow(ProviderError);
    expect(parseLibreTranslateTranslation({ translatedText: 'Xin chào' })).toBe('Xin chào');
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

  it('returns a configuration error for a LibreTranslate endpoint without permission before calling the provider', async () => {
    const service = new TranslationService(
      async () => ({}),
      async () => {},
      async () => { throw new Error('must not run'); },
      async () => { throw new Error('must not run'); },
      async () => false,
    );
    await expect(service.translateCaption('Hello', { ...settings, provider: 'libretranslate', apiKey: '', libreTranslateEndpoint: 'http://localhost:5000' }))
      .resolves.toEqual({ status: 'error', error: 'missing_endpoint_permission' });
  });

  it('partitions cache by translation provider and endpoint', async () => {
    const cache: TranslationCache = {};
    const calls: string[] = [];
    const service = new TranslationService(
      async () => cache,
      async () => {},
      async () => { calls.push('openai'); return 'OpenAI'; },
      async () => new Map(),
      async () => true,
      async (_endpoint, _apiKey, text) => { calls.push('libre'); return `Libre:${text}` },
    );

    await service.translateCaption('Hello', settings);
    await expect(service.translateCaption('Hello', { ...settings, provider: 'libretranslate', apiKey: '', libreTranslateEndpoint: 'http://localhost:5000' }))
      .resolves.toMatchObject({ translation: 'Libre:Hello', cached: false });
    expect(calls).toEqual(['openai', 'libre']);
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
