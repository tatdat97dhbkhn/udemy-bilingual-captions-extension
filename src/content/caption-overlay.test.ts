import { translationLineStyle } from './caption-overlay';

describe('translationLineStyle', () => {
  it('uses responsive in-flow styles instead of fixed viewport positioning', () => {
    expect(translationLineStyle).toContain('display:block');
    expect(translationLineStyle).toContain('max-width:100%');
    expect(translationLineStyle).toContain('overflow-wrap:anywhere');
    expect(translationLineStyle).toContain('position:relative');
    expect(translationLineStyle).not.toContain('position:fixed');
  });
});
