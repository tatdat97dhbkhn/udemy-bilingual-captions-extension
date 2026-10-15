import { buildDiagnosticsView, buildProviderView } from './view-model';

describe('popup provider view', () => {
  it('shows the OpenAI model field only for OpenAI', () => {
    expect(buildProviderView('en', 'openai')).toEqual({
      showModel: true,
      showLibreTranslateEndpoint: false,
      apiKeyLabel: 'OpenAI API key',
    });
  });

  it('shows the LibreTranslate endpoint and optional key label', () => {
    expect(buildProviderView('en', 'libretranslate')).toEqual({
      showModel: false,
      showLibreTranslateEndpoint: true,
      apiKeyLabel: 'LibreTranslate API key (optional)',
    });
  });
});

describe('popup diagnostics view', () => {
  it('shows a disabled state instead of a ready state when translation is off', () => {
    expect(buildDiagnosticsView('en', false, { status: 'ready', updatedAt: 1 }, 4)).toMatchObject({
      tone: 'muted',
      title: 'Disabled',
      detail: 'Enable subtitle translation and save your settings to continue.',
      cacheCount: 4,
    });
  });

  it('shows ready metrics only when present', () => {
    expect(buildDiagnosticsView('en', true, {
      status: 'ready',
      updatedAt: 1,
      cacheHits: 3,
      prefetchHits: 2,
      activeTranslationMs: 124,
      transcriptAvailable: false,
    }, 8)).toEqual({
      tone: 'success',
      title: 'Ready',
      detail: 'Subtitle translation is active.',
      metrics: [
        { label: 'Saved translations', value: '8' },
        { label: 'Cache hits', value: '3' },
        { label: 'Prefetch hits', value: '2' },
        { label: 'Latest latency', value: '124 ms' },
      ],
      cacheCount: 8,
      transcriptDetail: 'No transcript is available for prefetching.',
    });
  });

  it.each([
    ['translating', 'info', 'Translating'],
    ['subtitle_not_found', 'muted', 'No subtitles found'],
    ['error', 'danger', 'Translation error'],
  ] as const)('maps %s to friendly status copy', (status, tone, title) => {
    expect(buildDiagnosticsView('en', true, { status, updatedAt: 1, detail: 'Chi tiết lỗi' }, 0))
      .toMatchObject({ tone, title });
  });

  it('renders Vietnamese diagnostics and metrics', () => {
    expect(buildDiagnosticsView('vi', true, {
      status: 'ready',
      updatedAt: 1,
      cacheHits: 3,
      transcriptAvailable: false,
    }, 8)).toEqual({
      tone: 'success',
      title: 'Sẵn sàng',
      detail: 'Dịch phụ đề đang hoạt động.',
      metrics: [
        { label: 'Bản dịch đã lưu', value: '8' },
        { label: 'Cache sử dụng', value: '3' },
      ],
      cacheCount: 8,
      transcriptDetail: 'Không có transcript để dịch trước.',
    });
  });

  it('localizes known translation errors', () => {
    expect(buildDiagnosticsView('vi', true, { status: 'error', updatedAt: 1, detail: 'missing_api_key' }, 0))
      .toMatchObject({ detail: 'Nhập API key để bắt đầu dịch phụ đề.' });
  });
});
