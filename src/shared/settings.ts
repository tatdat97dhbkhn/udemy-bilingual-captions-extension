import { DEFAULT_MODEL, type Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  provider: 'openai',
  apiKey: '',
  model: DEFAULT_MODEL,
  libreTranslateEndpoint: '',
};

export function normalizeSettings(settings?: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...settings };
}
