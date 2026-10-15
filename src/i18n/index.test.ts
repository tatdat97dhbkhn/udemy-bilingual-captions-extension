import { browserUiLanguage, resolvePopupLocale, translate } from './index';

describe('popup locale resolution', () => {
  it.each([
    ['vi', 'vi-VN', 'vi'],
    ['auto', 'vi-VN', 'vi'],
    ['auto', 'en-US', 'en'],
    ['auto', 'fr-FR', 'en'],
  ] as const)('resolves %s with browser language %s to %s', (preference, browserLanguage, expected) => {
    expect(resolvePopupLocale(preference, browserLanguage)).toBe(expected);
  });
});

describe('translations', () => {
  it('uses English when a Vietnamese translation key is absent', () => {
    expect(translate('vi', 'brandName')).toBe('Bilingual Subtitles');
  });
});

it('works without the Chrome i18n API', () => {
  expect(browserUiLanguage()).toBeUndefined();
});
