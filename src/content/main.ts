import { CaptionController } from './controller';
import { selectCaptionCandidate, selectTranscriptCaptions, type CaptionCandidate } from './caption-resolver';
import { reconcileTranslation, removeTranslation, renderTranslation } from './renderer';
import type { Diagnostics, TranslationResponse } from '../shared/types';

const SELECTORS = [
  '[class*="captions-cue-text"]', '[class*="well-module--text"]', '[data-purpose*="caption"][class*="cue"]',
  '[class*="caption"] [class*="text"]', '[class*="subtitle"] [class*="text"]',
  '[data-purpose*="caption"]', '[data-purpose*="subtitle"]', '[class*="caption"]', '[class*="subtitle"]',
];
const TRANSCRIPT_SELECTORS = [
  '[data-purpose*="transcript"] [data-purpose*="cue"]', '[data-purpose*="transcript"] [data-purpose*="caption"]',
  '[class*="transcript"] [class*="cue"]', '[class*="transcript"] [class*="caption"]',
  '[data-purpose*="transcript"] [role="button"]', '[class*="transcript"] [role="button"]',
];

function visibleCaption(): Element | undefined {
  const videoPlayer = document.querySelector('[data-purpose="shaka-video-player"]');
  const videoViewer = videoPlayer?.parentElement;
  if (!videoViewer) return undefined;
  const elements = [...new Set(SELECTORS.flatMap((selector) => [...videoViewer.querySelectorAll(selector)]))];
  const candidates = elements.map((element): CaptionCandidate & { element: Element } => ({
    element,
    text: element.textContent ?? '',
    visible: element.id !== 'udemy-bilingual-captions-extension-line' && (element as HTMLElement).offsetParent !== null,
    className: typeof element.className === 'string' ? element.className : '',
    isControl: element.matches('button, input, select, [role="button"]') || typeof element.className === 'string' && element.className.includes('button'),
    inVideoPlayer: true,
  }));
  return selectCaptionCandidate(candidates)?.element;
}

function updateDiagnostics(status: Diagnostics['status'], detail?: string, metrics: Partial<Diagnostics> = {}): void {
  void chrome.storage.local.get('diagnostics').then(({ diagnostics }) => {
    void chrome.storage.local.set({ diagnostics: { ...diagnostics, ...metrics, status, detail, updatedAt: Date.now() } satisfies Diagnostics });
  });
}

function transcriptCaptions(): string[] {
  const cues = [...new Set(TRANSCRIPT_SELECTORS.flatMap((selector) => [...document.querySelectorAll(selector)]))]
    .map((element) => element.textContent ?? '');
  return selectTranscriptCaptions(cues);
}

const controller = new CaptionController<Element>(
  (text, generation) => chrome.runtime.sendMessage({ type: 'translateCaption', text, target: 'vi', generation, priority: 'active' }) as Promise<TranslationResponse>,
  (translation, target) => renderTranslation(target, translation),
  removeTranslation,
  reconcileTranslation,
);

let frame: number | undefined;
function inspectCaption(): void {
  if (frame !== undefined) return;
  frame = window.requestAnimationFrame(() => {
    frame = undefined;
    chrome.storage.local.get('settings').then(({ settings }) => {
      if (settings?.enabled === false) { controller.disable(); return; }
      const caption = visibleCaption();
      if (!caption) { controller.disable(); updateDiagnostics('subtitle_not_found'); return; }
      const text = caption.textContent ?? '';
      const transcript = transcriptCaptions();
      updateDiagnostics('ready', undefined, { transcriptAvailable: transcript.length > 0 });
      void controller.handle(text, caption);
      if (transcript.length) void chrome.runtime.sendMessage({ type: 'prefetchCaptions', texts: transcript, target: 'vi', priority: 'prefetch' });
    });
  });
}

new MutationObserver(inspectCaption).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.settings) inspectCaption(); });
inspectCaption();
