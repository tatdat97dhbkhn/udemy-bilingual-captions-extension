import { bilingualContainerStyles, verticalOverflowOffset } from './caption-layout';

describe('bilingual subtitle layout', () => {
  it('uses a scoped centered flex column with a responsive video-relative width', () => {
    expect(bilingualContainerStyles).toMatchObject({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '90%',
      maxWidth: '90%',
      boxSizing: 'border-box',
      textAlign: 'center',
    });
  });

  it('moves the group upward only enough to keep it inside the player', () => {
    expect(verticalOverflowOffset({ top: 380, bottom: 510 }, { top: 0, bottom: 500 })).toBe(16);
    expect(verticalOverflowOffset({ top: 380, bottom: 490 }, { top: 0, bottom: 500 })).toBe(0);
    expect(verticalOverflowOffset({ top: 4, bottom: 540 }, { top: 0, bottom: 500 })).toBe(4);
  });
});
