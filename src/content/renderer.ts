import { bilingualContainerStyles, verticalOverflowOffset } from './caption-layout';
import { translationLineStyle } from './caption-overlay';

const ID = 'udemy-bilingual-captions-extension-line';
const ACTIVE_ATTRIBUTE = 'data-udemy-bilingual-active';
const CONTAINER_PROPERTIES = ['display', 'flex-direction', 'align-items', 'justify-content', 'width', 'max-width', 'box-sizing', 'text-align', 'translate'] as const;
const CAPTION_PROPERTIES = ['max-width', 'box-sizing', 'overflow-wrap', 'white-space', 'text-align'] as const;
type StyleSnapshot = Array<[string, string, string]>;

let activeContainer: HTMLElement | undefined;
let activeCaption: HTMLElement | undefined;
let containerStyles: StyleSnapshot = [];
let captionStyles: StyleSnapshot = [];
let originalActiveAttribute: string | null = null;
let resizeObserver: ResizeObserver | undefined;
let layoutFrame: number | undefined;
let appliedVerticalOffset = 0;

function snapshotStyles(element: HTMLElement, properties: readonly string[]): StyleSnapshot {
  return properties.map((property) => [property, element.style.getPropertyValue(property), element.style.getPropertyPriority(property)]);
}

function restoreStyles(element: HTMLElement, styles: StyleSnapshot): void {
  styles.forEach(([property, value, priority]) => {
    if (value) element.style.setProperty(property, value, priority); else element.style.removeProperty(property);
  });
}

function restoreContainerLayout(): void {
  if (!activeContainer) return;
  if (layoutFrame !== undefined) window.cancelAnimationFrame(layoutFrame);
  layoutFrame = undefined;
  resizeObserver?.disconnect();
  resizeObserver = undefined;
  restoreStyles(activeContainer, containerStyles);
  if (originalActiveAttribute === null) activeContainer.removeAttribute(ACTIVE_ATTRIBUTE); else activeContainer.setAttribute(ACTIVE_ATTRIBUTE, originalActiveAttribute);
  activeContainer = undefined;
  containerStyles = [];
  originalActiveAttribute = null;
  appliedVerticalOffset = 0;
}

function restoreCaptionLayout(): void {
  if (!activeCaption) return;
  restoreStyles(activeCaption, captionStyles);
  activeCaption = undefined;
  captionStyles = [];
}

function playerFor(element: Element): HTMLElement | undefined {
  return element.closest('[data-purpose="shaka-video-player"]') as HTMLElement | null
    ?? document.querySelector<HTMLElement>('[data-purpose="shaka-video-player"]') ?? undefined;
}

function restoreContainerTranslate(): void {
  if (!activeContainer) return;
  const original = containerStyles.find(([property]) => property === 'translate');
  if (!original) return;
  const [, value, priority] = original;
  if (value) activeContainer.style.setProperty('translate', value, priority); else activeContainer.style.removeProperty('translate');
}

function fitInsidePlayer(): void {
  layoutFrame = undefined;
  if (!activeContainer?.isConnected) return;
  const player = playerFor(activeContainer);
  if (!player?.isConnected) return;
  const offset = Math.ceil(verticalOverflowOffset(activeContainer.getBoundingClientRect(), player.getBoundingClientRect()));
  if (offset === appliedVerticalOffset) return;
  appliedVerticalOffset = offset;
  if (offset) activeContainer.style.setProperty('translate', `0 -${offset}px`, 'important'); else restoreContainerTranslate();
}

function scheduleFitInsidePlayer(): void {
  if (layoutFrame !== undefined) return;
  layoutFrame = window.requestAnimationFrame(fitInsidePlayer);
}

function activateLayout(container: HTMLElement, captionElement: Element): void {
  if (activeContainer !== container) {
    restoreContainerLayout();
    activeContainer = container;
    containerStyles = snapshotStyles(container, CONTAINER_PROPERTIES);
    originalActiveAttribute = container.getAttribute(ACTIVE_ATTRIBUTE);
    container.setAttribute(ACTIVE_ATTRIBUTE, 'true');
    Object.entries(bilingualContainerStyles).forEach(([property, value]) => container.style.setProperty(property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), value, 'important'));
    const player = playerFor(container);
    if (typeof ResizeObserver !== 'undefined' && player) {
      resizeObserver = new ResizeObserver(scheduleFitInsidePlayer);
      resizeObserver.observe(container);
      resizeObserver.observe(player);
    }
  }

  const caption = captionElement as HTMLElement;
  if (activeCaption !== caption) {
    restoreCaptionLayout();
    activeCaption = caption;
    captionStyles = snapshotStyles(caption, CAPTION_PROPERTIES);
    caption.style.setProperty('max-width', '100%', 'important');
    caption.style.setProperty('box-sizing', 'border-box', 'important');
    caption.style.setProperty('overflow-wrap', 'break-word', 'important');
    caption.style.setProperty('white-space', 'normal', 'important');
    caption.style.setProperty('text-align', 'center', 'important');
  }
}

function placeLineAfterCaption(captionElement: Element): { line: HTMLElement; changed: boolean } | undefined {
  const container = captionElement.parentElement;
  if (!container) return undefined;
  let changed = activeContainer !== container || activeCaption !== captionElement;
  activateLayout(container, captionElement);
  let line = document.getElementById(ID) as HTMLElement | null;
  if (!line) {
    line = document.createElement('div');
    line.id = ID;
    line.setAttribute('data-udemy-bilingual-captions', 'true');
    line.setAttribute('lang', 'vi');
    line.style.cssText = translationLineStyle;
    changed = true;
  }
  if (line.parentElement !== container || line.previousElementSibling !== captionElement) {
    container.insertBefore(line, captionElement.nextSibling);
    changed = true;
  }
  return { line, changed };
}

export function removeTranslation(): void {
  document.getElementById(ID)?.remove();
  restoreCaptionLayout();
  restoreContainerLayout();
}

export function renderTranslation(captionElement: Element, translation: string): void {
  const placement = placeLineAfterCaption(captionElement);
  if (!placement) return;
  const contentChanged = placement.line.textContent !== translation;
  if (contentChanged) placement.line.textContent = translation;
  if (placement.changed || contentChanged) scheduleFitInsidePlayer();
}

export function reconcileTranslation(captionElement: Element): void {
  const placement = placeLineAfterCaption(captionElement);
  if (placement?.changed) scheduleFitInsidePlayer();
}
