// Speed and pitch are pure playback-time transforms -- the TTS provider
// never sees them, and the generated clip's bytes never change. That's
// deliberate: it means changing either one is instant (no regeneration)
// and works retroactively on narration generated before the controls
// existed.
//
// Speed alone uses the browser's native pitch-preserving time-stretch
// (`preservesPitch: true`, the default) so slowing down or speeding up
// narration doesn't touch its timbre. True pitch-shifting independent of
// speed needs a phase-vocoder/PSOLA algorithm that isn't worth pulling in
// a DSP library for here, so "modulation" is implemented the same way
// simple voice-changer tools do it: as an extra playback-rate multiplier
// with pitch-preservation turned off, which genuinely shifts pitch at the
// cost of coupling it to a proportional speed change. Speed-only (pitch
// left at 0) stays completely unaffected by that trade-off.

export interface NarrationPlaybackRate {
  playbackRate: number;
  preservesPitch: boolean;
}

export function computeNarrationPlayback(rate: number | undefined, pitchSemitones: number | undefined): NarrationPlaybackRate {
  const clampedRate = Math.min(2, Math.max(0.5, rate || 1));
  const semitones = pitchSemitones || 0;
  if (!semitones) return { playbackRate: clampedRate, preservesPitch: true };
  const pitchRatio = Math.pow(2, semitones / 12);
  return { playbackRate: clampedRate * pitchRatio, preservesPitch: false };
}

// Applies the computed rate/pitch to a real <audio> element (setting the
// vendor-prefixed preservesPitch variants too, for older WebKit/Firefox)
// and returns the resulting playbackRate so the caller can shrink the
// scene's nominal (rate=1) duration to how long it'll actually take to
// play at this rate.
export function applyNarrationPlayback(audio: HTMLAudioElement, rate: number | undefined, pitchSemitones: number | undefined): number {
  const { playbackRate, preservesPitch } = computeNarrationPlayback(rate, pitchSemitones);
  audio.playbackRate = playbackRate;
  (audio as any).preservesPitch = preservesPitch;
  (audio as any).webkitPreservesPitch = preservesPitch;
  (audio as any).mozPreservesPitch = preservesPitch;
  return playbackRate;
}
