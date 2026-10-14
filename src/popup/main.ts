import { libreTranslateOriginPattern } from '../background/libretranslate';
import { DEFAULT_SETTINGS, normalizeSettings } from '../shared/settings';
import type { Diagnostics, Settings, TranslationProvider } from '../shared/types';

const enabled = document.querySelector<HTMLInputElement>('#enabled')!;
const apiKey = document.querySelector<HTMLInputElement>('#api-key')!;
const apiKeyLabel = document.querySelector<HTMLLabelElement>('#api-key-label')!;
const model = document.querySelector<HTMLInputElement>('#model')!;
const provider = document.querySelector<HTMLSelectElement>('#provider')!;
const libreTranslateEndpoint = document.querySelector<HTMLInputElement>('#libretranslate-endpoint')!;
const openAIFields = document.querySelector<HTMLElement>('#openai-fields')!;
const libreTranslateFields = document.querySelector<HTMLElement>('#libretranslate-fields')!;
const diagnostic = document.querySelector<HTMLElement>('#diagnostic')!;

function updateProviderFields(): void {
  const isOpenAI = provider.value === 'openai';
  openAIFields.hidden = !isOpenAI;
  libreTranslateFields.hidden = isOpenAI;
  apiKeyLabel.textContent = isOpenAI ? 'OpenAI API key' : 'LibreTranslate API key (tùy chọn)';
}

async function refresh(): Promise<void> {
  const { settings, diagnostics } = await chrome.storage.local.get(['settings', 'diagnostics']) as { settings?: Partial<Settings>; diagnostics?: Diagnostics };
  const values = normalizeSettings(settings);
  enabled.checked = values.enabled;
  provider.value = values.provider;
  apiKey.value = values.apiKey;
  model.value = values.model;
  libreTranslateEndpoint.value = values.libreTranslateEndpoint;
  updateProviderFields();
  if (diagnostics?.status === 'ready') {
    const metrics = [
      diagnostics.cacheHits !== undefined ? `Cache: ${diagnostics.cacheHits}` : '',
      diagnostics.prefetchHits !== undefined ? `Dịch trước: ${diagnostics.prefetchHits}` : '',
      diagnostics.activeTranslationMs !== undefined ? `${diagnostics.activeTranslationMs} ms` : '',
      diagnostics.transcriptAvailable === false ? 'Không có transcript để dịch trước' : '',
    ].filter(Boolean);
    diagnostic.textContent = ['Sẵn sàng', ...metrics].join(' · ');
  } else {
    diagnostic.textContent = diagnostics?.status === 'subtitle_not_found' ? 'Không tìm thấy phụ đề đang hiển thị.' : diagnostics?.detail ? `Lỗi: ${diagnostics.detail}` : '';
  }
}

document.querySelector('#save')!.addEventListener('click', async () => {
  const values: Settings = {
    enabled: enabled.checked,
    provider: provider.value as TranslationProvider,
    apiKey: apiKey.value.trim(),
    model: model.value.trim() || DEFAULT_SETTINGS.model,
    libreTranslateEndpoint: libreTranslateEndpoint.value.trim(),
  };
  await chrome.storage.local.set({ settings: values });
  if (values.provider === 'libretranslate') {
    try {
      const granted = await chrome.permissions.request({ origins: [libreTranslateOriginPattern(values.libreTranslateEndpoint)] });
      diagnostic.textContent = granted ? 'Đã lưu.' : 'Đã lưu, nhưng chưa có quyền truy cập endpoint LibreTranslate nên không thể dịch.';
    } catch {
      diagnostic.textContent = 'Đã lưu, nhưng URL LibreTranslate không hợp lệ.';
    }
    return;
  }
  diagnostic.textContent = enabled.checked ? 'Đã lưu.' : 'Đã tắt dịch.';
});
provider.addEventListener('change', updateProviderFields);
document.querySelector('#clear-cache')!.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'clearCache' });
  diagnostic.textContent = 'Đã xóa cache.';
});
void refresh();
