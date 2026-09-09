import { ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AuthScreen, AuthUser } from './components/AuthScreen';
import { CastPanel } from './components/CastPanel';
import { ConfirmModal } from './components/ConfirmModal';
import { Header } from './components/Header';
import { ImportedScene, ImportFieldSelection, ImportTranslationModal } from './components/ImportTranslationModal';
import { NarrationSection } from './components/NarrationSection';
import { PipelineTracker, StageId } from './components/PipelineTracker';
import { ScenesSection } from './components/ScenesSection';
import { SlideshowPlayer } from './components/SlideshowPlayer';
import { StoryUpload } from './components/StoryUpload';
import { StudioSettingsModal } from './components/StudioSettingsModal';
import { ThumbnailStudio } from './components/ThumbnailStudio';
import { ToastNotifications } from './components/ToastNotifications';
import { DEFAULT_CAPTION_CONFIG, DEFAULT_WATERMARK_CONFIG } from './data/captionPresets';
import { postJson, safeFetchJson } from './utils/apiClient';
import { measureAudioDuration } from './utils/audioDuration';
import { detectSoundEffectCues } from './utils/sfxDetection';
import { synthesizeSoundEffect } from './utils/sfxSynth';
import { randomAnimationStyle } from './data/presets';
import { clearStoredStory, downloadStoryAsJson, loadStoryFromLocalStorage, saveStoryToLocalStorage } from './utils/storyStorage';
import { AspectRatio, Character, Scene, SceneSoundEffect, SoundEffectCue, Story, ThumbnailConfig, ToastAlert } from './types';
import { VoicePreviewModal } from './components/VoicePreviewModal';
import { TitleGeneratorModal } from './components/TitleGeneratorModal';
import { getAllAvailableVoices } from './utils/voiceManager';
import { initMetaPixel, trackPageView } from './utils/metaPixel';
import { ApiUsageReconciliationModal } from './components/ApiUsageReconciliationModal';
import { RechargeModal } from './components/RechargeModal';
import { fetchCreditBalance } from './utils/creditManager';

let toastSeq = 0;

const STAGE_ORDER: StageId[] = ['cast', 'scenes', 'narration', 'thumbnail', 'play'];
const STAGE_LABELS: Record<StageId, string> = { cast: 'Cast', scenes: 'Scenes', narration: 'Narration', thumbnail: 'Thumbnail', play: 'Playback' };

// Fills in defaults for any field that didn't exist yet the last time this
// story was exported -- so resuming a JSON saved by an earlier version of
// Storyframe (before captions/watermark/mood/i18n/per-scene animation
// existed) never crashes on a missing property, it just starts those
// features at their defaults. Each scene gets its own random animation
// pick here (not one shared default) for the same reason a fresh story
function normalizeLanguageCode(val: any): string {
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
    return normalizeLanguageCode(val.voiceover || val.voice_over || val.narration || val.primary || val.code || val.language);
  }
  return 'en';
}

// does -- so an old story doesn't suddenly play as a wall of identical zooms.
function withStoryDefaults(story: Story): Story {
  const resolvedLang = normalizeLanguageCode(story?.language);
  const discoveredLanguages = new Set<string>();
  if (Array.isArray(story?.available_languages)) {
    story.available_languages.forEach((l) => discoveredLanguages.add(normalizeLanguageCode(l)));
  }
  discoveredLanguages.add(resolvedLang);

  // Pre-scan scenes to discover any languages present in multilingual voice lines or captions
  if (Array.isArray(story?.scenes)) {
    for (const s of story.scenes as any[]) {
      if (s?.voice_line && typeof s.voice_line === 'object' && !Array.isArray(s.voice_line)) {
        Object.keys(s.voice_line).forEach((k) => discoveredLanguages.add(normalizeLanguageCode(k)));
      }
      if (s?.voice_line_i18n && typeof s.voice_line_i18n === 'object') {
        Object.keys(s.voice_line_i18n).forEach((k) => discoveredLanguages.add(normalizeLanguageCode(k)));
      }
    }
  }

  const available_languages = Array.from(discoveredLanguages);

  return {
    mood: 'natural',
    music_track: 'none',
    music_volume: 0.18,
    ...story,
    language: resolvedLang,
    available_languages,
    voice_name: story?.voice_name || 'narrator',
    caption_config: { ...DEFAULT_CAPTION_CONFIG, ...story.caption_config },
    watermark_config: { ...DEFAULT_WATERMARK_CONFIG, ...story.watermark_config },
    thumbnail: { show_shadow_scrim: true, font_size_scale: 1, ...story.thumbnail },
    scenes: (story.scenes || []).map((s: any, idx: number) => {
      const visual_prompt = String(
        s.visual_prompt ||
        s.visualPrompt ||
        s.image_prompt ||
        s.imagePrompt ||
        s.visual_description ||
        s.visualDescription ||
        s.image_description ||
        s.scene_prompt ||
        s.frame_prompt ||
        s.art_prompt ||
        s.visual ||
        s.prompt ||
        s.action_description ||
        s.action ||
        s.description ||
        `${story.story_title || 'Story'}, scene ${idx + 1}`
      ).trim();

      const rawCaption =
        (s?.caption_text_i18n && typeof s.caption_text_i18n === 'object' ? s.caption_text_i18n : undefined) ??
        s.caption_text ??
        s.captionText ??
        s.caption ??
        s.captions ??
        s.subtitle ??
        s.subtitles ??
        s.text_overlay;

      let caption_text = '';
      let caption_text_i18n: Record<string, string> | undefined = s.caption_text_i18n;
      if (rawCaption && typeof rawCaption === 'object' && !Array.isArray(rawCaption)) {
        caption_text_i18n = { ...(caption_text_i18n || {}), ...rawCaption };
        caption_text = String(caption_text_i18n[resolvedLang] || Object.values(rawCaption)[0] || '');
      } else if (rawCaption !== undefined && rawCaption !== null) {
        caption_text = String(rawCaption);
      }

      const action_description = String(
        s.action_description ||
        s.actionDescription ||
        s.action ||
        s.description ||
        s.title ||
        `Scene ${idx + 1}`
      ).trim();

      const rawVoiceLine =
        (s?.voice_line_i18n && typeof s.voice_line_i18n === 'object' ? s.voice_line_i18n : undefined) ??
        s.voice_line ??
        s.voiceLine ??
        s.narration ??
        s.script ??
        s.dialogue ??
        s.dialog ??
        s.text ??
        caption_text;

      let voice_line = '';
      let voice_line_i18n: Record<string, string> | undefined = s.voice_line_i18n;
      if (rawVoiceLine && typeof rawVoiceLine === 'object' && !Array.isArray(rawVoiceLine)) {
        voice_line_i18n = { ...(voice_line_i18n || {}), ...rawVoiceLine };
        voice_line = String(voice_line_i18n[resolvedLang] || Object.values(rawVoiceLine)[0] || '');
      } else {
        voice_line = String(rawVoiceLine ?? '');
      }

      if (voice_line_i18n && !voice_line_i18n[resolvedLang] && voice_line) {
        voice_line_i18n[resolvedLang] = voice_line;
      }
      if (caption_text_i18n && !caption_text_i18n[resolvedLang] && caption_text) {
        caption_text_i18n[resolvedLang] = caption_text;
      }

      // Extract sounds from caption, voice_line, action, visual_prompt
      const textToScan = [caption_text, voice_line, action_description, visual_prompt].filter(Boolean).join(' ');
      const detected = detectSoundEffectCues(textToScan);
      const existingSfx: SceneSoundEffect[] = Array.isArray(s.sound_effects) ? s.sound_effects : [];
      const existingCues = new Set(existingSfx.map((x) => x.cue));
      const mergedSfx = [...existingSfx];
      for (const cue of detected) {
        if (!existingCues.has(cue)) {
          mergedSfx.push({
            id: `sfx-${cue}-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
            cue,
            volume: 0.85,
            status: 'pending',
          });
          existingCues.add(cue);
        }
      }

      return {
        animation_style: randomAnimationStyle(),
        overlay_effect: 'none',
        reference_previous_scene: false,
        ...s,
        include_in_final: s.include_in_final !== false,
        visual_prompt,
        action_description,
        voice_line,
        voice_line_i18n,
        caption_text: caption_text || undefined,
        caption_text_i18n,
        sound_effects: mergedSfx,
      };
    }),
  };
}

export default function App() {
  const [story, setStory] = useState<Story | null>(null);
  const [stage, setStage] = useState<StageId>('cast');
  const [isSubmittingStoryboard, setIsSubmittingStoryboard] = useState(false);
  const [isStudioSettingsOpen, setIsStudioSettingsOpen] = useState(false);
  const [isVoiceStudioOpen, setIsVoiceStudioOpen] = useState(false);
  const [isImportTranslationOpen, setIsImportTranslationOpen] = useState(false);
  const [isTitleGeneratorOpen, setIsTitleGeneratorOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const [isCastBusy, setIsCastBusy] = useState(false);
  const [isScenesBusy, setIsScenesBusy] = useState(false);
  const [isNarrationBusy, setIsNarrationBusy] = useState(false);
  const [isVoiceChanging, setIsVoiceChanging] = useState(false);
  const [narrationGeneratingIndex, setNarrationGeneratingIndex] = useState<number | null>(null);
  const [isEndCardNarrationGenerating, setIsEndCardNarrationGenerating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmVariant?: 'danger' | 'warning' | 'primary';
    showExportButton?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const [credits, setCredits] = useState<number>(10);
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [rechargeReason, setRechargeReason] = useState('');
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);

  const refreshCredits = async () => {
    const data = await fetchCreditBalance();
    if (data && typeof data.credits === 'number') {
      setCredits(data.credits);
    }
  };

  // Resolve the session cookie (if any) to a real account on first load --
  // this is the gate: no account yet means AuthScreen renders instead of
  // the studio below.
  useEffect(() => {
    (async () => {
      const res = await safeFetchJson<{ user: AuthUser }>('/api/auth/me');
      if (res.ok && res.data?.user) {
        setAuthUser(res.data.user);
        setCredits(res.data.user.credits);
      }
      setIsCheckingAuth(false);
    })();
  }, []);

  useEffect(() => {
    if (authUser) refreshCredits();
  }, [authUser]);

  async function handleLogout() {
    await postJson('/api/auth/logout', {});
    setAuthUser(null);
    setStory(null);
  }

  const checkCreditsOrPrompt = (featureName: string, cost = 1, onSuccess?: () => void): boolean => {
    if (credits >= cost) {
      return true;
    }

    setRechargeReason(`Using ${featureName} requires ${cost} credit(s), but your current balance is ${credits} Credits. Recharge ₹100 for 50 credits to continue creating.`);
    setIsRechargeOpen(true);
    return false;
  };

  // Async handlers below fire well after the render that created them --
  // this ref keeps them reading the true latest story instead of a stale
  // closure over whatever `story` was when the handler was defined.
  const storyRef = useRef<Story | null>(null);
  useEffect(() => {
    storyRef.current = story;
    if (story) saveStoryToLocalStorage(story);
  }, [story]);

  useEffect(() => {
    initMetaPixel();
    trackPageView();
  }, []);

  useEffect(() => {
    const restored = loadStoryFromLocalStorage();
    if (restored) {
      setStory(withStoryDefaults(restored));
      setStage(restored.characters.length > 0 && restored.characters.some((c) => c.status !== 'ready') ? 'cast' : 'scenes');
    }
  }, []);

  // One-time backfill for stories that already have narration clips
  // generated from before audio_duration was measured at all (or from an
  // imported/older JSON) -- without a real duration, playback fell back to
  // a short placeholder and cut narration off mid-sentence. Keyed on
  // story.id (not on `story` itself) so this runs once per story loaded,
  // not on every subsequent edit.
  useEffect(() => {
    if (!story) return;
    let cancelled = false;
    (async () => {
      for (let i = 0; i < story.scenes.length; i++) {
        if (cancelled) return;
        const scene = story.scenes[i];
        if (scene.narration_audio_url && !scene.audio_duration) {
          const duration = await measureAudioDuration(scene.narration_audio_url);
          if (!cancelled && duration) patchScene(i, { audio_duration: duration });
        }
      }
      if (!cancelled && story.end_card.narration_audio_url && !story.end_card.audio_duration) {
        const duration = await measureAudioDuration(story.end_card.narration_audio_url);
        if (!cancelled && duration) setStory((prev) => (prev ? { ...prev, end_card: { ...prev.end_card, audio_duration: duration } } : prev));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  function addToast(type: ToastAlert['type'], title: string, message: string) {
    const id = `toast-${++toastSeq}`;
    setToasts((prev) => [...prev, { id, type, title, message, timestamp: Date.now() }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }
  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function patchStory(patch: Partial<Story>) {
    setStory((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  // ---------------------------------------------------------------
  // Storyboard
  // ---------------------------------------------------------------

  async function handleBuildStoryboard(rawJson: any, aspectRatio: AspectRatio) {
    setIsSubmittingStoryboard(true);
    const res = await postJson('/api/story/storyboard', { story_json: rawJson, aspect_ratio: aspectRatio });
    setIsSubmittingStoryboard(false);
    if (!res.ok) {
      // Only a synopsis (no pre-written scenes[]) needs Gemini to expand it,
      // so this can't be pre-checked client-side -- the server is the one
      // that knows whether this particular upload was free or metered.
      if (res.status === 402 || res.data?.error === 'INSUFFICIENT_CREDITS') {
        setRechargeReason(res.data?.message || 'Credits exhausted. Please recharge to continue creating.');
        setIsRechargeOpen(true);
      }
      addToast('error', 'Could not build storyboard', res.error || 'Unknown error');
      return;
    }
    if (typeof res.data?.credits_remaining === 'number') {
      setCredits(res.data.credits_remaining);
    }
    const newStory: Story = withStoryDefaults(res.data.story);
    setStory(newStory);
    setStage(newStory.characters.length > 0 ? 'cast' : 'scenes');
    addToast('success', 'Storyboard ready', `${newStory.scenes.length} scenes across ${newStory.characters.length} character(s).`);
  }

  function handleResumeStory(resumed: Story) {
    setStory(withStoryDefaults(resumed));
    setStage('scenes');
    addToast('success', 'Story resumed', `"${resumed.story_title}" loaded from file.`);
  }

  function handleReset() {
    setConfirmDialog({
      isOpen: true,
      title: 'Start a new story?',
      message: 'This clears the current story from this browser session. If you want to keep your work, download an export backup first.',
      confirmLabel: 'Start new story',
      confirmVariant: 'danger',
      showExportButton: true,
      onConfirm: () => {
        clearStoredStory();
        setStory(null);
        setStage('cast');
        setConfirmDialog(null);
        addToast('info', 'New story started', 'Ready to upload or build a fresh storyboard.');
      },
    });
  }

  function handleExport() {
    if (story) downloadStoryAsJson(story);
  }

  // Reload a previously exported story from disk -- available at any time
  // from the header, not just before a story exists, so a browser crash
  // or an accidental "New story" doesn't mean starting over by hand.
  async function handleImportFile(file: File) {
    const doImport = async () => {
      try {
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
          throw new Error('This file has no scenes[] array -- is it a Storyframe export?');
        }
        handleResumeStory(parsed as Story);
      } catch (err: any) {
        addToast('error', 'Could not import file', err.message || `${file.name} isn't a valid Storyframe export.`);
      }
    };

    if (story) {
      setConfirmDialog({
        isOpen: true,
        title: 'Replace current story?',
        message: `Replace "${story.story_title}" with the story in "${file.name}"? Export your current story first if you want to keep it.`,
        confirmLabel: 'Replace story',
        confirmVariant: 'danger',
        showExportButton: true,
        onConfirm: () => {
          setConfirmDialog(null);
          doImport();
        },
      });
      return;
    }

    await doImport();
  }

  // ---------------------------------------------------------------
  // Characters
  // ---------------------------------------------------------------

  function patchCharacter(id: string, patch: Partial<Character>) {
    setStory((prev) => (prev ? { ...prev, characters: prev.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : prev));
  }

  async function generateCharacterSheet(id: string) {
    if (!checkCreditsOrPrompt('Character Sheet Generation', 1, () => generateCharacterSheet(id))) return;
    const current = storyRef.current;
    if (!current) return;
    const character = current.characters.find((c) => c.id === id);
    if (!character) return;

    patchCharacter(id, { status: 'generating', error_message: undefined });
    const res = await postJson('/api/character/sheet', { character, art_style_prompt: current.art_style_prompt, aspect_ratio: current.aspect_ratio });
    if (!res.ok) {
      if (res.status === 402 || res.data?.error === 'INSUFFICIENT_CREDITS') {
        setRechargeReason(res.data?.message || 'Credits exhausted. Please recharge ₹100 for 50 credits to continue creating visuals.');
        setIsRechargeOpen(true);
      }
      patchCharacter(id, { status: 'failed', error_message: res.error });
      addToast('error', `${character.name} failed`, res.error || 'Character sheet generation failed');
      return;
    }
    if (typeof res.data?.credits_remaining === 'number') {
      setCredits(res.data.credits_remaining);
    }
    patchCharacter(id, {
      status: 'ready',
      reference_image_url: res.data.image_url,
      is_ai_generated: res.data.is_ai_generated,
      model_used: res.data.model_used,
      error_message: res.data.error,
    });
  }

  async function generateAllCharacterSheets() {
    if (!checkCreditsOrPrompt('Batch Character Sheet Generation', 1, () => generateAllCharacterSheets())) return;
    const current = storyRef.current;
    if (!current) return;
    setIsCastBusy(true);
    for (const c of current.characters) {
      if (c.status !== 'ready') await generateCharacterSheet(c.id);
    }
    setIsCastBusy(false);
  }

  // ---------------------------------------------------------------
  // Scenes
  // ---------------------------------------------------------------

  function patchScene(index: number, patch: Partial<Scene>) {
    setStory((prev) => (prev ? { ...prev, scenes: prev.scenes.map((s, i) => (i === index ? { ...s, ...patch } : s)) } : prev));
  }

  async function generateScene(index: number) {
    if (!checkCreditsOrPrompt('AI Scene Image Generation', 1, () => generateScene(index))) return;
    const current = storyRef.current;
    if (!current) return;
    const scene = current.scenes[index];
    if (!scene) return;

    patchScene(index, { status: 'generating', error_message: undefined });

    const characterReferenceUrls = scene.characters_in_scene
      .map((id) => current.characters.find((c) => c.id === id)?.reference_image_url)
      .filter((u): u is string => Boolean(u));
    const priorApproved =
      scene.reference_previous_scene === true ? current.scenes.slice(0, index).reverse().find((s) => s.status === 'approved' && s.image_url) : undefined;

    const res = await postJson('/api/scene/generate', {
      scene,
      art_style_prompt: current.art_style_prompt,
      aspect_ratio: current.aspect_ratio,
      character_reference_urls: characterReferenceUrls,
      continuity_reference_url: priorApproved?.image_url,
    });

    if (!res.ok) {
      if (res.status === 402 || res.data?.error === 'INSUFFICIENT_CREDITS') {
        setRechargeReason(res.data?.message || 'Credits exhausted. Please recharge ₹100 for 50 credits to continue creating visuals.');
        setIsRechargeOpen(true);
      }
      patchScene(index, { status: 'failed', error_message: res.error });
      addToast('error', `Scene ${scene.scene_number} failed`, res.error || 'Image generation failed');
      return;
    }

    if (typeof res.data?.credits_remaining === 'number') {
      setCredits(res.data.credits_remaining);
    }

    const nextStatus = storyRef.current?.auto_approve ? 'approved' : 'needs_approval';
    patchScene(index, {
      status: nextStatus,
      image_url: res.data.image_url,
      is_ai_generated: res.data.is_ai_generated,
      model_used: res.data.model_used,
      error_message: res.data.error,
      approved_at: nextStatus === 'approved' ? Date.now() : undefined,
    });
  }

  async function generateAllScenes() {
    if (!checkCreditsOrPrompt('Batch Scene Image Generation', 1, () => generateAllScenes())) return;
    const current = storyRef.current;
    if (!current) return;
    setIsScenesBusy(true);
    // Sequential, not parallel: each scene's continuity reference is the
    // previous scene's freshly-generated image, so generation order has
    // to be the story's order.
    for (let i = 0; i < current.scenes.length; i++) {
      const scene = storyRef.current?.scenes[i];
      if (scene && (scene.status === 'pending' || scene.status === 'failed')) {
        await generateScene(i);
      }
    }
    setIsScenesBusy(false);
  }

  // Kicks off generation for the next scene right after this one is
  // approved/skipped, so reviewing a story is "approve, wait a moment,
  // review the next one" instead of "approve, click Generate, wait,
  // review" for every single scene. Skipped when a batch run
  // (generateAllScenes) already owns the sequencing, so the two paths
  // never race to generate the same scene twice.
  function maybeAutoGenerateNext(index: number) {
    if (isScenesBusy) return;
    const next = storyRef.current?.scenes[index + 1];
    if (next && (next.status === 'pending' || next.status === 'failed')) {
      generateScene(index + 1);
    }
  }

  function approveScene(index: number) {
    setStory((prev) => {
      if (!prev) return prev;
      const scenes = prev.scenes.map((s, i) => (i === index ? { ...s, status: 'approved' as const, approved_at: Date.now() } : s));
      return { ...prev, scenes, current_turn_index: Math.max(prev.current_turn_index, index + 1) };
    });
    maybeAutoGenerateNext(index);
  }

  function approveAllScenes() {
    setStory((prev) => {
      if (!prev) return prev;
      const scenes = prev.scenes.map((s) => ({
        ...s,
        status: s.status === 'skipped' ? s.status : ('approved' as const),
        include_in_final: s.status === 'skipped' ? false : true,
        approved_at: Date.now(),
      }));
      return { ...prev, scenes, current_turn_index: prev.scenes.length };
    });
    addToast('success', 'All scenes approved', 'All active scenes are now approved and ready for slideshow and video export.');
  }

  function skipScene(index: number) {
    patchScene(index, { status: 'skipped', include_in_final: false });
    maybeAutoGenerateNext(index);
  }

  async function refineScenePrompt(index: number, message: string) {
    if (!checkCreditsOrPrompt('AI Prompt Refinement', 0.5, () => refineScenePrompt(index, message))) return;
    const current = storyRef.current;
    const scene = current?.scenes[index];
    if (!scene) return;

    patchScene(index, { chat_history: [...scene.chat_history, { role: 'user', content: message, timestamp: Date.now() }] });

    const res = await postJson('/api/scene/refine-prompt', { visual_prompt: scene.visual_prompt, chat_history: scene.chat_history, message });
    if (!res.ok) {
      if (res.status === 402 || res.data?.error === 'INSUFFICIENT_CREDITS') {
        setRechargeReason(res.data?.message || 'Credits exhausted. Please recharge ₹100 for 50 credits.');
        setIsRechargeOpen(true);
      }
      addToast('error', 'Refinement failed', res.error || 'Could not refine the prompt');
      return;
    }
    if (typeof res.data?.credits_remaining === 'number') {
      setCredits(res.data.credits_remaining);
    }
    const latest = storyRef.current?.scenes[index];
    patchScene(index, {
      visual_prompt: res.data.refined_prompt,
      chat_history: [...(latest?.chat_history || []), { role: 'model', content: res.data.reply_message, timestamp: Date.now() }],
    });
  }

  // ---------------------------------------------------------------
  // Sound effects
  // ---------------------------------------------------------------

  function patchSoundEffect(sceneIndex: number, sfxId: string, patch: Partial<SceneSoundEffect>) {
    setStory((prev) =>
      prev
        ? {
            ...prev,
            scenes: prev.scenes.map((s, i) =>
              i === sceneIndex ? { ...s, sound_effects: s.sound_effects.map((sfx) => (sfx.id === sfxId ? { ...sfx, ...patch } : sfx)) } : s
            ),
          }
        : prev
    );
  }

  async function generateSoundEffect(sceneIndex: number, sfxId: string) {
    const scene = storyRef.current?.scenes[sceneIndex];
    const sfx = scene?.sound_effects.find((s) => s.id === sfxId);
    if (!sfx) return;
    patchSoundEffect(sceneIndex, sfxId, { status: 'generating', error_message: undefined });

    const res = await postJson(
      '/api/sound-effect/generate',
      sfx.custom_prompt ? { custom_prompt: sfx.custom_prompt } : { cue: sfx.cue }
    );
    if (res.ok) {
      if (typeof res.data?.credits_remaining === 'number') setCredits(res.data.credits_remaining);
      patchSoundEffect(sceneIndex, sfxId, { status: 'ready', audio_url: res.data.audio_url, is_ai_generated: true, error_message: undefined });
      return;
    }

    // A custom (free-text) sound has no procedural recipe to fall back to --
    // unlike catalog cues, it was never a candidate for the offline synth,
    // so a failed AI generation is just a failure here.
    if (sfx.custom_prompt) {
      patchSoundEffect(sceneIndex, sfxId, { status: 'failed', error_message: res.error || 'Sound effect generation failed' });
      return;
    }

    // No ElevenLabs key, or the request failed -- fall back to the
    // procedural synth so a sound effect is never just stuck unavailable.
    try {
      const audio_url = await synthesizeSoundEffect(sfx.cue as SoundEffectCue);
      patchSoundEffect(sceneIndex, sfxId, { status: 'ready', audio_url, is_ai_generated: false, error_message: undefined });
    } catch (err: any) {
      patchSoundEffect(sceneIndex, sfxId, { status: 'failed', error_message: err?.message || res.error || 'Sound effect generation failed' });
    }
  }

  // A free-text sound effect for when nothing in the fixed catalog fits --
  // sent straight through as the ElevenLabs prompt, bypassing the
  // catalog's keyword/prompt mapping entirely.
  function addCustomSoundEffect(sceneIndex: number, promptText: string) {
    const clean = promptText.trim();
    if (!clean) return;
    const id = `sfx-custom-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const sfx: SceneSoundEffect = {
      id,
      cue: id,
      custom_prompt: clean,
      label: clean.length > 40 ? `${clean.slice(0, 40)}…` : clean,
      volume: 0.85,
      status: 'pending',
    };
    const scene = storyRef.current?.scenes[sceneIndex];
    if (!scene) return;
    patchScene(sceneIndex, { sound_effects: [...scene.sound_effects, sfx] });
    generateSoundEffect(sceneIndex, id);
  }

  function toggleSceneSoundEffect(sceneIndex: number, cue: SoundEffectCue) {
    const scene = storyRef.current?.scenes[sceneIndex];
    if (!scene) return;
    const existing = scene.sound_effects.find((s) => s.cue === cue);
    if (existing) {
      patchScene(sceneIndex, { sound_effects: scene.sound_effects.filter((s) => s.id !== existing.id) });
      return;
    }
    const sfx: SceneSoundEffect = { id: `sfx-${cue}-${Date.now()}-${Math.round(Math.random() * 1e6)}`, cue, volume: 0.85, status: 'pending' };
    patchScene(sceneIndex, { sound_effects: [...scene.sound_effects, sfx] });
    // Generate right away -- there's no reason to make adding one a
    // separate two-step action.
    setTimeout(() => generateSoundEffect(sceneIndex, sfx.id), 0);
  }

  // Re-scans the scene's own text for cues it doesn't already have --
  // additive, never removes an effect the user added or already generated.
  // Critically checks caption_text, voice_line, action_description, and visual_prompt.
  function detectSceneSoundEffects(sceneIndex: number) {
    const scene = storyRef.current?.scenes[sceneIndex];
    if (!scene) return;
    const text = [scene.caption_text, scene.voice_line, scene.action_description, scene.visual_prompt].filter(Boolean).join(' ');
    const detected = detectSoundEffectCues(text);
    const existingCues = new Set(scene.sound_effects.map((s) => s.cue));
    const newCues = detected.filter((c) => !existingCues.has(c));
    if (newCues.length === 0) {
      addToast('info', 'No new sounds found', 'No additional sound effect cues found in this scene’s caption or text.');
      return;
    }
    const newSfx = newCues.map((cue) => ({ id: `sfx-${cue}-${Date.now()}-${Math.round(Math.random() * 1e6)}`, cue, volume: 0.85, status: 'pending' as const }));
    patchScene(sceneIndex, { sound_effects: [...scene.sound_effects, ...newSfx] });
    newSfx.forEach((sfx) => setTimeout(() => generateSoundEffect(sceneIndex, sfx.id), 0));
    addToast('success', 'Sound cues extracted', `Extracted ${newCues.join(', ')} from caption and text.`);
  }

  function detectAllSceneSoundEffects() {
    const current = storyRef.current;
    if (!current) return;
    let totalAdded = 0;
    current.scenes.forEach((scene, idx) => {
      const text = [scene.caption_text, scene.voice_line, scene.action_description, scene.visual_prompt].filter(Boolean).join(' ');
      const detected = detectSoundEffectCues(text);
      const existingCues = new Set(scene.sound_effects.map((s) => s.cue));
      const newCues = detected.filter((c) => !existingCues.has(c));
      if (newCues.length > 0) {
        totalAdded += newCues.length;
        const newSfx = newCues.map((cue) => ({ id: `sfx-${cue}-${Date.now()}-${Math.round(Math.random() * 1e6)}`, cue, volume: 0.85, status: 'pending' as const }));
        patchScene(idx, { sound_effects: [...scene.sound_effects, ...newSfx] });
        newSfx.forEach((sfx) => setTimeout(() => generateSoundEffect(idx, sfx.id), 0));
      }
    });
    if (totalAdded > 0) {
      addToast('success', 'Sounds extracted', `Extracted ${totalAdded} sound effect(s) across scenes from captions and text.`);
    } else {
      addToast('info', 'No additional sounds', 'All captions and scenes already have their detected sound cues.');
    }
  }

  // ---------------------------------------------------------------
  // Narration
  // ---------------------------------------------------------------

  async function handleVoiceChange(voice: string) {
    if (!voice) return;
    setIsVoiceChanging(true);
    // Update storyRef.current synchronously so any rapid generation calls read the new voice without waiting for render cycle
    if (storyRef.current) {
      storyRef.current = { ...storyRef.current, voice_name: voice };
    }
    setStory((prev) => (prev ? { ...prev, voice_name: voice } : prev));

    const allVoices = getAllAvailableVoices();
    const matched = allVoices.find((v) => v.id === voice || v.voice_id === voice);
    const displayName = matched?.name || voice;
    addToast('info', 'Narrator updated', `Narrator set to "${displayName}".`);

    // Keep loader active briefly for smooth, reassuring UI feedback
    await new Promise((resolve) => setTimeout(resolve, 350));
    setIsVoiceChanging(false);
  }

  function setVoiceName(voice: string) {
    handleVoiceChange(voice);
  }

  function setVoiceRate(rate: number) {
    setStory((prev) => (prev ? { ...prev, voice_rate: rate } : prev));
  }

  function setVoicePitch(pitch: number) {
    setStory((prev) => (prev ? { ...prev, voice_pitch: pitch } : prev));
  }

  async function generateSceneVoice(index: number, overrideVoice?: string, quietFallback = false) {
    if (!checkCreditsOrPrompt('AI Narration Generation', 0.25, () => generateSceneVoice(index, overrideVoice, quietFallback))) return;
    const current = storyRef.current;
    const scene = current?.scenes[index];
    if (!current || !scene) return;
    setNarrationGeneratingIndex(index);
    const activeVoice = overrideVoice || current.voice_name || 'narrator';
    const res = await postJson('/api/voice/generate', { text: scene.voice_line, voice_name: activeVoice, language: current.language });
    setNarrationGeneratingIndex(null);
    if (!res.ok) {
      if (res.status === 402 || res.data?.error === 'INSUFFICIENT_CREDITS') {
        setRechargeReason(res.data?.message || 'Credits exhausted. Please recharge to continue creating.');
        setIsRechargeOpen(true);
      }
      addToast('error', `Scene ${scene.scene_number} narration failed`, res.error || 'Narration generation failed');
      return;
    }
    if (typeof res.data?.credits_remaining === 'number') {
      setCredits(res.data.credits_remaining);
    }
    if (!quietFallback && res.data.used_fallback && res.data.fallback_reason) {
      addToast('info', 'Voice update', res.data.fallback_reason);
    }
    // The server never reports a duration -- measure the real clip length
    // ourselves so playback knows how long to actually hold this slide
    // instead of falling back to a short placeholder that cuts narration
    // off mid-sentence.
    const audio_duration = await measureAudioDuration(res.data.audio_url);
    patchScene(index, { narration_audio_url: res.data.audio_url, audio_duration });
  }

  async function generateEndCardVoice(overrideVoice?: string) {
    if (!checkCreditsOrPrompt('AI Narration Generation', 0.25, () => generateEndCardVoice(overrideVoice))) return;
    const current = storyRef.current;
    if (!current) return;
    setIsEndCardNarrationGenerating(true);
    const activeVoice = overrideVoice || current.voice_name || 'narrator';
    const res = await postJson('/api/voice/generate', { text: current.end_card.voice_line, voice_name: activeVoice, language: current.language });
    setIsEndCardNarrationGenerating(false);
    if (!res.ok) {
      if (res.status === 402 || res.data?.error === 'INSUFFICIENT_CREDITS') {
        setRechargeReason(res.data?.message || 'Credits exhausted. Please recharge to continue creating.');
        setIsRechargeOpen(true);
      }
      addToast('error', 'End card narration failed', res.error || 'Narration generation failed');
      return;
    }
    if (typeof res.data?.credits_remaining === 'number') {
      setCredits(res.data.credits_remaining);
    }
    const audio_duration = await measureAudioDuration(res.data.audio_url);
    setStory((prev) => (prev ? { ...prev, end_card: { ...prev.end_card, narration_audio_url: res.data.audio_url, audio_duration } } : prev));
  }

  // `force` distinguishes "voice the ones that still need it" (used by the
  // pipeline's normal flow) from "redo every line" (an explicit user
  // request -- e.g. after switching the narrator voice or the language,
  // where every existing clip is now stale even though narration_audio_url
  // is still set on each scene).
  async function generateAllVoices(force = false) {
    const current = storyRef.current;
    if (!current) return;
    setIsNarrationBusy(true);
    const voiceToUse = current.voice_name || 'narrator';
    for (let i = 0; i < current.scenes.length; i++) {
      const scene = storyRef.current?.scenes[i];
      if (scene && scene.status !== 'skipped' && (force || !scene.narration_audio_url)) {
        // Show fallback notice at most once (on the first generated scene) during batch runs
        await generateSceneVoice(i, voiceToUse, i > 0);
      }
    }
    if (storyRef.current?.end_card.enabled && (force || !storyRef.current.end_card.narration_audio_url)) {
      await generateEndCardVoice(voiceToUse);
    }
    setIsNarrationBusy(false);
  }

  // ---------------------------------------------------------------
  // Language
  // ---------------------------------------------------------------

  // Switches the story's active language. If this language was already in
  // the JSON (or translated before, in an earlier switch), it's instant --
  // every scene's voice_line/caption_text just swaps to that language's
  // cached entry. Otherwise, each scene (and the end card) gets translated
  // one line at a time and the result is cached into *_i18n so switching
  // back to it later is free. Existing narration audio is cleared either
  // way, since it was recorded in the old language.
  async function handleLanguageChange(targetLang: string) {
    const current = storyRef.current;
    if (!current || targetLang === current.language) return;

    const alreadyAvailable = current.available_languages.includes(targetLang);
    if (!alreadyAvailable) {
      if (!checkCreditsOrPrompt('AI Narration Translation', 0.5, () => handleLanguageChange(targetLang))) return;
      // One flat charge per new language added, not per line -- the
      // per-line /api/story/translate-language calls below stay free so a
      // 20-scene story doesn't rack up 20+ separate deductions for what the
      // user sees as a single "add this language" action.
      const deduction = await postJson('/api/credits/deduct', { amount: 0.5, description: 'AI Narration Translation' });
      if (!deduction.ok) {
        if (deduction.status === 402 || deduction.data?.error === 'INSUFFICIENT_CREDITS') {
          setRechargeReason(deduction.data?.message || 'Credits exhausted. Please recharge to continue creating.');
          setIsRechargeOpen(true);
        }
        return;
      }
      if (typeof deduction.data?.remaining === 'number') setCredits(deduction.data.remaining);
      setIsTranslating(true);
    }

    const sourceLang = current.language;
    const translatedScenes: Scene[] = [];
    for (const scene of current.scenes) {
      let voiceLine = scene.voice_line_i18n?.[targetLang];
      let captionText = scene.caption_text_i18n?.[targetLang];
      if (voiceLine === undefined) {
        const res = await postJson('/api/story/translate-language', { text: scene.voice_line, source_language: sourceLang, target_language: targetLang });
        voiceLine = res.ok ? res.data.translated : scene.voice_line;
      }
      if (captionText === undefined && scene.caption_text) {
        const res = await postJson('/api/story/translate-language', { text: scene.caption_text, source_language: sourceLang, target_language: targetLang });
        captionText = res.ok ? res.data.translated : scene.caption_text;
      }
      translatedScenes.push({
        ...scene,
        voice_line: voiceLine,
        caption_text: captionText,
        voice_line_i18n: { ...scene.voice_line_i18n, [targetLang]: voiceLine },
        caption_text_i18n: captionText ? { ...scene.caption_text_i18n, [targetLang]: captionText } : scene.caption_text_i18n,
        narration_audio_url: undefined,
      });
    }
    const scenes = translatedScenes;

    let endCard = current.end_card;
    let endVoiceLine = endCard.voice_line_i18n?.[targetLang];
    if (endVoiceLine === undefined) {
      const res = await postJson('/api/story/translate-language', { text: endCard.voice_line, source_language: sourceLang, target_language: targetLang });
      endVoiceLine = res.ok ? res.data.translated : endCard.voice_line;
    }
    let endCta = endCard.cta_text_i18n?.[targetLang];
    if (endCta === undefined) {
      const res = await postJson('/api/story/translate-language', { text: endCard.cta_text, source_language: sourceLang, target_language: targetLang });
      endCta = res.ok ? res.data.translated : endCard.cta_text;
    }
    endCard = {
      ...endCard,
      voice_line: endVoiceLine,
      cta_text: endCta,
      voice_line_i18n: { ...endCard.voice_line_i18n, [targetLang]: endVoiceLine },
      cta_text_i18n: { ...endCard.cta_text_i18n, [targetLang]: endCta },
      narration_audio_url: undefined,
    };

    setStory((prev) =>
      prev
        ? {
            ...prev,
            language: targetLang,
            available_languages: prev.available_languages.includes(targetLang) ? prev.available_languages : [...prev.available_languages, targetLang],
            scenes,
            end_card: endCard,
          }
        : prev
    );
    setIsTranslating(false);
    if (!alreadyAvailable) addToast('success', 'Language added', `Translated to this language. Re-generate narration audio for the new lines.`);
  }

  // Merges a second, separately-uploaded story JSON into the open story --
  // matched scene-by-scene via scene_number, applying only the fields the
  // user checked (voice-over/captions go into that language's i18n map;
  // visual prompt/image apply directly and regardless of language, and
  // knock an already-approved scene back to "needs review" since its
  // image no longer necessarily matches). Returns how many scenes matched,
  // so the modal can tell the difference between "done" and "nothing here
  // lined up with this story".
  function handleImportTranslation(targetLang: string, fields: ImportFieldSelection, importedScenes: ImportedScene[], endCard: { voice_line?: string; cta_text?: string }): number {
    const importedByNumber = new Map(importedScenes.map((s) => [s.scene_number, s]));
    let matched = 0;

    setStory((prev) => {
      if (!prev) return prev;
      const scenes = prev.scenes.map((scene) => {
        const imported = importedByNumber.get(scene.scene_number);
        if (!imported) return scene;
        matched += 1;

        const patch: Partial<Scene> = {};
        if (fields.voiceOver && imported.voice_line) {
          patch.voice_line_i18n = { ...scene.voice_line_i18n, [targetLang]: imported.voice_line };
          if (targetLang === prev.language) patch.voice_line = imported.voice_line;
        }
        if (fields.captions && imported.caption_text) {
          patch.caption_text_i18n = { ...scene.caption_text_i18n, [targetLang]: imported.caption_text };
          if (targetLang === prev.language) patch.caption_text = imported.caption_text;
        }
        const changesVisuals = (fields.visualPrompt && imported.visual_prompt) || (fields.image && imported.image_url);
        if (fields.visualPrompt && imported.visual_prompt) patch.visual_prompt = imported.visual_prompt;
        if (fields.image && imported.image_url) patch.image_url = imported.image_url;
        if (changesVisuals && scene.status === 'approved') {
          patch.status = 'needs_approval';
          patch.approved_at = undefined;
        }

        if (fields.soundEffects) {
          const textToScan = [
            imported.caption_text || scene.caption_text,
            imported.voice_line || scene.voice_line,
            imported.visual_prompt || scene.visual_prompt,
          ].filter(Boolean).join(' ');
          const detected = detectSoundEffectCues(textToScan);
          const rawCues = Array.isArray(imported.sound_effects)
            ? imported.sound_effects.map((x: any) => (typeof x === 'string' ? x : x?.cue)).filter(Boolean)
            : [];
          const combined = Array.from(new Set([...detected, ...rawCues])) as SoundEffectCue[];
          const existingSfx = [...scene.sound_effects];
          const existingCues = new Set(existingSfx.map((s) => s.cue));
          const newSfx: SceneSoundEffect[] = [];
          for (const cue of combined) {
            if (!existingCues.has(cue)) {
              newSfx.push({
                id: `sfx-${cue}-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
                cue,
                volume: 0.85,
                status: 'pending',
              });
              existingCues.add(cue);
            }
          }
          if (newSfx.length > 0) {
            patch.sound_effects = [...existingSfx, ...newSfx];
            const sIdx = scene.scene_number - 1;
            newSfx.forEach((sfx) => {
              setTimeout(() => generateSoundEffect(sIdx, sfx.id), 0);
            });
          }
        }

        return { ...scene, ...patch };
      });

      let newEndCard = prev.end_card;
      if ((fields.voiceOver && endCard.voice_line) || (fields.captions && endCard.cta_text)) {
        newEndCard = { ...prev.end_card };
        if (fields.voiceOver && endCard.voice_line) {
          newEndCard.voice_line_i18n = { ...newEndCard.voice_line_i18n, [targetLang]: endCard.voice_line };
          if (targetLang === prev.language) newEndCard.voice_line = endCard.voice_line;
        }
        if (fields.captions && endCard.cta_text) {
          newEndCard.cta_text_i18n = { ...newEndCard.cta_text_i18n, [targetLang]: endCard.cta_text };
          if (targetLang === prev.language) newEndCard.cta_text = endCard.cta_text;
        }
      }

      return {
        ...prev,
        scenes,
        end_card: newEndCard,
        available_languages: (fields.voiceOver || fields.captions) && !prev.available_languages.includes(targetLang) ? [...prev.available_languages, targetLang] : prev.available_languages,
      };
    });

    if (matched > 0) {
      addToast('success', 'Import complete', `Updated ${matched} scene${matched === 1 ? '' : 's'} from the uploaded file.`);
    }
    return matched;
  }

  // ---------------------------------------------------------------
  // Thumbnail
  // ---------------------------------------------------------------

  function updateThumbnail(patch: Partial<ThumbnailConfig>) {
    setStory((prev) => (prev ? { ...prev, thumbnail: { ...prev.thumbnail, ...patch } } : prev));
  }

  // ---------------------------------------------------------------

  if (isCheckingAuth) {
    return <div className="min-h-screen" />;
  }

  if (!authUser) {
    return (
      <AuthScreen
        onAuthenticated={(user) => {
          setAuthUser(user);
          setCredits(user.credits);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        story={story}
        onExport={handleExport}
        onImportFile={handleImportFile}
        onReset={handleReset}
        onOpenSettings={() => setIsStudioSettingsOpen(true)}
        onOpenVoiceStudio={() => setIsVoiceStudioOpen(true)}
        onOpenTitleGenerator={() => {
          if (!checkCreditsOrPrompt('AI Story Title Generator', 0.5, () => setIsTitleGeneratorOpen(true))) return;
          setIsTitleGeneratorOpen(true);
        }}
        userEmail={authUser.email}
        onLogout={handleLogout}
        credits={credits}
        onOpenRecharge={() => {
          setRechargeReason('');
          setIsRechargeOpen(true);
        }}
        onOpenReconciliation={authUser.isAdmin ? () => setIsReconciliationOpen(true) : undefined}
      />

      {!story ? (
        <StoryUpload isSubmitting={isSubmittingStoryboard} onSubmitStoryJson={handleBuildStoryboard} onResumeStory={handleResumeStory} />
      ) : (
        <>
          <PipelineTracker story={story} activeStage={stage} onSelect={setStage} />
          <main className="flex-1">
            {stage === 'cast' && (
              <CastPanel
                characters={story.characters}
                artStylePrompt={story.art_style_prompt}
                onGenerateSheet={generateCharacterSheet}
                onGenerateAll={generateAllCharacterSheets}
                onUpdateDescription={(id, desc) => patchCharacter(id, { description: desc })}
                onGoToScenes={() => setStage('scenes')}
                isBusy={isCastBusy}
                hasCredits={credits >= 0.5}
                onInsufficientCredits={() => {
                  setRechargeReason(`Using AI Character Prompt Refinement requires 0.5 credit(s), but your current balance is ${credits} Credits. Recharge to continue creating.`);
                  setIsRechargeOpen(true);
                }}
                onCreditsUpdated={setCredits}
              />
            )}
            {stage === 'scenes' && (
              <ScenesSection
                scenes={story.scenes}
                currentLanguage={story.language}
                availableLanguages={story.available_languages}
                onLanguageChange={handleLanguageChange}
                isTranslating={isTranslating}
                onGenerateVoice={generateSceneVoice}
                onGenerateAllVoices={() => generateAllVoices(true)}
                generatingVoiceIndex={narrationGeneratingIndex}
                isVoiceBusy={isNarrationBusy}
                onGenerate={generateScene}
                onGenerateAll={generateAllScenes}
                onApprove={approveScene}
                onApproveAll={approveAllScenes}
                onSkip={skipScene}
                onUpdateFields={patchScene}
                onRefine={refineScenePrompt}
                onToggleSound={toggleSceneSoundEffect}
                onRegenerateSound={generateSoundEffect}
                onSetSoundVolume={(idx, sfxId, volume) => patchSoundEffect(idx, sfxId, { volume })}
                onAddCustomSound={addCustomSoundEffect}
                onDetectSounds={detectSceneSoundEffects}
                onDetectAllSounds={detectAllSceneSoundEffects}
                onOpenImportJson={() => setIsImportTranslationOpen(true)}
                isBusy={isScenesBusy}
              />
            )}
            {stage === 'narration' && (
              <NarrationSection
                scenes={story.scenes}
                endCard={story.end_card}
                voiceName={story.voice_name}
                onVoiceChange={handleVoiceChange}
                onGenerateScene={generateSceneVoice}
                onGenerateEndCard={generateEndCardVoice}
                onGenerateAll={() => generateAllVoices(false)}
                onRedoAll={() => generateAllVoices(true)}
                onOpenImportJson={() => setIsImportTranslationOpen(true)}
                onOpenVoiceStudio={() => setIsVoiceStudioOpen(true)}
                isVoiceChanging={isVoiceChanging}
                generatingIndex={narrationGeneratingIndex}
                isEndCardGenerating={isEndCardNarrationGenerating}
                isBusy={isNarrationBusy}
              />
            )}
            {stage === 'thumbnail' && <ThumbnailStudio story={story} onUpdate={updateThumbnail} />}
            {stage === 'play' && (
              <SlideshowPlayer
                story={story}
                onApproveAll={approveAllScenes}
                onNavigateToScenes={() => setStage('scenes')}
              />
            )}

            {(() => {
              const nextStage = STAGE_ORDER[STAGE_ORDER.indexOf(stage) + 1];
              if (!nextStage) return null;
              return (
                <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-10 flex justify-end">
                  <button
                    onClick={() => setStage(nextStage)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766]"
                  >
                    Next: {STAGE_LABELS[nextStage]}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })()}
          </main>
        </>
      )}

      {isStudioSettingsOpen && (
        <StudioSettingsModal
          story={story}
          onPatch={patchStory}
          onClose={() => setIsStudioSettingsOpen(false)}
          userEmail={authUser.email}
          credits={credits}
          onOpenRecharge={() => {
            setIsStudioSettingsOpen(false);
            setRechargeReason('');
            setIsRechargeOpen(true);
          }}
          onOpenReconciliation={
            authUser.isAdmin
              ? () => {
                  setIsStudioSettingsOpen(false);
                  setIsReconciliationOpen(true);
                }
              : undefined
          }
          onLogout={() => {
            setIsStudioSettingsOpen(false);
            handleLogout();
          }}
        />
      )}
      {isVoiceStudioOpen && story && (
        <VoicePreviewModal
          currentVoice={story.voice_name}
          onSelectVoice={setVoiceName}
          voiceRate={story.voice_rate ?? 1}
          voicePitch={story.voice_pitch ?? 0}
          onChangeRate={setVoiceRate}
          onChangePitch={setVoicePitch}
          onClose={() => setIsVoiceStudioOpen(false)}
        />
      )}
      {isImportTranslationOpen && story && (
        <ImportTranslationModal currentLanguage={story.language} onImport={handleImportTranslation} onClose={() => setIsImportTranslationOpen(false)} />
      )}
      {isTitleGeneratorOpen && story && (
        <TitleGeneratorModal
          isOpen={isTitleGeneratorOpen}
          onClose={() => setIsTitleGeneratorOpen(false)}
          currentTitle={story.story_title}
          synopsis={story.synopsis}
          scenes={story.scenes}
          artStylePrompt={story.art_style_prompt}
          onApplyTitle={(title) => {
            patchStory({ story_title: title });
            addToast('success', 'Story title updated', `Title set to "${title}".`);
          }}
        />
      )}

      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          confirmVariant={confirmDialog.confirmVariant}
          showExportButton={confirmDialog.showExportButton && Boolean(story)}
          onExport={handleExport}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      <RechargeModal
        isOpen={isRechargeOpen}
        onClose={() => setIsRechargeOpen(false)}
        currentCredits={credits}
        reasonMessage={rechargeReason}
        onCreditsUpdated={(newBalance) => {
          setCredits(newBalance);
          addToast('success', 'Credits Recharged!', `Your balance is now ${newBalance} credits.`);
        }}
      />

      <ApiUsageReconciliationModal
        isOpen={isReconciliationOpen}
        onClose={() => setIsReconciliationOpen(false)}
      />

      <ToastNotifications toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
