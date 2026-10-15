import { DEFAULT_SETTINGS, normalizeSettings, withPopupLocale } from './settings';

describe('settings migration', () => {
  it('defaults the popup locale to automatic browser-language detection', () => {
    expect(normalizeSettings()).toMatchObject({ popupLocale: 'auto' });
  });

  it('keeps legacy OpenAI settings and selects OpenAI by default', () => {
    expect(normalizeSettings({ enabled: false, apiKey: 'legacy-key', model: 'gpt-4o' })).toEqual({
      ...DEFAULT_SETTINGS,
      enabled: false,
      apiKey: 'legacy-key',
      model: 'gpt-4o',
      popupLocale: 'auto',
    });
  });

  it('keeps a saved popup locale', () => {
    expect(normalizeSettings({ popupLocale: 'vi' })).toMatchObject({ popupLocale: 'vi' });
  });

  it('changes only the saved popup locale', () => {
    const current = { enabled: false, apiKey: 'existing-key', model: 'gpt-4o', popupLocale: 'auto' as const };
    expect(withPopupLocale(current, 'vi')).toEqual({ ...current, popupLocale: 'vi' });
  });
});
