import { selectCaptionCandidate, selectTranscriptCaptions, selectUpcomingCaptions, type CaptionCandidate } from './caption-resolver';

describe('selectCaptionCandidate', () => {
  it('prefers Udemy’s active caption cue over visible caption controls', () => {
    const cue: CaptionCandidate = {
      text: "For me, I'm on a Mac.",
      visible: true,
      className: 'captions-display-module--captions-cue-text--KMBV6',
      isControl: false,
      inVideoPlayer: true,
    };
    const selected = selectCaptionCandidate([
      { text: '', visible: true, className: 'ud-btn', isControl: true, inVideoPlayer: true },
      cue,
      { text: '20 more', visible: true, className: 'caption--more-button--qgehZ', isControl: true, inVideoPlayer: true },
    ]);
    expect(selected).toBe(cue);
  });

  it('prefers the alternate Udemy well caption over the language menu', () => {
    const cue: CaptionCandidate = {
      text: 'which should be free for the first few weeks',
      visible: true,
      className: 'well-module--text--pTRTZ',
      isControl: false,
      inVideoPlayer: true,
    };
    expect(selectCaptionCandidate([
      { text: 'English [Auto], Arabic [Auto], 20 more', visible: true, className: 'caption--captions--CfBBJ', isControl: false, inVideoPlayer: true },
      cue,
    ])).toBe(cue);
  });

  it('ignores subtitle-like elements outside the video player', () => {
    const footer = {
      text: 'Create an online video course, reach students across the globe, and earn money',
      visible: true,
      className: 'teach-on-udemy-banner-module--subtitle--3L3r-',
      isControl: false,
      inVideoPlayer: false,
    } as CaptionCandidate & { inVideoPlayer: false };
    expect(selectCaptionCandidate([footer])).toBeUndefined();
  });

  it('returns the next normalized transcript cues after the active caption', () => {
    expect(selectUpcomingCaptions('Current cue', [
      'Earlier cue', ' Current   cue ', 'Next cue', 'Next cue', 'Third cue', 'Fourth cue', 'Fifth cue', 'Sixth cue', 'Seventh cue',
    ])).toEqual(['Next cue', 'Third cue', 'Fourth cue', 'Fifth cue', 'Sixth cue', 'Seventh cue']);
  });

  it('collects all unique transcript cues rendered by Udemy, regardless of the active caption', () => {
    expect(selectTranscriptCaptions([' First cue ', 'Second cue', 'First   cue', '', 'Third cue'])).toEqual([
      'First cue', 'Second cue', 'Third cue',
    ]);
  });
});
