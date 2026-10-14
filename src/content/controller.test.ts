import { CaptionController } from './controller';

describe('CaptionController', () => {
  it('does not render an older translation after a newer caption arrives', async () => {
    const rendered: Array<{ translation: string; target: string }> = [];
    let resolveFirst!: (value: { status: 'translated'; translation: string; cached: boolean }) => void;
    const first = new Promise<{ status: 'translated'; translation: string; cached: boolean }>((resolve) => { resolveFirst = resolve; });
    const controller = new CaptionController<string>(
      (text) => text === 'First' ? first : Promise.resolve({ status: 'translated', translation: 'Thứ hai', cached: false }),
      (translation, target) => rendered.push({ translation, target }),
      () => {},
    );
    controller.handle('First', 'first-caption');
    await controller.handle('Second', 'second-caption');
    resolveFirst({ status: 'translated', translation: 'Thứ nhất', cached: false });
    await Promise.resolve();
    expect(rendered).toEqual([{ translation: 'Thứ hai', target: 'second-caption' }]);
  });

  it('renders the next caption from a cached translation without waiting for another request', async () => {
    const rendered: string[] = [];
    const controller = new CaptionController<string>(
      async () => ({ status: 'translated', translation: 'Đã được dịch trước', cached: true, prefetchHit: true }),
      (translation) => rendered.push(translation),
      () => {},
    );

    await controller.handle('The next cue', 'caption');

    expect(rendered).toEqual(['Đã được dịch trước']);
  });

  it('re-renders a cached translation when Udemy replaces the caption element with the same text', async () => {
    const firstTarget = {};
    const replacementTarget = {};
    const rendered: Array<{ translation: string; target: object }> = [];
    let requests = 0;
    const controller = new CaptionController<object>(
      async () => { requests += 1; return { status: 'translated', translation: 'Bản dịch', cached: false }; },
      (translation, target) => rendered.push({ translation, target }),
      () => {},
    );

    await controller.handle('Same caption', firstTarget);
    await controller.handle('Same caption', replacementTarget);

    expect(requests).toBe(1);
    expect(rendered).toEqual([
      { translation: 'Bản dịch', target: firstTarget },
      { translation: 'Bản dịch', target: replacementTarget },
    ]);
  });

  it('reconciles the existing translation when Udemy moves the same caption element', async () => {
    const target = {};
    let reconciliations = 0;
    const controller = new CaptionController<object>(
      async () => ({ status: 'translated', translation: 'Bản dịch', cached: false }),
      () => {},
      () => {},
      () => { reconciliations += 1; },
    );

    await controller.handle('Same caption', target);
    await controller.handle('Same caption', target);

    expect(reconciliations).toBe(1);
  });
});
