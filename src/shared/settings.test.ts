import { DEFAULT_SETTINGS, normalizeSettings } from './settings';

describe('settings migration', () => {
  it('keeps legacy OpenAI settings and selects OpenAI by default', () => {
    expect(normalizeSettings({ enabled: false, apiKey: 'legacy-key', model: 'gpt-4o' })).toEqual({
      ...DEFAULT_SETTINGS,
      enabled: false,
      apiKey: 'legacy-key',
      model: 'gpt-4o',
    });
  });
});
