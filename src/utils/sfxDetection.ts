import { SOUND_EFFECT_CATALOG } from '../data/soundEffects';
import { SoundEffectCue } from '../types';

// Pure regex keyword matching against a scene's own text -- no network
// call, so it's cheap enough to run on every scene at creation time (both
// the AI-storyboard and explicit-JSON paths) and again on demand from the
// "Detect sounds" button after an edit. Deliberately has zero DOM/Node
// dependencies so the exact same function runs server-side (storyboard
// generation) and client-side (the re-scan button).
export function detectSoundEffectCues(text: string): SoundEffectCue[] {
  if (!text) return [];
  return SOUND_EFFECT_CATALOG.filter((def) => def.keywords.test(text)).map((def) => def.id);
}
