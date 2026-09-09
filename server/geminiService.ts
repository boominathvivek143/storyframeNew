import { GoogleGenAI } from '@google/genai';
import { AspectRatio, CaptionConfig, Character, ChatMessage, Scene, SceneAnimationStyle, SceneOverlayEffect, SceneSoundEffect, SoundEffectCue, Story } from '../src/types';
import { ANIMATION_STYLES, OVERLAY_EFFECTS, randomAnimationStyle } from '../src/data/presets';
import { SOUND_EFFECT_CATALOG } from '../src/data/soundEffects';
import { detectSoundEffectCues } from '../src/utils/sfxDetection';

let sfxSeq = 0;
function buildSoundEffects(cues: SoundEffectCue[]): SceneSoundEffect[] {
  return Array.from(new Set(cues)).map((cue) => ({ id: `sfx-${cue}-${++sfxSeq}-${Date.now()}`, cue, volume: 0.85, status: 'pending' as const }));
}

function resolveSoundEffects(s: any, textForDetection: string): SceneSoundEffect[] {
  const validCueIds = new Set(SOUND_EFFECT_CATALOG.map((d) => d.id));
  const rawSfx = s?.sound_effects ?? s?.sound_effect_cues ?? s?.soundEffects ?? s?.soundEffectCues ?? s?.sfx ?? s?.sounds ?? s?.audio_cues ?? s?.sound_cues;

  const resolved: SceneSoundEffect[] = [];
  const resolvedCues = new Set<string>();

  if (Array.isArray(rawSfx)) {
    for (const item of rawSfx) {
      if (typeof item === 'string') {
        const directCue = item.toLowerCase().trim() as SoundEffectCue;
        if (validCueIds.has(directCue)) {
          if (!resolvedCues.has(directCue)) {
            resolved.push({
              id: `sfx-${directCue}-${++sfxSeq}-${Date.now()}`,
              cue: directCue,
              volume: 0.85,
              status: 'pending',
            });
            resolvedCues.add(directCue);
          }
        } else {
          // Freeform sound descriptions like "rural wind", "deep well impact", etc.
          const detected = detectSoundEffectCues(item);
          for (const cue of detected) {
            if (!resolvedCues.has(cue)) {
              resolved.push({
                id: `sfx-${cue}-${++sfxSeq}-${Date.now()}`,
                cue,
                volume: 0.85,
                status: 'pending',
              });
              resolvedCues.add(cue);
            }
          }
        }
      } else if (item && typeof item === 'object' && item.cue && validCueIds.has(item.cue)) {
        const cue = item.cue as SoundEffectCue;
        if (!resolvedCues.has(cue)) {
          resolved.push({
            id: item.id || `sfx-${cue}-${++sfxSeq}-${Date.now()}`,
            cue,
            volume: typeof item.volume === 'number' ? item.volume : 0.85,
            audio_url: item.audio_url || undefined,
            status: item.audio_url ? 'ready' : (item.status || 'pending'),
            is_ai_generated: item.is_ai_generated,
          });
          resolvedCues.add(cue);
        }
      }
    }
  }

  // Detect cues from the combined text (including caption_text!)
  const detectedCues = detectSoundEffectCues(textForDetection);
  for (const cue of detectedCues) {
    if (!resolvedCues.has(cue)) {
      resolved.push({
        id: `sfx-${cue}-${++sfxSeq}-${Date.now()}`,
        cue,
        volume: 0.85,
        status: 'pending',
      });
      resolvedCues.add(cue);
    }
  }

  return resolved;
}

// Some uploaded JSONs direct the camera/atmosphere in plain descriptive
// English (a `photo_animation.camera` string like "slow push in", a
// `graphics_prompt` like "subtle dust movement") rather than in our exact
// enum values. These keyword maps are the best-effort bridge from that
// prose to the nearest animation_style/overlay_effect -- used only as a
// fallback when a scene doesn't give an exact enum value directly, and
// themselves falling back to the usual random pick / "none" when nothing
// matches, so a file that describes camera direction in some other way
// never breaks, it just gets the ordinary default.
const ANIMATION_HINT_RULES: [RegExp, SceneAnimationStyle][] = [
  [/push in|zoom(s)? in|move(s)? (closer|toward)/, 'zoom_in'],
  [/pull (out|back|away)|zoom(s)? out/, 'zoom_out'],
  [/tilt.*up|upward tilt|tilt upward|reveal/, 'pan_up'],
  [/tilt.*down|downward tilt|top.to.bottom/, 'pan_down'],
  [/left.to.right/, 'pan_right'],
  [/right.to.left/, 'pan_left'],
  [/orbit|circular|handheld|shake|chaotic/, 'ken_burns'],
  [/vertical tracking|follows?.*downward|falling/, 'pan_down'],
  [/breath|very subtle|gentle pulse/, 'pulse'],
];
function resolveAnimationStyleFromHint(hintText: string): SceneAnimationStyle | null {
  const t = hintText.toLowerCase();
  for (const [pattern, style] of ANIMATION_HINT_RULES) {
    if (pattern.test(t)) return style;
  }
  return null;
}

const VALID_ANIMATION_STYLES = new Set(ANIMATION_STYLES.map((a) => a.id));
function resolveAnimationStyle(raw: any, hintText?: string): SceneAnimationStyle {
  if (typeof raw === 'string' && VALID_ANIMATION_STYLES.has(raw as SceneAnimationStyle)) return raw as SceneAnimationStyle;
  if (hintText) {
    const mapped = resolveAnimationStyleFromHint(hintText);
    if (mapped) return mapped;
  }
  return randomAnimationStyle();
}

const OVERLAY_HINT_RULES: [RegExp, SceneOverlayEffect][] = [
  [/dust/, 'floating_dust'],
  [/ember|firelight|flicker|glow|orange light/, 'embers'],
  [/rain/, 'rain'],
  [/snow/, 'snow'],
  [/spark|glimmer|light particles/, 'sparkles'],
  [/light (beam|ray|shaft)/, 'light_rays'],
];
function resolveOverlayEffectFromHint(hintText: string): SceneOverlayEffect | null {
  const t = hintText.toLowerCase();
  for (const [pattern, effect] of OVERLAY_HINT_RULES) {
    if (pattern.test(t)) return effect;
  }
  return null;
}

// Unlike animation_style, an overlay effect is never auto-assigned when
// missing/invalid -- it's an opt-in atmosphere choice, so a hint miss
// quietly defaults to "none" rather than picking a random one.
const VALID_OVERLAY_EFFECTS = new Set(OVERLAY_EFFECTS.map((f) => f.id));
function resolveOverlayEffect(raw: any, hintText?: string): SceneOverlayEffect {
  if (typeof raw === 'string' && VALID_OVERLAY_EFFECTS.has(raw as SceneOverlayEffect)) return raw as SceneOverlayEffect;
  if (hintText) {
    const mapped = resolveOverlayEffectFromHint(hintText);
    if (mapped) return mapped;
  }
  return 'none';
}

// A story-level `caption_style` describing the look in plain English (font
// weight, text/highlight color names, position, background, animation) --
// interpreted as overrides on top of the app's default caption config.
// Never a full replacement: any field the description doesn't clearly
// touch keeps the default's value.
export function resolveCaptionConfigFromStyleHint(hint: any, base: CaptionConfig): CaptionConfig {
  if (!hint || typeof hint !== 'object') return base;
  const config: CaptionConfig = { ...base };
  const lower = (v: any): string => (typeof v === 'string' ? v.toLowerCase() : '');

  const fontCase = lower(hint.font_case);
  if (fontCase.includes('upper')) config.text_case = 'uppercase';
  else if (fontCase.includes('sentence') || fontCase.includes('normal') || fontCase.includes('title')) config.text_case = 'normal';

  if (lower(hint.text_color).includes('white')) config.text_color = '#FFFFFF';

  const highlight = lower(hint.highlight_color);
  if (highlight.includes('yellow') || highlight.includes('gold')) config.highlight_color = '#FBBF24';
  else if (highlight.includes('red')) config.highlight_color = '#EF4444';
  else if (highlight.includes('green')) config.highlight_color = '#4ADE80';
  else if (highlight.includes('blue')) config.highlight_color = '#60A5FA';
  else if (highlight.includes('orange')) config.highlight_color = '#FB923C';

  const position = lower(hint.position);
  if (position.includes('bottom')) config.position_y = 0.84;
  else if (position.includes('top')) config.position_y = 0.14;
  else if (position.includes('center') || position.includes('middle')) config.position_y = 0.5;

  const background = lower(hint.background);
  if (background.includes('black') || background.includes('gradient') || background.includes('semi-transparent') || background.includes('dark')) {
    config.box_style = 'box';
    config.box_color = '#000000';
    config.box_opacity = 0.45;
  } else if (background.includes('none') || background.includes('no background') || background.includes('transparent')) {
    config.box_style = 'none';
  }

  const shadow = lower(hint.shadow);
  if (shadow.includes('heavy') || shadow.includes('3d')) config.shadow_type = 'heavy_3d';
  else if (shadow.includes('neon') || shadow.includes('glow')) config.shadow_type = 'neon';
  else if (shadow.includes('soft')) config.shadow_type = 'soft';
  else if (shadow.includes('none')) config.shadow_type = 'none';

  const wordAnimation = lower(hint.word_animation);
  const animation = lower(hint.animation);
  if (wordAnimation.includes('word') && (wordAnimation.includes('emphasis') || wordAnimation.includes('highlight'))) config.animation_mode = 'karaoke';
  else if (animation.includes('pop') || animation.includes('bounce')) config.animation_mode = 'pop';
  else config.animation_mode = 'static';

  if (typeof hint.maximum_lines === 'number') {
    config.max_words_per_line = hint.maximum_lines <= 1 ? 6 : hint.maximum_lines === 2 ? 5 : 4;
  }

  return config;
}

// Callers pass server.ts's own getGeminiKey() result through; apiKey is
// only an optional override for that (there is no per-user key anymore).

export function getGenAI(apiKey?: string | null): GoogleGenAI | null {
  const trimmed = apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!trimmed) return null;
  return new GoogleGenAI({
    apiKey: trimmed,
    httpOptions: { headers: { 'User-Agent': 'storyframe' } },
  });
}

export async function testApiKeyConnection(testKey?: string): Promise<{ success: boolean; message: string }> {
  const keyToTest = testKey?.trim() || process.env.GEMINI_API_KEY?.trim() || undefined;
  if (!keyToTest) return { success: false, message: 'No API key provided.' };

  try {
    const testAI = new GoogleGenAI({ apiKey: keyToTest, httpOptions: { headers: { 'User-Agent': 'storyframe' } } });
    const response = await testAI.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: 'Ping: Reply with {"status":"ok"} in json',
      config: { responseMimeType: 'application/json' },
    });
    if (response.text) return { success: true, message: 'Gemini API key is valid and connected successfully!' };
    return { success: false, message: 'API responded with empty output.' };
  } catch (err: any) {
    try {
      const testAI = new GoogleGenAI({ apiKey: keyToTest, httpOptions: { headers: { 'User-Agent': 'storyframe' } } });
      const response = await testAI.models.generateContent({ model: 'gemini-flash-latest', contents: 'Ping: Reply with OK' });
      if (response.text) return { success: true, message: 'Gemini API key is valid and connected successfully (via fallback model)!' };
    } catch (fallbackErr: any) {
      return { success: false, message: fallbackErr.message || err.message || 'Failed to authenticate API key' };
    }
    return { success: false, message: err.message || 'Failed to authenticate API key' };
  }
}

// ---------------------------------------------------------------------
// Retry / timeout helpers -- generic, not tied to any content domain.
// ---------------------------------------------------------------------

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isTransient =
        err?.status === 'UNAVAILABLE' ||
        err?.code === 503 ||
        err?.message?.includes('503') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('429') ||
        err?.message?.includes('rate limit');
      if (isTransient && attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, initialDelay * Math.pow(2, attempt)));
        continue;
      }
      break;
    }
  }
  throw lastError;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// ---------------------------------------------------------------------
// Multi-language field extraction -- a JSON field can be authored either
// as a plain string (single language) or as an object keyed by language
// code (multi-language, e.g. { "en": "...", "es": "..." }). These pull out
// the "active" value for the story's primary language plus the full map,
// so a multi-language JSON upload populates every *_i18n field with zero
// translation calls needed.
// ---------------------------------------------------------------------

export function extractI18nText(raw: any, primaryLang: string): { active: string; i18n?: Record<string, string> } {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const i18n: Record<string, string> = {};
    for (const [lang, val] of Object.entries(raw)) {
      if (typeof val === 'string') i18n[lang] = val;
    }
    const active = i18n[primaryLang] || Object.values(i18n)[0] || '';
    return { active, i18n: Object.keys(i18n).length > 0 ? i18n : undefined };
  }
  return { active: typeof raw === 'string' ? raw : '' };
}

// ---------------------------------------------------------------------
// Story JSON normalization -- accepts a handful of common field aliases
// so a hand-written or LLM-authored JSON doesn't need to match the exact
// shape below, same forgiving-parser spirit as the recipe app's
// sanitizeAndNormalizeRecipe().
// ---------------------------------------------------------------------

function resolveLanguageCode(val: any): string {
  if (!val) return 'en';
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'tamil' || s === 'ta') return 'ta';
    if (s === 'english' || s === 'en') return 'en';
    if (s === 'hindi' || s === 'hi') return 'hi';
    if (s === 'malayalam' || s === 'ml') return 'ml';
    if (s === 'telugu' || s === 'te') return 'te';
    if (s === 'kannada' || s === 'kn') return 'kn';
    if (s === 'spanish' || s === 'es') return 'es';
    if (s === 'french' || s === 'fr') return 'fr';
    if (s === 'japanese' || s === 'ja') return 'ja';
    return s.slice(0, 5);
  }
  if (typeof val === 'object') {
    return resolveLanguageCode(val.voiceover || val.voice_over || val.narration || val.primary || val.code);
  }
  return 'en';
}

export function sanitizeAndNormalizeStory(input: any): {
  story_title: string;
  synopsis?: string;
  art_style_prompt: string;
  aspect_ratio?: AspectRatio;
  caption_style_hint?: any;
  characters: Character[];
  scenes: Scene[] | undefined;
  end_card: { voice_line?: string; voice_line_i18n?: Record<string, string>; cta_text?: string; cta_text_i18n?: Record<string, string> };
  primaryLang: string;
  jobLanguages: string[];
} {
  if (!input || typeof input !== 'object') {
    return {
      story_title: 'Untitled Story',
      art_style_prompt: DEFAULT_ART_STYLE,
      characters: [],
      scenes: undefined,
      end_card: {},
      primaryLang: 'en',
      jobLanguages: ['en'],
    };
  }

  const VALID_ASPECT_RATIOS = new Set(['9:16', '1:1', '16:9']);
  const rawAspectRatio =
    input.aspect_ratio ||
    input.video_format?.aspect_ratio ||
    input.videoMetadata?.aspectRatio ||
    input.generationJob?.aspectRatio ||
    input.export?.aspectRatio;
  const aspect_ratio = VALID_ASPECT_RATIOS.has(rawAspectRatio) ? (rawAspectRatio as AspectRatio) : undefined;

  const rawScenes = input.scenes || input.shots || input.beats;

  // Auto-discover all languages present in the JSON (top-level or per-scene)
  const discoveredLanguages = new Set<string>();
  if (Array.isArray(input.languages)) {
    input.languages.forEach((l: any) => discoveredLanguages.add(resolveLanguageCode(l)));
  }
  if (input.language) {
    discoveredLanguages.add(resolveLanguageCode(input.language));
  }
  if (Array.isArray(rawScenes)) {
    for (const s of rawScenes) {
      if (s?.voice_line && typeof s.voice_line === 'object') {
        Object.keys(s.voice_line).forEach((k) => discoveredLanguages.add(resolveLanguageCode(k)));
      }
      if (s?.voice_line_i18n && typeof s.voice_line_i18n === 'object') {
        Object.keys(s.voice_line_i18n).forEach((k) => discoveredLanguages.add(resolveLanguageCode(k)));
      }
    }
  }

  const primaryLang = resolveLanguageCode(input.language) || (discoveredLanguages.size > 0 ? Array.from(discoveredLanguages)[0] : 'en');
  const jobLanguages = Array.from(discoveredLanguages);
  if (!jobLanguages.includes(primaryLang)) {
    jobLanguages.unshift(primaryLang);
  } else {
    const idx = jobLanguages.indexOf(primaryLang);
    if (idx > 0) {
      jobLanguages.splice(idx, 1);
      jobLanguages.unshift(primaryLang);
    }
  }
  if (jobLanguages.length === 0) jobLanguages.push('en');

  const story_title =
    String(input.story_title || input.storyTitle || input.title || input.name || 'Untitled Story').trim() || 'Untitled Story';
  const synopsis =
    typeof input.synopsis === 'string' && input.synopsis.trim()
      ? input.synopsis.trim()
      : typeof input.overallSummary === 'string' && input.overallSummary.trim()
      ? input.overallSummary.trim()
      : typeof input.summary === 'string' && input.summary.trim()
      ? input.summary.trim()
      : undefined;
  const art_style_prompt =
    (typeof (input.art_style_prompt || input.visual_style || input.style_prompt) === 'string' &&
      (input.art_style_prompt || input.visual_style || input.style_prompt).trim()) ||
    (typeof input.visualStyle?.look === 'string' && input.visualStyle.look.trim()) ||
    (typeof input.styleCategory === 'string' && input.styleCategory.trim()) ||
    (typeof input.masterPrompts?.imageGeneration === 'string' && input.masterPrompts.imageGeneration.trim()) ||
    DEFAULT_ART_STYLE;

  let rawCharacters = input.characters || input.cast;
  if (!Array.isArray(rawCharacters)) rawCharacters = [];
  const characters: Character[] = rawCharacters.map((c: any, idx: number) => ({
    id: String(c?.id || c?.role || c?.name || `character-${idx + 1}`).toLowerCase().replace(/\s+/g, '-'),
    name: String(c?.name || c?.role || c?.id || `Character ${idx + 1}`),
    description: String(c?.description || c?.appearance || ''),
    status: c?.reference_image_url ? 'ready' : 'pending',
    reference_image_url: c?.reference_image_url || undefined,
  }));
  const characterIds = new Set(characters.map((c) => c.id));

  let scenes: Scene[] | undefined = undefined;
  if (Array.isArray(rawScenes) && rawScenes.length > 0) {
    scenes = rawScenes.map((s: any, idx: number) => {
      const charsInScene: string[] = Array.isArray(s?.characters_in_scene)
        ? s.characters_in_scene.map((c: any) => String(c).toLowerCase().replace(/\s+/g, '-')).filter((id: string) => characterIds.has(id))
        : [];

      // Flexible caption extraction (checking caption_text, caption, subtitles, etc.)
      const rawCaption =
        (s?.caption_text_i18n && typeof s.caption_text_i18n === 'object' ? s.caption_text_i18n : undefined) ??
        (s?.caption_i18n && typeof s.caption_i18n === 'object' ? s.caption_i18n : undefined) ??
        (s?.subtitles_i18n && typeof s.subtitles_i18n === 'object' ? s.subtitles_i18n : undefined) ??
        s?.caption_text ??
        s?.captionText ??
        s?.caption ??
        s?.captions ??
        s?.subtitle ??
        s?.subtitles ??
        s?.text_overlay ??
        s?.overlay_text;
      const captionResult = extractI18nText(rawCaption, primaryLang);

      // Flexible voice line / narration extraction
      const rawVoiceLine =
        (s?.voice_line_i18n && typeof s.voice_line_i18n === 'object' ? s.voice_line_i18n : undefined) ??
        s?.voice_line ??
        s?.voiceLine ??
        s?.narration ??
        s?.script ??
        s?.dialogue ??
        s?.dialog ??
        s?.speech ??
        s?.audio_line ??
        s?.audio_text ??
        s?.text ??
        s?.line ??
        (captionResult.active || '');
      const voiceLineResult = extractI18nText(rawVoiceLine, primaryLang);

      // Flexible action description extraction
      const rawActionDescription =
        s?.action_description ??
        s?.actionDescription ??
        s?.action ??
        s?.scene_description ??
        s?.sceneDescription ??
        s?.description ??
        s?.title ??
        s?.scene_title ??
        s?.beat;
      const actionDescription = String(rawActionDescription || `Scene ${idx + 1}`).trim();

      // Flexible visual prompt extraction (checking visual_prompt, visualPrompt, image_prompt, visual_description, prompt, etc.)
      const rawVisualPrompt =
        s?.visual_prompt ??
        s?.visualPrompt ??
        s?.image_prompt ??
        s?.imagePrompt ??
        s?.visual_description ??
        s?.visualDescription ??
        s?.image_description ??
        s?.imageDescription ??
        s?.scene_prompt ??
        s?.scenePrompt ??
        s?.frame_prompt ??
        s?.framePrompt ??
        s?.art_prompt ??
        s?.visual ??
        s?.prompt;

      const visualPrompt = String(
        rawVisualPrompt ||
        rawActionDescription ||
        captionResult.active ||
        voiceLineResult.active ||
        `${story_title}, scene ${idx + 1}`
      ).trim();

      // Combine text for sound effects extraction -- critically including caption!
      const textForSoundDetection = [
        captionResult.active,
        voiceLineResult.active,
        actionDescription,
        visualPrompt,
      ].filter(Boolean).join(' ');

      const soundEffects = resolveSoundEffects(s, textForSoundDetection);

      // A JSON's own animation_style/overlay_effect (an exact enum value)
      // always wins; these free-text fields are only consulted as a
      // fallback hint when it's absent -- see resolveAnimationStyle/
      // resolveOverlayEffect above for the full precedence.
      const animationHintText =
        typeof s?.photo_animation === 'string'
          ? s.photo_animation
          : s?.photo_animation && typeof s.photo_animation === 'object'
          ? [s.photo_animation.camera, s.photo_animation.movement, s.photo_animation.duration_feel].filter(Boolean).join(' ')
          : undefined;
      const overlayHintText = typeof s?.graphics_prompt === 'string' ? s.graphics_prompt : undefined;

      return {
        id: s?.id || `scene-${idx + 1}-${Date.now()}`,
        index: typeof s?.index === 'number' ? s.index : idx,
        scene_number: typeof s?.scene_number === 'number' ? s.scene_number : idx + 1,
        beat: s?.beat || undefined,
        characters_in_scene: charsInScene,
        action_description: actionDescription,
        visual_prompt: visualPrompt,
        image_url: typeof s?.image_url === 'string' ? s.image_url : undefined,
        voice_line: voiceLineResult.active,
        voice_line_i18n: voiceLineResult.i18n,
        caption_text: captionResult.active || undefined,
        caption_text_i18n: captionResult.i18n,
        duration:
          typeof s?.duration_seconds === 'number' && s.duration_seconds > 0
            ? s.duration_seconds
            : typeof s?.duration === 'number' && s.duration > 0
            ? s.duration
            : 4,
        animation_style: resolveAnimationStyle(s?.animation_style, animationHintText),
        overlay_effect: resolveOverlayEffect(s?.overlay_effect, overlayHintText),
        sound_effects: soundEffects,
        reference_previous_scene: s?.reference_previous_scene !== undefined ? Boolean(s.reference_previous_scene) : false,
        voice_name: s?.voice_name || undefined,
        status: 'pending',
        include_in_final: s?.include_in_final !== undefined ? Boolean(s.include_in_final) : true,
        chat_history: [],
      } as Scene;
    });
  }

  const endCardVoiceResult = extractI18nText(input.end_card?.voice_line_i18n ?? input.end_card?.voice_line ?? input.outro?.voice_line, primaryLang);
  const endCardCtaResult = extractI18nText(input.end_card?.cta_text_i18n ?? input.end_card?.cta_text ?? input.cta_text, primaryLang);
  const end_card = {
    voice_line: endCardVoiceResult.active || undefined,
    voice_line_i18n: endCardVoiceResult.i18n,
    cta_text: endCardCtaResult.active || undefined,
    cta_text_i18n: endCardCtaResult.i18n,
  };

  return { story_title, synopsis, art_style_prompt, aspect_ratio, caption_style_hint: input.caption_style, characters, scenes, end_card, primaryLang, jobLanguages };
}

const DEFAULT_ART_STYLE =
  'Warm painterly storybook illustration, soft directional light, rich but gentle color palette, clean linework, consistent character design across every scene, cinematic wide framing, no text or lettering rendered in the image.';

const CONTINUITY_DIRECTIVE = `
VISUAL CONSISTENCY DIRECTIVE:
1. ART STYLE: Every scene in this story must render in exactly the same illustration medium, linework, and palette -- described by the story's art style below. Never switch style, medium, or rendering technique between scenes.
2. CHARACTER IDENTITY: Any character appearing in a scene must match their established design exactly -- same face, hair, build, and outfit as their reference sheet. Only their pose and expression should change.
3. SETTING CONTINUITY: When a scene shares a location with a nearby scene, keep the environment, lighting direction, and color palette consistent.
4. NO TEXT IN FRAME: Never render any words, captions, subtitles, or lettering inside the image itself -- narration is added separately.
`;

// ---------------------------------------------------------------------
// Storyboard expansion -- only called when the uploaded JSON didn't
// already supply a full scenes[] array.
// ---------------------------------------------------------------------

export async function expandStoryboardFromSynopsis(
  storyTitle: string,
  synopsis: string,
  artStylePrompt: string,
  characters: Character[],
  apiKey?: string | null
): Promise<Scene[]> {
  const ai = getGenAI(apiKey);
  if (!ai) return fallbackStoryboard(storyTitle, synopsis, characters);

  const castList = characters.map((c) => `- ${c.name} (id: "${c.id}"): ${c.description}`).join('\n') || '(no named cast supplied)';

  const prompt = `You are a professional storyboard director working from a short synopsis.
Break this story into an ordered sequence of scenes for a narrated illustrated video.

Story title: "${storyTitle}"
Synopsis: "${synopsis}"
Art style (every scene must inherit this exactly): "${artStylePrompt}"

Cast:
${castList}

DIRECTING RULES:
1. One scene per narrative beat (a change in action, location, or emotional turn) -- not per sentence. Aim for 6-12 scenes for a short story.
2. Every scene's visual_prompt must describe a single clear moment: setting, who's present, what they're doing, camera framing. It must inherit the art style above.
3. Every scene lists which cast member ids (from the list above) actually appear in it, in characters_in_scene.
4. voice_line and visual_prompt must depict the exact same instant -- what's narrated is what's shown.
5. caption_text may shorten voice_line for on-screen legibility without changing its meaning; omit it if voice_line is already short.
6. Never describe any on-image text, subtitles, or lettering.
7. If (and only if) a scene's setting genuinely calls for it, suggest one overlay_effect from this exact list: "none", "sparkles", "floating_dust", "snow", "rain", "embers", "light_rays" (e.g. "rain" for a storm, "embers" for a hearth or forge, "snow" for a blizzard). Use "none" for most scenes -- this is a rare accent, not a default.
8. List any ambient/event sound effects this scene's action or setting would genuinely have, in sound_effect_cues, using ONLY these exact values: "thunder", "rain", "fire", "wind", "water_flow", "waves", "footsteps", "door_creak", "crowd", "birds", "heartbeat", "impact". Infer from the action even when the word itself isn't used (e.g. someone creeping down a hallway implies "footsteps"; a body hitting the floor implies "impact"). Leave it an empty array for a quiet scene -- most scenes should have 0-1 entries, not a soundscape.

Return ONLY a JSON array with this schema:
[
  {
    "scene_number": number,
    "beat": string,
    "characters_in_scene": string[],
    "action_description": string,
    "visual_prompt": string,
    "voice_line": string,
    "caption_text": string or null,
    "overlay_effect": string,
    "sound_effect_cues": string[]
  }
]`;

  try {
    const text = await callWithRetry(async () => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json', temperature: 0.4 },
        });
        return response.text?.trim();
      } catch {
        const fallback = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: prompt,
          config: { responseMimeType: 'application/json', temperature: 0.4 },
        });
        return fallback.text?.trim();
      }
    });
    if (!text) throw new Error('Empty response from storyboard planner');
    const raw = JSON.parse(text) as any[];
    return raw.map((s, idx) => ({
      id: `scene-${idx + 1}-${Date.now()}`,
      index: idx,
      scene_number: s.scene_number ?? idx + 1,
      beat: s.beat || undefined,
      characters_in_scene: Array.isArray(s.characters_in_scene) ? s.characters_in_scene : [],
      action_description: s.action_description || `Scene ${idx + 1}`,
      visual_prompt: s.visual_prompt,
      voice_line: s.voice_line,
      caption_text: s.caption_text || undefined,
      duration: 4,
      animation_style: randomAnimationStyle(),
      overlay_effect: resolveOverlayEffect(s.overlay_effect),
      sound_effects: buildSoundEffects(
        Array.isArray(s.sound_effect_cues) ? s.sound_effect_cues.filter((c: any) => SOUND_EFFECT_CATALOG.some((d) => d.id === c)) : []
      ),
      reference_previous_scene: false,
      status: 'pending',
      include_in_final: true,
      chat_history: [],
    }));
  } catch {
    return fallbackStoryboard(storyTitle, synopsis, characters);
  }
}

function fallbackStoryboard(storyTitle: string, synopsis: string, characters: Character[]): Scene[] {
  const beats = ['setup', 'rising action', 'turning point', 'resolution'];
  return beats.map((beat, idx) => {
    const voice_line = synopsis ? `${synopsis}` : `This is the ${beat} of ${storyTitle}.`;
    return {
      id: `scene-${idx + 1}-${Date.now()}`,
      index: idx,
      scene_number: idx + 1,
      beat,
      characters_in_scene: characters.slice(0, 1).map((c) => c.id),
      action_description: `${beat}: ${storyTitle}`,
      visual_prompt: `${synopsis || storyTitle}. ${beat} of the story.`,
      voice_line,
      duration: 4,
      animation_style: randomAnimationStyle(),
      overlay_effect: 'none' as const,
      sound_effects: buildSoundEffects(detectSoundEffectCues(voice_line)),
      reference_previous_scene: false,
      status: 'pending' as const,
      include_in_final: true,
      chat_history: [],
    };
  });
}

// ---------------------------------------------------------------------
// Conversational prompt refinement -- one scene's visual_prompt, chatted
// into shape.
// ---------------------------------------------------------------------

export async function chatRefineScenePrompt(
  conversation: ChatMessage[],
  currentPrompt: string,
  userInstruction: string,
  apiKey?: string | null
): Promise<{ refinedPrompt: string; replyMessage: string }> {
  const ai = getGenAI(apiKey);
  if (!ai) {
    return {
      refinedPrompt: `${currentPrompt}. Note: ${userInstruction}.`,
      replyMessage: `Noted your direction: "${userInstruction}". Ready to generate whenever you'd like!`,
    };
  }

  const prompt = `You are a storyboard visual director assistant helping refine one scene's image prompt.

Original visual prompt:
"${currentPrompt}"

Director's note:
"${userInstruction}"

Chat history:
${conversation.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

Rules:
1. Keep any established character/setting descriptions intact unless the note explicitly asks to change them.
2. Incorporate the director's note precisely (camera angle, lighting, mood, composition, etc).
3. Never introduce on-image text, subtitles, or lettering.
4. Return JSON: { "refinedPrompt": string, "replyMessage": string } -- replyMessage is a short, concrete note on what changed.`;

  try {
    const text = await callWithRetry(async () => {
      try {
        const response = await ai.models.generateContent({ model: 'gemini-3.7-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
        return response.text?.trim();
      } catch {
        const fb = await ai.models.generateContent({ model: 'gemini-flash-latest', contents: prompt, config: { responseMimeType: 'application/json' } });
        return fb.text?.trim();
      }
    });
    if (!text) throw new Error('Empty response');
    const result = JSON.parse(text);
    return {
      refinedPrompt: result.refinedPrompt || currentPrompt,
      replyMessage: result.replyMessage || "I've refined the shot accordingly.",
    };
  } catch {
    return { refinedPrompt: `${currentPrompt} (Updated: ${userInstruction})`, replyMessage: `Applied your note: ${userInstruction}` };
  }
}

// ---------------------------------------------------------------------
// Language translation -- on-demand, one line at a time, cached onto the
// scene/card afterward by the caller so switching back to a language
// already translated is instant and never re-billed.
// ---------------------------------------------------------------------

const NARRATION_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  ja: 'Japanese',
};

/**
 * Translates one line of narration from any supported language into the
 * natural SPOKEN register of another -- not the formal/written register a
 * literal translation defaults to. Returns the original text unchanged if
 * either code is unrecognized, source === target, no API key is
 * available, or translation fails -- a missing key or a bad call should
 * never block the story.
 */
export async function translateVoiceLineToLanguage(text: string, sourceLanguageCode: string, targetLanguageCode: string, apiKey?: string | null): Promise<string> {
  const sourceName = NARRATION_LANGUAGE_NAMES[sourceLanguageCode];
  const targetName = NARRATION_LANGUAGE_NAMES[targetLanguageCode];
  if (!sourceName || !targetName || sourceLanguageCode === targetLanguageCode || !text.trim()) return text;

  const ai = getGenAI(apiKey);
  if (!ai) return text;

  const prompt = `You are an expert narration translator and dubbing director.

Translate and adapt this narration line from ${sourceName} into natural, everyday SPOKEN ${targetName} -- the way a warm, engaging storyteller would actually SAY it aloud. This is NOT a request for formal or literary ${targetName}: avoid textbook grammar, avoid stiff literal word-for-word translation. Use common, natural spoken rhythm.

Original line (${sourceName}):
"${text}"

Requirements:
1. Return ONLY the spoken ${targetName} line, in ${targetName} script. No commentary, no quotation marks, no transliteration.
2. Keep it natural, warm, and matching the exact meaning of the original -- don't add or drop information.`;

  try {
    const translated = await callWithRetry(async () => {
      try {
        const response = await ai.models.generateContent({ model: 'gemini-3.7-flash', contents: prompt });
        return response.text?.trim();
      } catch {
        const fb = await ai.models.generateContent({ model: 'gemini-flash-latest', contents: prompt });
        return fb.text?.trim();
      }
    });
    return translated || text;
  } catch {
    return text;
  }
}

// ---------------------------------------------------------------------
// Image generation -- shared by character sheets and scenes. Both go
// through the same model fallback chain; the only difference is what
// reference image(s) get attached for conditioning.
// ---------------------------------------------------------------------

interface GenerateImageResult {
  imageUrl: string;
  isAiGenerated: boolean;
  modelUsed?: string;
  lastError?: string;
}

function extractBase64(dataUrl?: string): { mimeType: string; data: string } | null {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  return match ? { mimeType: match[1], data: match[2] } : null;
}

async function generateImageWithFallbackChain(
  basePrompt: string,
  aspectRatio: AspectRatio,
  referenceImageUrls: (string | undefined)[],
  ai: GoogleGenAI | null
): Promise<GenerateImageResult> {
  const validRatio: '9:16' | '1:1' | '16:9' = aspectRatio === '9:16' ? '9:16' : aspectRatio === '16:9' ? '16:9' : '1:1';
  const refs = referenceImageUrls.map(extractBase64).filter((r): r is { mimeType: string; data: string } => Boolean(r)).slice(0, 3);

  // Clean, focused visual prompt optimized for Gemini image models
  const enhancedPrompt = `${basePrompt}. Clean illustration, highly detailed, cinematic lighting, beautifully rendered, no text or lettering in the image.`;

  let lastCaughtError: string | undefined = ai ? undefined : 'AI image generation isn\'t configured on this server yet.';

  if (ai) {
    // 1. Primary: gemini-3.1-flash-image (High-Quality Image Generation)
    try {
      const parts: any[] = refs.map((r) => ({ inlineData: { mimeType: r.mimeType, data: r.data } }));
      parts.push({ text: refs.length > 0 ? `${enhancedPrompt} Maintain consistency with the reference image.` : enhancedPrompt });

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: { parts },
          config: { imageConfig: { aspectRatio: validRatio } },
        }),
        25000,
        'gemini-3.1-flash-image'
      );
      const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
      if (part?.inlineData?.data) {
        return { imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`, isAiGenerated: true, modelUsed: 'gemini-3.1-flash-image' };
      }
    } catch (err: any) {
      lastCaughtError = parseGeminiImageError(err?.message || 'gemini-3.1-flash-image failed');
    }

    // 2. Secondary: gemini-3.1-flash-lite-image (Fast General Image Generation)
    try {
      const parts: any[] = refs.map((r) => ({ inlineData: { mimeType: r.mimeType, data: r.data } }));
      parts.push({ text: enhancedPrompt });

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: { parts },
          config: { imageConfig: { aspectRatio: validRatio } },
        }),
        25000,
        'gemini-3.1-flash-lite-image'
      );
      const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
      if (part?.inlineData?.data) {
        return { imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`, isAiGenerated: true, modelUsed: 'gemini-3.1-flash-lite-image' };
      }
    } catch (err: any) {
      lastCaughtError = parseGeminiImageError(err?.message || lastCaughtError || 'gemini-3.1-flash-lite-image failed');
    }

    // 3. Tertiary: gemini-3-pro-image (High fidelity image generation)
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3-pro-image',
          contents: enhancedPrompt,
          config: { imageConfig: { aspectRatio: validRatio } },
        }),
        25000,
        'gemini-3-pro-image'
      );
      const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
      if (part?.inlineData?.data) {
        return { imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`, isAiGenerated: true, modelUsed: 'gemini-3-pro-image' };
      }
    } catch (err: any) {
      lastCaughtError = parseGeminiImageError(err?.message || lastCaughtError || 'gemini-3-pro-image failed');
    }
  }

  // 4. Procedural storyboard placeholder if AI image models fail or have quota limits
  return { imageUrl: generatePlaceholderSvg(basePrompt, aspectRatio), isAiGenerated: false, modelUsed: 'procedural-placeholder', lastError: lastCaughtError };
}

function parseGeminiImageError(rawError: string): string {
  if (rawError.includes('free_tier') || rawError.includes('limit: 0') || rawError.includes('RESOURCE_EXHAUSTED')) {
    return 'Image generation requires a Gemini API key with billing enabled (Google Free Tier has an image quota limit of 0). Generated a stylized storyboard placeholder.';
  }
  try {
    const parsed = JSON.parse(rawError);
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    // raw string
  }
  return rawError;
}

export async function generateCharacterSheet(character: Character, artStylePrompt: string, aspectRatio: AspectRatio, apiKey?: string | null): Promise<GenerateImageResult> {
  const ai = getGenAI(apiKey);
  const prompt = `Character reference sheet. ${character.name}: ${character.description}. Neutral standing pose, plain uncluttered background, clear full-body view, front-facing. Style: ${artStylePrompt}`;
  return generateImageWithFallbackChain(prompt, aspectRatio, [], ai);
}

export async function generateSceneImage(
  scene: Scene,
  artStylePrompt: string,
  aspectRatio: AspectRatio,
  characterReferenceUrls: string[],
  continuityReferenceUrl: string | undefined,
  apiKey?: string | null
): Promise<GenerateImageResult> {
  const ai = getGenAI(apiKey);
  const prompt = `${scene.visual_prompt}. Style: ${artStylePrompt}. Depicts exactly this narrated moment (for understanding the action only -- never render this sentence as text): "${scene.voice_line}".`;
  const refs = [scene.reference_image_url, ...characterReferenceUrls, continuityReferenceUrl];
  return generateImageWithFallbackChain(prompt, aspectRatio, refs, ai);
}

// ---------------------------------------------------------------------
// Procedural SVG placeholder -- last-resort fallback so a flaky image
// call never blocks the whole story.
// ---------------------------------------------------------------------

export function generatePlaceholderSvg(prompt: string, aspectRatio: AspectRatio): string {
  const isVertical = aspectRatio === '9:16';
  const width = isVertical ? 768 : aspectRatio === '1:1' ? 1024 : 1360;
  const height = isVertical ? 1360 : aspectRatio === '1:1' ? 1024 : 768;
  const summary = prompt.split(/\s+/).slice(0, 24).join(' ');

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1f1a2c"/>
        <stop offset="50%" stop-color="#14111d"/>
        <stop offset="100%" stop-color="#0d0a14"/>
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#d9a042"/>
        <stop offset="100%" stop-color="#f5c87a"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    
    <!-- Film frame border -->
    <rect x="${width * 0.08}" y="${height * 0.08}" width="${width * 0.84}" height="${height * 0.84}" rx="16" fill="none" stroke="#2d263d" stroke-width="2"/>
    <rect x="${width * 0.1}" y="${height * 0.1}" width="${width * 0.8}" height="${height * 0.8}" rx="12" fill="#171322" stroke="#3b3250" stroke-width="1.5" stroke-dasharray="6 4"/>

    <!-- Storyboard Icon -->
    <g transform="translate(${width / 2 - 24}, ${height * 0.25}) scale(1.5)" fill="none" stroke="#d9a042" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="2" width="28" height="28" rx="4" fill="#261e33"/>
      <path d="M7 2v28M25 2v28M2 9h28M2 23h28"/>
    </g>

    <text x="${width / 2}" y="${height * 0.38}" text-anchor="middle" fill="url(#gold)" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="20" letter-spacing="3">STORYBOARD SCENE</text>
    <text x="${width / 2}" y="${height * 0.42}" text-anchor="middle" fill="#8e85a3" font-family="system-ui, -apple-system, sans-serif" font-size="14">Visual Prompt Preview</text>

    <!-- Scene Description block -->
    <foreignObject x="${width * 0.15}" y="${height * 0.46}" width="${width * 0.7}" height="${height * 0.35}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="color:#d4cee6;font-family:system-ui, -apple-system, sans-serif;font-size:16px;text-align:center;line-height:1.6;padding:12px 16px;background:rgba(25,20,34,0.7);border-radius:10px;border:1px solid #332b45;">
        ${escapeXml(summary)}...
      </div>
    </foreignObject>

    <text x="${width / 2}" y="${height * 0.86}" text-anchor="middle" fill="#6c647e" font-family="system-ui, -apple-system, sans-serif" font-size="12">Requires billing-enabled Gemini API key for live AI render</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}

// ---------------------------------------------------------------------
// AI Story Title Generation
// ---------------------------------------------------------------------

export interface GeneratedTitleOption {
  title: string;
  style: string;
  rationale: string;
}

export async function generateAiStoryTitles(
  synopsis: string,
  sceneSnippets: string[] = [],
  currentTitle?: string,
  artStyle?: string,
  apiKey?: string | null
): Promise<{ recommended: string; options: GeneratedTitleOption[] }> {
  const ai = getGenAI(apiKey);

  const fallbackTitles: GeneratedTitleOption[] = [
    { title: currentTitle && currentTitle !== 'Untitled Story' ? currentTitle : 'Echoes of the Unknown', style: 'Cinematic', rationale: 'Captures dramatic tone and visual atmosphere.' },
    { title: 'The Hidden Truth', style: 'Intriguing', rationale: 'Creates immediate curiosity and tension.' },
    { title: 'Beyond the Veil', style: 'Poetic', rationale: 'Evocative and memorable title for audiences.' },
    { title: 'The Turning Point', style: 'Short & Punchy', rationale: 'Sharp, memorable, and high engagement.' },
  ];

  if (!ai) {
    return { recommended: fallbackTitles[0].title, options: fallbackTitles };
  }

  const contextText = [
    currentTitle ? `Current Title: "${currentTitle}"` : '',
    synopsis ? `Story Synopsis: "${synopsis}"` : '',
    artStyle ? `Art Style: "${artStyle}"` : '',
    sceneSnippets.length > 0 ? `Key Scenes/Actions:\n- ${sceneSnippets.slice(0, 6).join('\n- ')}` : '',
  ].filter(Boolean).join('\n\n');

  const prompt = `You are an expert Hollywood and YouTube title director. Generate 5 creative, captivating, and high-impact title choices for this visual story.

Context:
${contextText}

Guidelines:
1. Provide titles across diverse editorial tones: "Cinematic Drama", "Viral / High CTR", "Intriguing Mystery", "Atmospheric & Poetic", and "Short & Punchy".
2. Keep titles under 60 characters, captivating without being clickbait nonsense.
3. Include a 1-sentence rationale explaining why it works.
4. Return pure JSON adhering strictly to:
{
  "recommended": "The single best title overall",
  "options": [
    { "title": "...", "style": "...", "rationale": "..." }
  ]
}`;

  try {
    const text = await callWithRetry(async () => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        return response.text?.trim();
      } catch {
        const fb = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        return fb.text?.trim();
      }
    });

    if (!text) throw new Error('Empty response from title generator');
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.options) && parsed.options.length > 0) {
      return {
        recommended: parsed.recommended || parsed.options[0].title,
        options: parsed.options,
      };
    }
  } catch (err) {
    console.warn('[Titles] Gemini title generation failed, falling back:', err);
  }

  return { recommended: fallbackTitles[0].title, options: fallbackTitles };
}

// ---------------------------------------------------------------------
// Character Prompt Refinement
// ---------------------------------------------------------------------

export async function refineCharacterPrompt(
  characterName: string,
  currentDescription: string,
  userInstruction: string,
  artStylePrompt?: string,
  apiKey?: string | null
): Promise<{ refinedDescription: string; fullPromptPreview: string; replyMessage: string }> {
  const ai = getGenAI(apiKey);

  const style = artStylePrompt || 'cinematic digital art';

  if (!ai) {
    const updated = `${currentDescription}. ${userInstruction}`.trim();
    return {
      refinedDescription: updated,
      fullPromptPreview: `Character reference sheet. ${characterName}: ${updated}. Neutral standing pose, plain uncluttered background, clear full-body view, front-facing. Style: ${style}`,
      replyMessage: `Updated description with "${userInstruction}".`,
    };
  }

  const prompt = `You are a character designer and prompt engineer assisting a creator in refining a character's appearance description for an image model reference sheet.

Character Name: "${characterName}"
Current Description: "${currentDescription}"
Creator's Direction / Note: "${userInstruction}"
Overall Story Art Style: "${style}"

Instructions:
1. Update and enrich the character's visual description based on the creator's note (hair, facial features, distinctive clothing, color palette, age, silhouette).
2. Keep the description focused on visual appearance and physical features (avoid abstract plot summaries).
3. Do not include commands like "generate this" or camera settings; describe the character directly.
4. Provide a 1-sentence friendly confirmation of what changed.

Return JSON format:
{
  "refinedDescription": "Updated visual description of the character",
  "replyMessage": "Brief confirmation note of what visual traits were added/adjusted"
}`;

  try {
    const text = await callWithRetry(async () => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        return response.text?.trim();
      } catch {
        const fb = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        return fb.text?.trim();
      }
    });

    if (text) {
      const parsed = JSON.parse(text);
      const refined = parsed.refinedDescription || currentDescription;
      return {
        refinedDescription: refined,
        fullPromptPreview: `Character reference sheet. ${characterName}: ${refined}. Neutral standing pose, plain uncluttered background, clear full-body view, front-facing. Style: ${style}`,
        replyMessage: parsed.replyMessage || `Updated ${characterName}'s appearance sheet prompt.`,
      };
    }
  } catch (err) {
    console.warn('[CharacterRefine] Gemini refine failed, falling back:', err);
  }

  const fallbackDesc = `${currentDescription}. ${userInstruction}`.trim();
  return {
    refinedDescription: fallbackDesc,
    fullPromptPreview: `Character reference sheet. ${characterName}: ${fallbackDesc}. Neutral standing pose, plain uncluttered background, clear full-body view, front-facing. Style: ${style}`,
    replyMessage: `Added your note: "${userInstruction}".`,
  };
}
