import './popup.css';
import { libreTranslateOriginPattern } from '../background/libretranslate';
import type { TranslationCache } from '../core/cache';
import { DEFAULT_SETTINGS, normalizeSettings, withPopupLocale } from '../shared/settings';
import type { Diagnostics, PopupLocale, PopupLocalePreference, Settings, TranslationProvider } from '../shared/types';
import { browserUiLanguage, getPopupCopy, resolvePopupLocale, type PopupFeedbackKey } from '../i18n';
import { buildDiagnosticsView, buildProviderView } from './view-model';

const enabled = document.querySelector<HTMLInputElement>('#enabled')!;
const enabledDescription = document.querySelector<HTMLElement>('#enabled-description')!;
const apiKey = document.querySelector<HTMLInputElement>('#api-key')!;
const apiKeyLabel = document.querySelector<HTMLLabelElement>('#api-key-label')!;
const model = document.querySelector<HTMLInputElement>('#model')!;
const provider = document.querySelector<HTMLSelectElement>('#provider')!;
const popupLocale = document.querySelector<HTMLSelectElement>('#popup-locale')!;
const libreTranslateEndpoint = document.querySelector<HTMLInputElement>('#libretranslate-endpoint')!;
const openAIFields = document.querySelector<HTMLElement>('#openai-fields')!;
const libreTranslateFields = document.querySelector<HTMLElement>('#libretranslate-fields')!;
const advancedSettings = document.querySelector<HTMLElement>('#advanced-settings')!;
const settingsToggle = document.querySelector<HTMLButtonElement>('#settings-toggle')!;
const advancedToggle = document.querySelector<HTMLButtonElement>('#advanced-toggle')!;
const apiKeyVisibility = document.querySelector<HTMLButtonElement>('#api-key-visibility')!;
const form = document.querySelector<HTMLFormElement>('#settings-form')!;
const saveButton = document.querySelector<HTMLButtonElement>('#save')!;
const clearCacheButton = document.querySelector<HTMLButtonElement>('#clear-cache')!;
const confirmation = document.querySelector<HTMLElement>('#clear-cache-confirmation')!;
const actionFeedback = document.querySelector<HTMLElement>('#action-feedback')!;
const diagnosticBadge = document.querySelector<HTMLElement>('#diagnostic-badge')!;
const diagnosticTitle = document.querySelector<HTMLElement>('#diagnostic-title')!;
const diagnosticDetail = document.querySelector<HTMLElement>('#diagnostic-detail')!;
const diagnosticMetrics = document.querySelector<HTMLDListElement>('#diagnostic-metrics')!;
const diagnosticDetails = document.querySelector<HTMLDetailsElement>('#diagnostic-details')!;
const diagnosticTranscript = document.querySelector<HTMLElement>('#diagnostic-transcript')!;
const cacheSummary = document.querySelector<HTMLElement>('#cache-summary')!;

let diagnostics: Diagnostics | undefined;
let cacheCount = 0;
let currentLocale: PopupLocale = 'en';
let actionFeedbackKey: PopupFeedbackKey | undefined;

function setActionFeedback(key?: PopupFeedbackKey): void {
  actionFeedbackKey = key;
  actionFeedback.textContent = key ? getPopupCopy(currentLocale).feedback[key] : '';
}

function applyPopupLocale(locale: PopupLocale): void {
  currentLocale = locale;
  const copy = getPopupCopy(locale);
  document.documentElement.lang = locale;
  for (const [key, value] of Object.entries(copy.static)) {
    document.querySelectorAll<HTMLElement>(`[data-i18n="${key}"]`).forEach((element) => { element.textContent = value; });
  }
  document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach((element) => {
    const key = element.dataset.i18nAriaLabel as keyof typeof copy.static;
    element.setAttribute('aria-label', copy.static[key]);
  });
  apiKeyVisibility.setAttribute('aria-label', copy.apiKeyVisibility(apiKey.type === 'text'));
  toggleAdvancedSettingsLabel();
  updateProviderFields();
  updateEnabledCopy();
  setActionFeedback(actionFeedbackKey);
}

function updateEnabledCopy(): void {
  enabledDescription.textContent = getPopupCopy(currentLocale).enabledDescription(enabled.checked);
  renderDiagnostics();
}

function updateProviderFields(): void {
  const view = buildProviderView(currentLocale, provider.value as TranslationProvider);
  openAIFields.hidden = !view.showModel;
  libreTranslateFields.hidden = !view.showLibreTranslateEndpoint;
  apiKeyLabel.textContent = view.apiKeyLabel;
}

function renderDiagnostics(): void {
  const view = buildDiagnosticsView(currentLocale, enabled.checked, diagnostics, cacheCount);
  diagnosticBadge.dataset.tone = view.tone;
  diagnosticTitle.textContent = view.title;
  cacheSummary.textContent = getPopupCopy(currentLocale).cacheSummary(cacheCount);
  diagnosticDetail.textContent = view.detail;
  diagnosticMetrics.replaceChildren(...view.metrics.map(({ label, value }) => {
    const item = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    item.append(term, description);
    return item;
  }));
  diagnosticTranscript.textContent = view.transcriptDetail || '';
  diagnosticDetails.hidden = view.metrics.length === 0 && !view.transcriptDetail;
}

function setLoading(button: HTMLButtonElement, loading: boolean, loadingText: string): void {
  if (loading) button.dataset.label = button.textContent || '';
  button.disabled = loading;
  button.textContent = loading ? loadingText : button.dataset.label || button.textContent;
}

async function refresh(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(['settings', 'diagnostics', 'translationCache']) as {
      settings?: Partial<Settings>; diagnostics?: Diagnostics; translationCache?: TranslationCache;
    };
    const values = normalizeSettings(stored.settings);
    diagnostics = stored.diagnostics;
    cacheCount = Object.keys(stored.translationCache || {}).length;
    enabled.checked = values.enabled;
    provider.value = values.provider;
    apiKey.value = values.apiKey;
    model.value = values.model;
    libreTranslateEndpoint.value = values.libreTranslateEndpoint;
    popupLocale.value = values.popupLocale;
    applyPopupLocale(resolvePopupLocale(values.popupLocale, browserUiLanguage()));
  } catch {
    setActionFeedback('loadError');
  }
}

function toggleAdvancedSettingsLabel(): void {
  settingsToggle.setAttribute('aria-label', getPopupCopy(currentLocale).settingsToggle(!advancedSettings.hidden));
}

function toggleAdvancedSettings(): void {
  const open = advancedSettings.hidden;
  advancedSettings.hidden = !open;
  settingsToggle.setAttribute('aria-expanded', String(open));
  advancedToggle.setAttribute('aria-expanded', String(open));
  toggleAdvancedSettingsLabel();
  if (open) apiKey.focus();
}

settingsToggle.addEventListener('click', toggleAdvancedSettings);
advancedToggle.addEventListener('click', toggleAdvancedSettings);

apiKeyVisibility.addEventListener('click', () => {
  const reveal = apiKey.type === 'password';
  apiKey.type = reveal ? 'text' : 'password';
  apiKeyVisibility.setAttribute('aria-label', getPopupCopy(currentLocale).apiKeyVisibility(reveal));
});

enabled.addEventListener('change', updateEnabledCopy);
provider.addEventListener('change', updateProviderFields);
popupLocale.addEventListener('change', () => {
  const preference = popupLocale.value as PopupLocalePreference;
  applyPopupLocale(resolvePopupLocale(preference, browserUiLanguage()));
  void chrome.storage.local.get('settings').then(({ settings }) => chrome.storage.local.set({
    settings: withPopupLocale(settings, preference),
  })).catch(() => setActionFeedback('saveError'));
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const values: Settings = {
    enabled: enabled.checked,
    provider: provider.value as TranslationProvider,
    apiKey: apiKey.value.trim(),
    model: model.value.trim() || DEFAULT_SETTINGS.model,
    libreTranslateEndpoint: libreTranslateEndpoint.value.trim(),
    popupLocale: popupLocale.value as PopupLocalePreference,
  };
  setActionFeedback();
  setLoading(saveButton, true, getPopupCopy(currentLocale).loading.save);
  try {
    await chrome.storage.local.set({ settings: values });
    if (values.provider === 'libretranslate') {
      try {
        const granted = await chrome.permissions.request({ origins: [libreTranslateOriginPattern(values.libreTranslateEndpoint)] });
        setActionFeedback(granted ? 'saved' : 'permissionDenied');
      } catch {
        setActionFeedback('invalidEndpoint');
      }
    } else {
      setActionFeedback(values.enabled ? 'saved' : 'savedDisabled');
    }
  } catch {
    setActionFeedback('saveError');
  } finally {
    setLoading(saveButton, false, '');
  }
});

clearCacheButton.addEventListener('click', () => { confirmation.hidden = false; });
document.querySelector<HTMLButtonElement>('#cancel-clear-cache')!.addEventListener('click', () => { confirmation.hidden = true; });
document.querySelector<HTMLButtonElement>('#confirm-clear-cache')!.addEventListener('click', async () => {
  const confirmButton = document.querySelector<HTMLButtonElement>('#confirm-clear-cache')!;
  setActionFeedback();
  setLoading(confirmButton, true, getPopupCopy(currentLocale).loading.clear);
  try {
    await chrome.runtime.sendMessage({ type: 'clearCache' });
    cacheCount = 0;
    renderDiagnostics();
    confirmation.hidden = true;
    setActionFeedback('cleared');
  } catch {
    setActionFeedback('clearError');
  } finally {
    setLoading(confirmButton, false, '');
  }
});

void refresh();
