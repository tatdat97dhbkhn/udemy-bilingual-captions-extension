export const bilingualContainerStyles = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '90%',
  maxWidth: '90%',
  boxSizing: 'border-box',
  textAlign: 'center',
} as const;

export function verticalOverflowOffset(
  group: Pick<DOMRect, 'top' | 'bottom'>,
  player: Pick<DOMRect, 'top' | 'bottom'>,
  gap = 6,
): number {
  const overflow = Math.max(0, group.bottom + gap - player.bottom);
  return Math.min(overflow, Math.max(0, group.top - player.top));
}
