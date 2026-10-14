import { overlayPosition } from './caption-overlay';

describe('overlayPosition', () => {
  it('places the Vietnamese line directly below the visible English caption', () => {
    expect(overlayPosition({ left: 100, bottom: 240, width: 480 })).toEqual({ left: '100px', top: '204px', width: '480px' });
  });
});
