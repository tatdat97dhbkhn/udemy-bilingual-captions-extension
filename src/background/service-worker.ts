import { TranslationService } from './translation-service';
import { libreTranslateOriginPattern } from './libretranslate';
import { normalizeSettings } from '../shared/settings';
import type { Diagnostics, ExtensionMessage, Settings } from '../shared/types';
import type { TranslationCache } from '../core/cache';

const storageGet = <T>(key: string): Promise<T | undefined> => chrome.storage.local.get(key).then((value) => value[key] as T | undefined);
const storageSet = (value: Record<string, unknown>): Promise<void> => chrome.storage.local.set(value);
const service = new TranslationService(
  async () => (await storageGet<TranslationCache>('translationCache')) ?? {},
  async (translationCache) => storageSet({ translationCache }),
  undefined,
  undefined,
  async (endpoint) => chrome.permissions.contains({ origins: [libreTranslateOriginPattern(endpoint)] }),
);

async function getSettings(): Promise<Settings> {
  return normalizeSettings(await storageGet<Partial<Settings>>('settings'));
}

async function setDiagnostics(status: Diagnostics['status'], detail?: string, metrics: Partial<Diagnostics> = {}): Promise<void> {
  const current = await storageGet<Diagnostics>('diagnostics');
  await storageSet({ diagnostics: { ...current, ...metrics, status, detail, updatedAt: Date.now() } satisfies Diagnostics });
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  void (async () => {
    if (message.type === 'clearCache') { await storageSet({ translationCache: {} }); sendResponse({ ok: true }); return; }
    if (message.type === 'getDiagnostics') { sendResponse((await storageGet<Diagnostics>('diagnostics')) ?? { status: 'ready', updatedAt: Date.now() }); return; }
    const settings = await getSettings();
    if (!settings.enabled) { sendResponse({ status: 'error', error: 'provider_rejected' }); return; }
    if (message.type === 'prefetchCaptions') {
      await service.prefetchCaptions(message.texts, settings);
      sendResponse({ ok: true });
      return;
    }
    await setDiagnostics('translating');
    const startedAt = Date.now();
    const response = await service.translateCaption(message.text, settings);
    await setDiagnostics(response.status === 'translated' ? 'ready' : 'error', response.status === 'error' ? response.error : undefined,
      response.status === 'translated' && response.cached
        ? { cacheHits: ((await storageGet<Diagnostics>('diagnostics'))?.cacheHits ?? 0) + 1, prefetchHits: response.prefetchHit ? ((await storageGet<Diagnostics>('diagnostics'))?.prefetchHits ?? 0) + 1 : undefined }
        : { activeTranslationMs: Date.now() - startedAt });
    sendResponse(response);
  })();
  return true;
});
