import type { PopupLocale, PopupLocalePreference } from '../shared/types';
import { en } from './en';
import { vi } from './vi';

export const popupCopy = { en, vi } as const;

export function resolvePopupLocale(preference: PopupLocalePreference, browserLanguage?: string): PopupLocale {
  if (preference === 'en' || preference === 'vi') return preference;
  return browserLanguage?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function browserUiLanguage(): string | undefined {
  try {
    return typeof chrome !== 'undefined' ? chrome.i18n?.getUILanguage() : undefined;
  } catch {
    return undefined;
  }
}

export function getPopupCopy(locale: PopupLocale) {
  return popupCopy[locale];
}

export function translate(locale: PopupLocale, key: string): string {
  const localized = popupCopy[locale] as Record<string, unknown>;
  const fallback = popupCopy.en as Record<string, unknown>;
  return typeof localized[key] === 'string' ? localized[key] as string : typeof fallback[key] === 'string' ? fallback[key] as string : key;
}

export type PopupFeedbackKey = keyof typeof en.feedback;
