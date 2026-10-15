import { DEFAULT_MODEL, type PopupLocalePreference, type Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  provider: 'openai',
  apiKey: '',
  model: DEFAULT_MODEL,
  libreTranslateEndpoint: '',
  popupLocale: 'auto',
};

export function normalizeSettings(settings?: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...settings };
}

export function withPopupLocale(settings: Record<string, unknown> | undefined, popupLocale: PopupLocalePreference): Record<string, unknown> {
  return { ...settings, popupLocale };
}
