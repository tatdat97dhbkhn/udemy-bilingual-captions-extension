import { overlayPosition } from './caption-overlay';

const ID = 'udemy-bilingual-captions-extension-line';
let anchor: Element | undefined;

function reposition(): void {
  const line = document.getElementById(ID) as HTMLElement | null;
  if (!line || !anchor?.isConnected) return;
  Object.assign(line.style, overlayPosition(anchor.getBoundingClientRect()));
}

export function removeTranslation(): void {
  document.getElementById(ID)?.remove();
  anchor = undefined;
}

export function renderTranslation(captionElement: Element, translation: string): void {
  let line = document.getElementById(ID) as HTMLElement | null;
  if (!line) {
    line = document.createElement('div');
    line.id = ID;
    line.setAttribute('data-udemy-bilingual-captions', 'true');
    line.setAttribute('lang', 'vi');
    line.style.cssText = 'background:#1c1d1f;box-sizing:border-box;color:#fff;font-size:1em;font-weight:500;line-height:1.35;margin:0;padding:2px 6px;pointer-events:none;position:fixed;text-align:center;text-shadow:0 1px 3px #000;z-index:2147483647;';
  }
  if (line.parentElement !== document.body) {
    const previousParent = line.parentElement as HTMLElement | null;
    if (previousParent?.className.includes('well-module--container')) {
      previousParent.style.flexDirection = '';
      previousParent.style.position = '';
    }
    document.body.append(line);
  }
  line.style.position = 'fixed';
  anchor = captionElement;
  line.textContent = translation;
  reposition();
}

window.addEventListener('resize', reposition);
window.addEventListener('scroll', reposition, true);
