export interface CaptionCandidate {
  text: string;
  visible: boolean;
  className: string;
  isControl: boolean;
  inVideoPlayer: boolean;
}

export function selectCaptionCandidate<T extends CaptionCandidate>(candidates: T[]): T | undefined {
  const usable = candidates.filter((candidate) => candidate.inVideoPlayer && candidate.visible && candidate.text.trim() && !candidate.isControl);
  return usable.find((candidate) => candidate.className.includes('captions-cue-text'))
    ?? usable.find((candidate) => candidate.className.includes('well-module--text'))
    ?? usable[0];
}
import { normalizeCaption } from '../core/caption';


export function selectUpcomingCaptions(currentCaption: string, transcriptTexts: string[], limit = 6): string[] {
  const current = normalizeCaption(currentCaption);
  const cues = transcriptTexts.map(normalizeCaption).filter(Boolean);
  const currentIndex = cues.indexOf(current);
  if (currentIndex < 0) return [];
  return cues.slice(currentIndex + 1).filter((cue, index, following) => cue !== current && following.indexOf(cue) === index).slice(0, limit);
}

export function selectTranscriptCaptions(transcriptTexts: string[]): string[] {
  return [...new Set(transcriptTexts.map(normalizeCaption).filter(Boolean))];
}
