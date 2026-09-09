export type AspectRatio = '9:16' | '1:1' | '16:9';

export interface AspectRatioPreset {
  id: AspectRatio;
  label: string;
  width: number;
  height: number;
  cssAspect: string;
  description: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export type SceneAnimationStyle =
  | 'none'
  | 'zoom_in'
  | 'zoom_out'
  | 'pan_left'
  | 'pan_right'
  | 'pan_up'
  | 'pan_down'
  | 'ken_burns'
  | 'pulse'
  | 'rotate_left'
  | 'rotate_right'
  | 'drift'
  | 'shake';

// A second, independent motion layer drawn over the image (between it and
// the caption/watermark) -- vector particles/sweeps rendered as inline
// SVG, animated with CSS. Unlike animation_style this defaults to "none"
// and is never auto-assigned: it's a deliberate atmosphere choice per
// scene (snow for a winter scene, embers for a hearth scene), not
// something every scene should get by default.
export type SceneOverlayEffect = 'none' | 'sparkles' | 'floating_dust' | 'snow' | 'rain' | 'embers' | 'light_rays';

// A fixed catalog (src/data/soundEffects.ts) rather than free-text -- each
// one maps to both a real ElevenLabs sound-generation prompt and a
// procedural Web Audio fallback recipe, so there's always something
// playable regardless of whether an ElevenLabs key is configured.
export type SoundEffectCue =
  | 'thunder'
  | 'rain'
  | 'fire'
  | 'wind'
  | 'water_flow'
  | 'waves'
  | 'footsteps'
  | 'door_creak'
  | 'crowd'
  | 'birds'
  | 'heartbeat'
  | 'impact'
  | 'whoosh'
  | 'whisper'
  | 'bell'
  | 'clock_tick'
  | 'gasp'
  | 'laughter'
  | 'crying'
  | 'scream'
  | 'sword_clash'
  | 'explosion'
  | 'glass_shatter'
  | 'growl'
  | 'magic'
  | 'page_turn'
  | 'horse_gallop'
  | 'chains';

// One sound effect layered under a scene's narration/music during
// playback and export. Added either by scanning the scene's own text for
// matching keywords (thunder, footsteps, ...) at creation time, picked
// manually from the catalog afterward, or (custom_prompt set) generated
// from a free-text description when nothing in the catalog fits -- those
// are AI-only, with no procedural fallback recipe to fall back to.
export interface SceneSoundEffect {
  id: string;
  cue: SoundEffectCue | string;
  custom_prompt?: string;
  label?: string; // display name for a custom (non-catalog) sound effect
  volume: number; // 0-1
  audio_url?: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  is_ai_generated?: boolean; // true = ElevenLabs sound-generation, false/undefined = procedural fallback
  error_message?: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  reference_image_url?: string;
  is_ai_generated?: boolean;
  model_used?: string;
  error_message?: string;
}

export interface Scene {
  id: string;
  index: number;
  scene_number: number;
  beat?: string; // e.g. "setup" | "rising" | "climax" | "resolution" -- free text, not enforced
  characters_in_scene: string[]; // Character.id references
  action_description: string;
  visual_prompt: string;
  voice_line: string;
  caption_text?: string; // falls back to voice_line when absent
  // Every language variant of this scene's narration, keyed by language
  // code (see src/data/languages.ts). Populated either from a
  // multi-language JSON upload (free -- no translation needed) or lazily
  // the first time a language is requested from the dropdown (cached here
  // afterward). voice_line/caption_text above always mirror the story's
  // currently active language.
  voice_line_i18n?: Record<string, string>;
  caption_text_i18n?: Record<string, string>;
  duration: number; // fallback display seconds when no narration audio exists yet
  // How this scene's image moves during playback. Assigned randomly per
  // scene when the scene is created (so a story doesn't play as a wall of
  // identical zooms), and always user-editable afterward.
  animation_style: SceneAnimationStyle;
  // Optional vector particle/sweep layer drawn over the image. Defaults to
  // "none" -- an atmosphere choice the user opts into per scene, not a
  // random default like animation_style above.
  overlay_effect: SceneOverlayEffect;
  voice_name?: string;
  voice_rate?: number;
  voice_pitch?: number;
  status: 'pending' | 'generating' | 'needs_approval' | 'approved' | 'skipped' | 'failed';
  error_message?: string;
  image_url?: string;
  // Whether generation should attach the nearest earlier approved scene's
  // image as a continuity reference (same setting/character-pose
  // continuity trick as the character sheets). Defaults to false -- most
  // scenes change setting or framing enough that forcing a visual match
  // to whatever came right before would fight the prompt; turn it on
  // deliberately for a scene that's a direct continuation of the one
  // before it (same room, same beat, moments later).
  reference_previous_scene: boolean;
  reference_image_url?: string; // manual override anchor (pasted screenshot / forced reference)
  is_ai_generated?: boolean;
  model_used?: string;
  narration_audio_url?: string;
  audio_duration?: number;
  // Ambient/event sound effects layered under this scene's narration --
  // detected from its own text (or Gemini-suggested during AI storyboard
  // expansion) when the scene is created, editable afterward.
  sound_effects: SceneSoundEffect[];
  include_in_final: boolean;
  chat_history: ChatMessage[];
  approved_at?: number;
}

export interface EndCard {
  enabled: boolean;
  voice_line: string;
  voice_line_i18n?: Record<string, string>;
  cta_text: string;
  cta_text_i18n?: Record<string, string>;
  narration_audio_url?: string;
  audio_duration?: number;
  image_url?: string;
}

export type CaptionPosition = 'bottom' | 'top' | 'center';
export type CaptionPresetId =
  | 'modern'
  | 'corporate'
  | 'classic'
  | 'leon'
  | 'ali'
  | 'hormozi'
  | 'hormozi2'
  | 'dd'
  | 'dan2'
  | 'hormozi4'
  | 'ella'
  | 'maya'
  | 'gstaad'
  | 'nema'
  | 'warm'
  | 'retro_film'
  | 'cloud'
  | 'hormozi5'
  | 'beast'
  | 'minimalist'
  | 'firelight'
  | 'neon_cyber'
  | 'sunset_coral'
  | 'cinematic_gold'
  | 'tokyo_minimal'
  | 'comic_pop'
  | 'matcha_green'
  | 'pastel_cafe'
  | 'simple_bounce'
  | 'bubble_bounce'
  | 'spotlight'
  | 'slate_pop'
  | 'custom';

export type CaptionBoxStyle = 'none' | 'pill' | 'box' | 'glass' | 'word_badge';
export type CaptionAnimationMode = 'karaoke' | 'pop' | 'static' | 'bounce';
export type CaptionHighlightStyle = 'color' | 'badge' | 'glow' | 'box';
export type CaptionShadowType = 'none' | 'soft' | 'heavy_3d' | 'neon';

export interface CaptionConfig {
  enabled: boolean;
  preset_id: CaptionPresetId;
  font_family: string;
  font_size: number;
  font_weight: string;
  text_case: 'normal' | 'uppercase';
  text_color: string;
  highlight_color: string;
  highlight_style: CaptionHighlightStyle;
  box_style: CaptionBoxStyle;
  box_color: string;
  box_opacity: number;
  border_color?: string;
  border_width?: number;
  stroke_color: string;
  stroke_width: number;
  shadow_type: CaptionShadowType;
  shadow_color?: string;
  position_y: number; // 0.1-0.9, fraction of frame height
  max_words_per_line?: number;
  animation_mode: CaptionAnimationMode;
}

export type WatermarkPosition = 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'top_center' | 'bottom_center' | 'drift';

export interface WatermarkConfig {
  enabled: boolean;
  type: 'text' | 'image';
  text: string;
  image_url?: string;
  size: number; // font size (12-48) for text, or height in px for image
  opacity: number;
  position: WatermarkPosition;
  show_pill_backdrop: boolean;
  pill_color?: string;
  text_color?: string;
}

export type MoodPreset = 'natural' | 'warm_glow' | 'vivid_dream' | 'moody_dusk' | 'vintage_reel';

export type ThumbnailTheme = 'ink' | 'ember' | 'moss' | 'dusk' | 'gold' | 'crimson' | 'royal_purple' | 'minimal_white';
export type ThumbnailTextPosition = 'center' | 'top' | 'bottom_safe';

export interface ThumbnailConfig {
  source_type: 'scene' | 'custom';
  source_scene_index?: number;
  custom_image_url?: string;
  title: string;
  subtitle?: string;
  badge_text?: string;
  theme: ThumbnailTheme;
  text_position: ThumbnailTextPosition;
  show_safe_zone_guides: boolean;
  show_shadow_scrim: boolean;
  font_size_scale: number; // 0.7-1.4
  social_caption?: string; // caption text for sharing this thumbnail as a post
  hashtags?: string;
  generated_image_url?: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'unspecified';
  style: string;
  accent: string;
  category: 'gemini' | 'elevenlabs';
  voice_id?: string; // ElevenLabs custom ID, when category === 'elevenlabs'
  sample_text: string;
  is_custom?: boolean;
}

export interface Story {
  id: string;
  created_at: number;
  story_title: string;
  synopsis?: string;
  art_style_prompt: string;
  aspect_ratio: AspectRatio;
  dimensions: { width: number; height: number };
  voice_name: string;
  voice_rate?: number;
  voice_pitch?: number;
  // Active narration language for this story (ISO code from
  // src/data/languages.ts). Defaults to 'en'. Switching languages swaps
  // every voice_line/caption_text/cta_text to that language's entry in the
  // corresponding *_i18n map on each scene/card.
  language: string;
  // Languages that actually have content -- either supplied directly in a
  // multi-language JSON upload, or generated on demand via the language
  // dropdown (added here once translated, and cached from then on).
  available_languages: string[];
  mood: MoodPreset;
  music_track: 'none' | 'gentle_piano' | 'ambient_strings' | 'soft_pulse' | 'custom';
  music_volume: number; // 0-1
  custom_music_url?: string;
  characters: Character[];
  scenes: Scene[];
  end_card: EndCard;
  caption_config: CaptionConfig;
  watermark_config: WatermarkConfig;
  thumbnail: ThumbnailConfig;
  current_turn_index: number;
  auto_approve: boolean;
}

export interface ApiKeyStatus {
  has_key: boolean;
  masked_key?: string;
  is_valid?: boolean;
}

export interface ToastAlert {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: number;
  autoDismiss?: boolean;
  durationMs?: number;
}
