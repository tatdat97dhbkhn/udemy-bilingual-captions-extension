export const DEFAULT_MODEL = 'gpt-4o-mini';
export const CACHE_LIMIT = 5_000;

export type TranslationProvider = 'openai' | 'libretranslate';
export interface Settings {
  enabled: boolean;
  provider: TranslationProvider;
  apiKey: string;
  model: string;
  libreTranslateEndpoint: string;
}
export interface CacheEntry { translation: string; createdAt: number; lastAccessedAt: number; prefetched?: boolean }
export type TranslationError =
  | 'missing_api_key'
  | 'missing_endpoint'
  | 'invalid_endpoint'
  | 'missing_endpoint_permission'
  | 'invalid_response'
  | 'provider_rejected'
  | 'network_error'
  | 'timeout';
export type TranslationResponse =
  | { status: 'translated'; translation: string; cached: boolean; prefetchHit?: boolean }
  | { status: 'error'; error: TranslationError };
export type ExtensionMessage =
  | { type: 'translateCaption'; text: string; target: 'vi'; generation: number; priority: 'active' }
  | { type: 'prefetchCaptions'; texts: string[]; target: 'vi'; priority: 'prefetch' }
  | { type: 'clearCache' }
  | { type: 'getDiagnostics' };
export interface Diagnostics {
  status: 'ready' | 'subtitle_not_found' | 'translating' | 'error';
  detail?: string;
  updatedAt: number;
  cacheHits?: number;
  prefetchHits?: number;
  activeTranslationMs?: number;
  transcriptAvailable?: boolean;
}
