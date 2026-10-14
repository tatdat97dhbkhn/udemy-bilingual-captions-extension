import { buildDiagnosticsView, buildProviderView } from './view-model';

describe('popup provider view', () => {
  it('shows the OpenAI model field only for OpenAI', () => {
    expect(buildProviderView('openai')).toEqual({
      showModel: true,
      showLibreTranslateEndpoint: false,
      apiKeyLabel: 'OpenAI API key',
    });
  });

  it('shows the LibreTranslate endpoint and optional key label', () => {
    expect(buildProviderView('libretranslate')).toEqual({
      showModel: false,
      showLibreTranslateEndpoint: true,
      apiKeyLabel: 'LibreTranslate API key (tùy chọn)',
    });
  });
});

describe('popup diagnostics view', () => {
  it('shows a disabled state instead of a ready state when translation is off', () => {
    expect(buildDiagnosticsView(false, { status: 'ready', updatedAt: 1 }, 4)).toMatchObject({
      tone: 'muted',
      title: 'Đã tắt',
      detail: 'Bật dịch phụ đề và lưu cài đặt để tiếp tục.',
      cacheCount: 4,
    });
  });

  it('shows ready metrics only when present', () => {
    expect(buildDiagnosticsView(true, {
      status: 'ready',
      updatedAt: 1,
      cacheHits: 3,
      prefetchHits: 2,
      activeTranslationMs: 124,
      transcriptAvailable: false,
    }, 8)).toEqual({
      tone: 'success',
      title: 'Sẵn sàng',
      detail: 'Dịch phụ đề đang hoạt động.',
      metrics: [
        { label: 'Bản dịch đã lưu', value: '8' },
        { label: 'Cache sử dụng', value: '3' },
        { label: 'Dịch trước', value: '2' },
        { label: 'Độ trễ gần nhất', value: '124 ms' },
      ],
      cacheCount: 8,
      transcriptDetail: 'Không có transcript để dịch trước.',
    });
  });

  it.each([
    ['translating', 'info', 'Đang dịch'],
    ['subtitle_not_found', 'muted', 'Không tìm thấy phụ đề'],
    ['error', 'danger', 'Có lỗi khi dịch'],
  ] as const)('maps %s to friendly status copy', (status, tone, title) => {
    expect(buildDiagnosticsView(true, { status, updatedAt: 1, detail: 'Chi tiết lỗi' }, 0))
      .toMatchObject({ tone, title });
  });
});
