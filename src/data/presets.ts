import { AspectRatioPreset, MoodPreset, SceneAnimationStyle, SceneOverlayEffect, ThumbnailTheme, VoiceOption } from '../types';

export const OVERLAY_EFFECTS: { id: SceneOverlayEffect; label: string; description: string }[] = [
  { id: 'none', label: 'None', description: 'Just the image' },
  { id: 'sparkles', label: 'Sparkles', description: 'Twinkling points of light' },
  { id: 'floating_dust', label: 'Floating dust', description: 'Soft drifting motes' },
  { id: 'snow', label: 'Snow', description: 'Falling snowflakes' },
  { id: 'rain', label: 'Rain', description: 'Falling rain streaks' },
  { id: 'embers', label: 'Embers', description: 'Rising glowing embers' },
  { id: 'light_rays', label: 'Light rays', description: 'Sweeping diagonal light' },
];

export const ANIMATION_STYLES: { id: SceneAnimationStyle; label: string; description: string }[] = [
  { id: 'none', label: 'Static', description: 'No motion' },
  { id: 'zoom_in', label: 'Zoom in', description: 'Slow push in' },
  { id: 'zoom_out', label: 'Zoom out', description: 'Slow pull back' },
  { id: 'pan_left', label: 'Pan left', description: 'Drifts left to right' },
  { id: 'pan_right', label: 'Pan right', description: 'Drifts right to left' },
  { id: 'pan_up', label: 'Pan up', description: 'Drifts bottom to top' },
  { id: 'pan_down', label: 'Pan down', description: 'Drifts top to bottom' },
  { id: 'ken_burns', label: 'Ken Burns', description: 'Diagonal zoom + pan' },
  { id: 'pulse', label: 'Pulse', description: 'Gentle breathing zoom' },
  { id: 'rotate_left', label: 'Rotate left', description: 'Slow counter-clockwise tilt + zoom' },
  { id: 'rotate_right', label: 'Rotate right', description: 'Slow clockwise tilt + zoom' },
  { id: 'drift', label: 'Drift', description: 'Very slow diagonal float, no zoom' },
  { id: 'shake', label: 'Shake', description: 'Energetic jitter -- action or comedy beats' },
];

// Random default per scene so a story doesn't play as a wall of identical
// zooms -- "none", "ken_burns", "rotate_left/right", and "shake" are left
// out of the pool entirely: each is a strong, deliberate look (flat,
// busiest, tilted, or jittery) that should be a conscious pick, not
// something a scene ends up with by chance.
const RANDOM_ANIMATION_POOL: SceneAnimationStyle[] = [
  'zoom_in',
  'zoom_out',
  'pan_left',
  'pan_right',
  'pan_up',
  'pan_down',
  'pulse',
  'drift',
  'zoom_in',
  'pan_left',
  'pan_right',
];

export function randomAnimationStyle(): SceneAnimationStyle {
  return RANDOM_ANIMATION_POOL[Math.floor(Math.random() * RANDOM_ANIMATION_POOL.length)];
}

export const ASPECT_RATIOS: AspectRatioPreset[] = [
  { id: '9:16', label: 'Vertical', width: 768, height: 1360, cssAspect: '9 / 16', description: 'Reels, TikTok, Shorts' },
  { id: '1:1', label: 'Square', width: 1024, height: 1024, cssAspect: '1 / 1', description: 'Feed post' },
  { id: '16:9', label: 'Widescreen', width: 1360, height: 768, cssAspect: '16 / 9', description: 'YouTube, presentation' },
];

const SAMPLE = 'Once, in a town by the sea, a lighthouse keeper watched the water.';

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'narrator', name: 'Narrator', gender: 'female', style: 'Balanced, clear storyteller', accent: 'Neutral', category: 'gemini', sample_text: SAMPLE },
  { id: 'warm', name: 'Warm', gender: 'female', style: 'Gentle, inviting', accent: 'Neutral', category: 'gemini', sample_text: SAMPLE },
  { id: 'upbeat', name: 'Upbeat', gender: 'male', style: 'Energetic, bright', accent: 'Neutral', category: 'gemini', sample_text: SAMPLE },
  { id: 'deep', name: 'Deep', gender: 'male', style: 'Low, resonant', accent: 'Neutral', category: 'gemini', sample_text: SAMPLE },
  { id: 'mentor', name: 'Mentor', gender: 'male', style: 'Crisp, measured', accent: 'Neutral', category: 'gemini', sample_text: SAMPLE },
  { id: 'rachel', name: 'Rachel', gender: 'female', style: 'ElevenLabs neural', accent: 'American', category: 'elevenlabs', voice_id: '21m00Tcm4TlvDq8ikWAM', sample_text: SAMPLE },
  { id: 'bella', name: 'Bella', gender: 'female', style: 'ElevenLabs neural, soft', accent: 'American', category: 'elevenlabs', voice_id: 'EXAVITQu4vr4xnSDxMaL', sample_text: SAMPLE },
  { id: 'adam', name: 'Adam', gender: 'male', style: 'ElevenLabs neural', accent: 'American', category: 'elevenlabs', voice_id: 'pNInz6obpgDQGcFmaJgB', sample_text: SAMPLE },
  { id: 'josh', name: 'Josh', gender: 'male', style: 'ElevenLabs neural, grounded', accent: 'American', category: 'elevenlabs', voice_id: 'TxGEqnHWrfWFTfGW9XjX', sample_text: SAMPLE },
  { id: 'freya', name: 'Freya', gender: 'female', style: 'ElevenLabs neural, bright', accent: 'American', category: 'elevenlabs', voice_id: 'jsCqWAovK2LkecY7zXl4', sample_text: SAMPLE },
];

export const THUMBNAIL_THEMES: { id: ThumbnailTheme; label: string; overlay: [string, string]; text: string; accent: string }[] = [
  { id: 'ink', label: 'Ink', overlay: ['rgba(10,10,18,0)', 'rgba(10,10,18,0.92)'], text: '#f4f2e8', accent: '#d9a042' },
  { id: 'ember', label: 'Ember', overlay: ['rgba(40,12,4,0)', 'rgba(40,12,4,0.88)'], text: '#ffe7c2', accent: '#f97316' },
  { id: 'moss', label: 'Moss', overlay: ['rgba(8,20,14,0)', 'rgba(8,20,14,0.9)'], text: '#eaf3e2', accent: '#4ade80' },
  { id: 'dusk', label: 'Dusk', overlay: ['rgba(18,10,32,0)', 'rgba(18,10,32,0.9)'], text: '#eae0ff', accent: '#a78bfa' },
  { id: 'gold', label: 'Gold', overlay: ['rgba(28,20,4,0)', 'rgba(28,20,4,0.92)'], text: '#fff6df', accent: '#fbbf24' },
  { id: 'crimson', label: 'Crimson', overlay: ['rgba(32,6,8,0)', 'rgba(32,6,8,0.92)'], text: '#ffe9e5', accent: '#f43f5e' },
  { id: 'royal_purple', label: 'Royal', overlay: ['rgba(20,6,36,0)', 'rgba(20,6,36,0.92)'], text: '#f1e6ff', accent: '#c084fc' },
  { id: 'minimal_white', label: 'Minimal', overlay: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.88)'], text: '#151220', accent: '#151220' },
];

// Applied as a CSS filter() on both the scene <img> in playback and the
// thumbnail canvas draw -- a mood is purely a grade over whatever image
// already exists, never a regeneration.
export const MOOD_PRESETS: { id: MoodPreset; label: string; description: string; filter: string }[] = [
  { id: 'natural', label: 'Natural', description: 'No grade -- exactly as generated', filter: 'none' },
  { id: 'warm_glow', label: 'Warm Glow', description: 'Golden-hour warmth, gentle lift', filter: 'saturate(1.15) sepia(0.12) brightness(1.05) contrast(1.03)' },
  { id: 'vivid_dream', label: 'Vivid Dream', description: 'Punchy color, storybook vibrance', filter: 'saturate(1.4) contrast(1.12) brightness(1.02)' },
  { id: 'moody_dusk', label: 'Moody Dusk', description: 'Desaturated, cooler shadows, cinematic', filter: 'saturate(0.75) contrast(1.15) brightness(0.92) hue-rotate(-6deg)' },
  { id: 'vintage_reel', label: 'Vintage Reel', description: 'Faded film, warm-grey lift', filter: 'sepia(0.35) saturate(0.85) contrast(0.95) brightness(1.03)' },
];

export const MUSIC_TRACKS: { id: 'none' | 'gentle_piano' | 'ambient_strings' | 'soft_pulse' | 'custom'; label: string; description: string }[] = [
  { id: 'none', label: 'No music', description: 'Narration only' },
  { id: 'gentle_piano', label: 'Gentle Piano', description: 'Soft, reflective -- fits quiet or emotional stories' },
  { id: 'ambient_strings', label: 'Ambient Strings', description: 'Slow-building, cinematic' },
  { id: 'soft_pulse', label: 'Soft Pulse', description: 'Light rhythmic bed -- fits adventure/upbeat stories' },
  { id: 'custom', label: 'Custom URL', description: 'Paste a link to your own track' },
];
