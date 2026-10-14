import type { Diagnostics, TranslationProvider } from '../shared/types';

export interface ProviderView {
  showModel: boolean;
  showLibreTranslateEndpoint: boolean;
  apiKeyLabel: string;
}

export interface DiagnosticsView {
  tone: 'success' | 'info' | 'danger' | 'muted';
  title: string;
  detail: string;
  metrics: Array<{ label: string; value: string }>;
  cacheCount: number;
  transcriptDetail?: string;
}

export function buildProviderView(provider: TranslationProvider): ProviderView {
  const isOpenAI = provider === 'openai';
  return {
    showModel: isOpenAI,
    showLibreTranslateEndpoint: !isOpenAI,
    apiKeyLabel: isOpenAI ? 'OpenAI API key' : 'LibreTranslate API key (tùy chọn)',
  };
}

export function buildDiagnosticsView(enabled: boolean, diagnostics: Diagnostics | undefined, cacheCount: number): DiagnosticsView {
  const base = { metrics: cacheCount > 0 ? [{ label: 'Bản dịch đã lưu', value: String(cacheCount) }] : [], cacheCount };
  if (!enabled) {
    return { tone: 'muted', title: 'Đã tắt', detail: 'Bật dịch phụ đề và lưu cài đặt để tiếp tục.', ...base };
  }

  switch (diagnostics?.status) {
    case 'ready': {
      const metrics = [...base.metrics];
      if (diagnostics.cacheHits !== undefined) metrics.push({ label: 'Cache sử dụng', value: String(diagnostics.cacheHits) });
      if (diagnostics.prefetchHits !== undefined) metrics.push({ label: 'Dịch trước', value: String(diagnostics.prefetchHits) });
      if (diagnostics.activeTranslationMs !== undefined) metrics.push({ label: 'Độ trễ gần nhất', value: `${diagnostics.activeTranslationMs} ms` });
      return {
        tone: 'success',
        title: 'Sẵn sàng',
        detail: 'Dịch phụ đề đang hoạt động.',
        ...base,
        metrics,
        transcriptDetail: diagnostics.transcriptAvailable === false ? 'Không có transcript để dịch trước.' : undefined,
      };
    }
    case 'translating':
      return { tone: 'info', title: 'Đang dịch', detail: 'Đang chuẩn bị bản dịch cho phụ đề hiện tại.', ...base };
    case 'subtitle_not_found':
      return { tone: 'muted', title: 'Không tìm thấy phụ đề', detail: 'Mở một bài học Udemy có phụ đề tiếng Anh để bắt đầu.', ...base };
    case 'error':
      return { tone: 'danger', title: 'Có lỗi khi dịch', detail: diagnostics.detail || 'Kiểm tra lại cài đặt và thử lại.', ...base };
    default:
      return { tone: 'muted', title: 'Đang chờ', detail: 'Mở một bài học Udemy để xem trạng thái dịch.', ...base };
  }
}
