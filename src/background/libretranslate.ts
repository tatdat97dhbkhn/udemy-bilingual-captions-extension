import type { TranslationError } from '../shared/types';
import { ProviderError, parseVietnameseTranslation } from './openai';

function normalizedEndpoint(endpoint: string): string {
  if (!endpoint.trim()) throw new ProviderError('missing_endpoint', false);
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new ProviderError('invalid_endpoint', false); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new ProviderError('invalid_endpoint', false);
  if (url.username || url.password || url.search || url.hash) throw new ProviderError('invalid_endpoint', false);
  return url.toString().replace(/\/$/, '');
}

export function libreTranslateOriginPattern(endpoint: string): string {
  const url = new URL(normalizedEndpoint(endpoint));
  return `${url.protocol}//${url.host}/*`;
}

export function libreTranslateEndpoint(endpoint: string): string {
  return `${normalizedEndpoint(endpoint)}/translate`;
}

export function parseLibreTranslateTranslation(payload: unknown): string {
  return parseVietnameseTranslation({ choices: [{ message: { content: (payload as { translatedText?: unknown })?.translatedText } }] });
}

function classify(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  return new ProviderError(error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network_error', true);
}

async function request(endpoint: string, apiKey: string, q: string | string[], fetcher: typeof fetch): Promise<unknown> {
  let lastError: ProviderError | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const body: Record<string, unknown> = { q, source: 'en', target: 'vi', format: 'text' };
      if (apiKey) body.api_key = apiKey;
      const response = await fetcher(libreTranslateEndpoint(endpoint), {
        method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!response.ok) throw new ProviderError('provider_rejected', response.status === 429 || response.status >= 500);
      return await response.json();
    } catch (error) {
      const classified = classify(error);
      lastError = classified;
      if (!classified.retryable || attempt === 1) throw classified;
    } finally { clearTimeout(timeout); }
  }
  throw lastError ?? new ProviderError('network_error', true);
}

export async function requestLibreTranslate(endpoint: string, apiKey: string, text: string, fetcher: typeof fetch = fetch): Promise<string> {
  return parseLibreTranslateTranslation(await request(endpoint, apiKey, text, fetcher));
}

export async function requestLibreTranslateBatch(endpoint: string, apiKey: string, texts: string[], fetcher: typeof fetch = fetch): Promise<Map<string, string>> {
  if (!texts.length) return new Map();
  const payload = await request(endpoint, apiKey, texts, fetcher) as { translatedText?: unknown };
  const translations = payload.translatedText;
  if (!Array.isArray(translations) || translations.length !== texts.length) throw new ProviderError('invalid_response', false);
  return new Map(texts.map((text, index) => [text, parseLibreTranslateTranslation({ translatedText: translations[index] })]));
}
