import type { Diagnostics, PopupLocale, TranslationError, TranslationProvider } from '../shared/types';
import { getPopupCopy } from './copy';

export interface ProviderView {
  showModel: boolean;
  showLibreTranslateEndpoint: boolean;
  apiKeyLabel: string;
}

export interface DiagnosticsView {
  tone: 'success' | 'info' | 'danger' | 'muted';
  title: string;
  detail: string;
  metrics: Array<{ label: string; value: string }>;
  cacheCount: number;
  transcriptDetail?: string;
}

export function buildProviderView(locale: PopupLocale, provider: TranslationProvider): ProviderView {
  const isOpenAI = provider === 'openai';
  const copy = getPopupCopy(locale);
  return {
    showModel: isOpenAI,
    showLibreTranslateEndpoint: !isOpenAI,
    apiKeyLabel: isOpenAI ? copy.provider.openaiApiKey : copy.provider.libreTranslateApiKey,
  };
}

export function buildDiagnosticsView(locale: PopupLocale, enabled: boolean, diagnostics: Diagnostics | undefined, cacheCount: number): DiagnosticsView {
  const copy = getPopupCopy(locale).diagnostics;
  const base: Pick<DiagnosticsView, 'metrics' | 'cacheCount'> = {
    metrics: cacheCount > 0 ? [{ label: copy.savedTranslations, value: String(cacheCount) }] : [],
    cacheCount,
  };
  if (!enabled) {
    return { tone: 'muted', title: copy.disabled[0], detail: copy.disabled[1], ...base };
  }

  switch (diagnostics?.status) {
    case 'ready': {
      const metrics = [...base.metrics];
      if (diagnostics.cacheHits !== undefined) metrics.push({ label: copy.cacheHits, value: String(diagnostics.cacheHits) });
      if (diagnostics.prefetchHits !== undefined) metrics.push({ label: copy.prefetchHits, value: String(diagnostics.prefetchHits) });
      if (diagnostics.activeTranslationMs !== undefined) metrics.push({ label: copy.latestLatency, value: `${diagnostics.activeTranslationMs} ms` });
      return {
        tone: 'success',
        title: copy.ready[0],
        detail: copy.ready[1],
        ...base,
        metrics,
        transcriptDetail: diagnostics.transcriptAvailable === false ? copy.noTranscript : undefined,
      };
    }
    case 'translating':
      return { tone: 'info', title: copy.translating[0], detail: copy.translating[1], ...base };
    case 'subtitle_not_found':
      return { tone: 'muted', title: copy.subtitleNotFound[0], detail: copy.subtitleNotFound[1], ...base };
    case 'error':
      return { tone: 'danger', title: copy.error[0], detail: diagnostics.detail ? copy.errorDetails[diagnostics.detail as TranslationError] ?? diagnostics.detail : copy.error[1], ...base };
    default:
      return { tone: 'muted', title: copy.waiting[0], detail: copy.waiting[1], ...base };
  }
}
