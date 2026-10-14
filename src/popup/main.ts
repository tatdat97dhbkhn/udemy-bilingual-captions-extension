import { DEFAULT_MODEL, type Diagnostics, type Settings } from '../shared/types';

const enabled = document.querySelector<HTMLInputElement>('#enabled')!;
const apiKey = document.querySelector<HTMLInputElement>('#api-key')!;
const model = document.querySelector<HTMLInputElement>('#model')!;
const diagnostic = document.querySelector<HTMLElement>('#diagnostic')!;
const settingsDefault: Settings = { enabled: true, apiKey: '', model: DEFAULT_MODEL };

async function refresh(): Promise<void> {
  const { settings, diagnostics } = await chrome.storage.local.get(['settings', 'diagnostics']) as { settings?: Partial<Settings>; diagnostics?: Diagnostics };
  const values = { ...settingsDefault, ...settings };
  enabled.checked = values.enabled;
  apiKey.value = values.apiKey;
  model.value = values.model;
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
  await chrome.storage.local.set({ settings: { enabled: enabled.checked, apiKey: apiKey.value.trim(), model: model.value.trim() || DEFAULT_MODEL } satisfies Settings });
  diagnostic.textContent = enabled.checked ? 'Đã lưu.' : 'Đã tắt dịch.';
});
document.querySelector('#clear-cache')!.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'clearCache' });
  diagnostic.textContent = 'Đã xóa cache.';
});
void refresh();
