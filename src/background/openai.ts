import type { TranslationError } from '../shared/types';

export class ProviderError extends Error {
  constructor(public readonly kind: TranslationError, public readonly retryable: boolean) { super(kind); }
}

const VIETNAMESE_SIGNAL = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]|\b(của|và|không|là|tôi|bạn|được|cho|với)\b/i;

export function parseVietnameseTranslation(payload: unknown): string {
  const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new ProviderError('invalid_response', false);
  const translation = content.trim();
  if (!translation || !VIETNAMESE_SIGNAL.test(translation)) throw new ProviderError('invalid_response', false);
  return translation;
}

export async function requestOpenAI(apiKey: string, model: string, text: string, fetcher: typeof fetch = fetch): Promise<string> {
  let lastError: ProviderError | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetcher('https://api.openai.com/v1/chat/completions', {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, temperature: 0, max_tokens: 120, messages: [
          { role: 'system', content: 'Translate this English caption to natural Vietnamese. Return only the translation.' },
          { role: 'user', content: text },
        ] }),
      });
      if (!response.ok) throw new ProviderError('provider_rejected', response.status === 429 || response.status >= 500);
      return parseVietnameseTranslation(await response.json());
    } catch (error) {
      const classified = error instanceof ProviderError ? error : new ProviderError(error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network_error', true);
      lastError = classified;
      if (!classified.retryable || attempt === 1) throw classified;
    } finally { clearTimeout(timeout); }
  }
  throw lastError ?? new ProviderError('network_error', true);
}

export async function requestOpenAIBatch(apiKey: string, model: string, texts: string[], fetcher: typeof fetch = fetch): Promise<Map<string, string>> {
  if (!texts.length) return new Map();
  let lastError: ProviderError | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetcher('https://api.openai.com/v1/chat/completions', {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, temperature: 0, max_tokens: Math.min(1_200, texts.length * 60), messages: [
          { role: 'system', content: 'Translate each English caption to Vietnamese. Return only a JSON array of Vietnamese strings in the same order.' },
          { role: 'user', content: JSON.stringify(texts) },
        ] }),
      });
      if (!response.ok) throw new ProviderError('provider_rejected', response.status === 429 || response.status >= 500);
      const content = (await response.json() as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new ProviderError('invalid_response', false);
      let translations: unknown;
      try { translations = JSON.parse(content); } catch { throw new ProviderError('invalid_response', false); }
      if (!Array.isArray(translations) || translations.length !== texts.length || translations.some((translation) => typeof translation !== 'string')) {
        throw new ProviderError('invalid_response', false);
      }
      return new Map(texts.map((text, index) => [text, parseVietnameseTranslation({ choices: [{ message: { content: translations[index] } }] })]));
    } catch (error) {
      const classified = error instanceof ProviderError ? error : new ProviderError(error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network_error', true);
      lastError = classified;
      if (!classified.retryable || attempt === 1) throw classified;
    } finally { clearTimeout(timeout); }
  }
  throw lastError ?? new ProviderError('network_error', true);
}
