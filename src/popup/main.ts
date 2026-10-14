import './popup.css';
import { libreTranslateOriginPattern } from '../background/libretranslate';
import type { TranslationCache } from '../core/cache';
import { DEFAULT_SETTINGS, normalizeSettings } from '../shared/settings';
import type { Diagnostics, Settings, TranslationProvider } from '../shared/types';
import { buildDiagnosticsView, buildProviderView } from './view-model';

const enabled = document.querySelector<HTMLInputElement>('#enabled')!;
const enabledDescription = document.querySelector<HTMLElement>('#enabled-description')!;
const apiKey = document.querySelector<HTMLInputElement>('#api-key')!;
const apiKeyLabel = document.querySelector<HTMLLabelElement>('#api-key-label')!;
const model = document.querySelector<HTMLInputElement>('#model')!;
const provider = document.querySelector<HTMLSelectElement>('#provider')!;
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

function setActionFeedback(message: string): void { actionFeedback.textContent = message; }

function updateEnabledCopy(): void {
  const isEnabled = enabled.checked;
  enabledDescription.textContent = isEnabled
    ? 'Bản dịch tiếng Việt sẽ xuất hiện bên dưới phụ đề gốc.'
    : 'Bản dịch sẽ không được tạo cho đến khi bạn bật lại và lưu cài đặt.';
  renderDiagnostics();
}

function updateProviderFields(): void {
  const view = buildProviderView(provider.value as TranslationProvider);
  openAIFields.hidden = !view.showModel;
  libreTranslateFields.hidden = !view.showLibreTranslateEndpoint;
  apiKeyLabel.textContent = view.apiKeyLabel;
}

function renderDiagnostics(): void {
  const view = buildDiagnosticsView(enabled.checked, diagnostics, cacheCount);
  diagnosticBadge.dataset.tone = view.tone;
  diagnosticTitle.textContent = view.title;
  cacheSummary.textContent = `Cache: ${cacheCount}`;
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
    updateProviderFields();
    updateEnabledCopy();
  } catch {
    setActionFeedback('Không thể tải cài đặt. Hãy đóng và mở lại tiện ích.');
  }
}

function toggleAdvancedSettings(): void {
  const open = advancedSettings.hidden;
  advancedSettings.hidden = !open;
  settingsToggle.setAttribute('aria-expanded', String(open));
  advancedToggle.setAttribute('aria-expanded', String(open));
  settingsToggle.setAttribute('aria-label', open ? 'Đóng cài đặt nâng cao' : 'Mở cài đặt nâng cao');
  if (open) apiKey.focus();
}

settingsToggle.addEventListener('click', toggleAdvancedSettings);
advancedToggle.addEventListener('click', toggleAdvancedSettings);

apiKeyVisibility.addEventListener('click', () => {
  const reveal = apiKey.type === 'password';
  apiKey.type = reveal ? 'text' : 'password';
  apiKeyVisibility.setAttribute('aria-label', reveal ? 'Ẩn API key' : 'Hiện API key');
});

enabled.addEventListener('change', updateEnabledCopy);
provider.addEventListener('change', updateProviderFields);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const values: Settings = {
    enabled: enabled.checked,
    provider: provider.value as TranslationProvider,
    apiKey: apiKey.value.trim(),
    model: model.value.trim() || DEFAULT_SETTINGS.model,
    libreTranslateEndpoint: libreTranslateEndpoint.value.trim(),
  };
  setActionFeedback('');
  setLoading(saveButton, true, 'Đang lưu…');
  try {
    await chrome.storage.local.set({ settings: values });
    if (values.provider === 'libretranslate') {
      try {
        const granted = await chrome.permissions.request({ origins: [libreTranslateOriginPattern(values.libreTranslateEndpoint)] });
        setActionFeedback(granted ? 'Đã lưu cài đặt.' : 'Đã lưu, nhưng chưa có quyền truy cập endpoint LibreTranslate nên không thể dịch.');
      } catch {
        setActionFeedback('Đã lưu, nhưng URL LibreTranslate không hợp lệ.');
      }
    } else {
      setActionFeedback(values.enabled ? 'Đã lưu cài đặt.' : 'Đã lưu: dịch phụ đề đã tắt.');
    }
  } catch {
    setActionFeedback('Không thể lưu cài đặt. Vui lòng thử lại.');
  } finally {
    setLoading(saveButton, false, '');
  }
});

clearCacheButton.addEventListener('click', () => { confirmation.hidden = false; });
document.querySelector<HTMLButtonElement>('#cancel-clear-cache')!.addEventListener('click', () => { confirmation.hidden = true; });
document.querySelector<HTMLButtonElement>('#confirm-clear-cache')!.addEventListener('click', async () => {
  const confirmButton = document.querySelector<HTMLButtonElement>('#confirm-clear-cache')!;
  setActionFeedback('');
  setLoading(confirmButton, true, 'Đang xóa…');
  try {
    await chrome.runtime.sendMessage({ type: 'clearCache' });
    cacheCount = 0;
    renderDiagnostics();
    confirmation.hidden = true;
    setActionFeedback('Đã xóa bộ nhớ đệm.');
  } catch {
    setActionFeedback('Không thể xóa bộ nhớ đệm. Vui lòng thử lại.');
  } finally {
    setLoading(confirmButton, false, '');
  }
});

void refresh();
