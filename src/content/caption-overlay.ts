export function overlayPosition(bounds: Pick<DOMRect, 'left' | 'bottom' | 'width'>): Record<'left' | 'top' | 'width', string> {
  return { left: `${bounds.left}px`, top: `${bounds.bottom - 36}px`, width: `${bounds.width}px` };
}
