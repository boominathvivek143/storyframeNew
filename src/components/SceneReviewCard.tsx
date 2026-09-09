import { CheckCircle2, ChevronDown, ChevronUp, Globe, ImageOff, Loader2, MessageSquareText, Mic, MoveDiagonal, Pause, Play, Plus, RefreshCw, Search, SkipForward, Sparkles, Volume2, Wand2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ANIMATION_STYLES, OVERLAY_EFFECTS } from '../data/presets';
import { SOUND_EFFECT_CATALOG, getSoundEffectDefinition } from '../data/soundEffects';
import { Scene, SceneSoundEffect, SoundEffectCue } from '../types';

function sfxLabel(sfx: SceneSoundEffect): string {
  return sfx.label || getSoundEffectDefinition(sfx.cue as SoundEffectCue).label;
}

const STATUS_LABEL: Record<Scene['status'], string> = {
  pending: 'Not generated',
  generating: 'Generating…',
  needs_approval: 'Needs review',
  approved: 'Approved',
  skipped: 'Skipped',
  failed: 'Failed',
};

const STATUS_COLOR: Record<Scene['status'], string> = {
  pending: 'text-[#6b6579] bg-[#231e2e]',
  generating: 'text-[#d9a042] bg-[#2a2015]',
  needs_approval: 'text-amber-300 bg-amber-950/50',
  approved: 'text-emerald-300 bg-emerald-950/50',
  skipped: 'text-[#6b6579] bg-[#231e2e]',
  failed: 'text-red-300 bg-red-950/50',
};

export function SceneReviewCard({
  scene,
  currentLanguage,
  onLanguageChange,
  onGenerateVoice,
  isGeneratingVoice,
  onGenerate,
  onApprove,
  onSkip,
  onUpdateFields,
  onRefine,
  onToggleSound,
  onRegenerateSound,
  onSetSoundVolume,
  onAddCustomSound,
  onDetectSounds,
}: {
  scene: Scene;
  currentLanguage?: string;
  onLanguageChange?: (lang: string) => void;
  onGenerateVoice?: () => void;
  isGeneratingVoice?: boolean;
  onGenerate: () => void;
  onApprove: () => void;
  onSkip: () => void;
  onUpdateFields: (patch: Partial<Scene>) => void;
  onRefine: (message: string) => void;
  onToggleSound: (cue: SoundEffectCue | string) => void;
  onRegenerateSound: (sfxId: string) => void;
  onSetSoundVolume: (sfxId: string, volume: number) => void;
  onAddCustomSound: (promptText: string) => void;
  onDetectSounds: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingSfxId, setPlayingSfxId] = useState<string | null>(null);
  const sfxAudioRef = useRef<HTMLAudioElement | null>(null);
  const [sfxSearch, setSfxSearch] = useState('');
  const [customSfxPrompt, setCustomSfxPrompt] = useState('');
  const isGenerating = scene.status === 'generating';

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (sfxAudioRef.current) {
        sfxAudioRef.current.pause();
        sfxAudioRef.current = null;
      }
    };
  }, []);

  const toggleSfxPlay = (sfx: SceneSoundEffect) => {
    if (!sfx.audio_url) return;
    if (playingSfxId === sfx.id && sfxAudioRef.current) {
      sfxAudioRef.current.pause();
      setPlayingSfxId(null);
      return;
    }
    if (sfxAudioRef.current) sfxAudioRef.current.pause();
    const audio = new Audio(sfx.audio_url);
    audio.volume = sfx.volume;
    audio.onended = () => setPlayingSfxId(null);
    audio.onerror = () => setPlayingSfxId(null);
    sfxAudioRef.current = audio;
    audio.play().then(() => setPlayingSfxId(sfx.id)).catch(() => setPlayingSfxId(null));
  };

  const submitCustomSfx = () => {
    if (!customSfxPrompt.trim()) return;
    onAddCustomSound(customSfxPrompt.trim());
    setCustomSfxPrompt('');
  };

  const togglePlayAudio = () => {
    if (!scene.narration_audio_url) return;
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(scene.narration_audio_url);
      audioRef.current.onended = () => setIsPlayingAudio(false);
      audioRef.current.onerror = () => setIsPlayingAudio(false);
    } else {
      audioRef.current.src = scene.narration_audio_url;
    }
    audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => setIsPlayingAudio(false));
  };

  const submitRefine = () => {
    if (!chatMessage.trim()) return;
    onRefine(chatMessage.trim());
    setChatMessage('');
  };

  const availableLangs = scene.voice_line_i18n ? Object.keys(scene.voice_line_i18n) : [];

  return (
    <div className="bg-[#1b1822] border border-[#2f2a3a] rounded-xl overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start">
        <div className="sm:w-56 shrink-0 bg-[#121017] relative aspect-[9/16]">
          {scene.image_url ? (
            <img src={scene.image_url} alt={scene.action_description} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center min-h-[160px]">
              {isGenerating ? <Loader2 className="w-6 h-6 animate-spin text-[#4a4458]" /> : <ImageOff className="w-6 h-6 text-[#332c44]" />}
            </div>
          )}
          {!scene.is_ai_generated && scene.image_url && (
            <span className="absolute bottom-1.5 left-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-amber-300">placeholder</span>
          )}
        </div>

        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <span className="text-xs font-mono text-[#6b6579]">
                Scene {scene.scene_number}
                {scene.beat ? ` · ${scene.beat}` : ''}
              </span>
              <h3 className="font-medium text-[#ece8de] text-sm mt-0.5">{scene.action_description}</h3>
            </div>
            <span className={`shrink-0 text-[10px] font-medium px-2 py-1 rounded-full ${STATUS_COLOR[scene.status]}`}>{STATUS_LABEL[scene.status]}</span>
          </div>

          {scene.error_message && <p className="text-xs text-red-400 mb-2">{scene.error_message}</p>}

          {/* Voice-Over / Narration block with Language & Audio controls */}
          <div className="bg-[#14111a] border border-[#2c263b] rounded-lg p-2.5 mb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5 pb-1.5 border-b border-[#241f30]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#d9a042]">
                  <Mic className="w-3 h-3" />
                  Voice-Over
                </span>
                {currentLanguage && (
                  <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-[#2b213b] text-[#e0b368] border border-[#483761]">
                    {currentLanguage}
                  </span>
                )}
                {availableLangs.length > 1 && (
                  <div className="flex items-center gap-1 ml-1">
                    <Globe className="w-2.5 h-2.5 text-[#736c84]" />
                    {availableLangs.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => onLanguageChange?.(lang)}
                        className={`text-[9px] font-mono uppercase px-1 py-0.2 rounded transition-colors ${
                          currentLanguage === lang
                            ? 'bg-[#d9a042] text-[#1b1408] font-bold'
                            : 'bg-[#211c2c] text-[#938aab] hover:text-white hover:bg-[#312a41]'
                        }`}
                        title={`Switch active language to ${lang.toUpperCase()}`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {scene.narration_audio_url && (
                  <button
                    onClick={togglePlayAudio}
                    className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#241f31] border border-[#413559] text-[#c9c2e0] hover:text-white hover:bg-[#312a43] transition-colors"
                    title={isPlayingAudio ? 'Pause narration' : 'Listen to narration voice-over'}
                  >
                    {isPlayingAudio ? <Pause className="w-2.5 h-2.5 text-[#d9a042]" /> : <Play className="w-2.5 h-2.5 text-[#d9a042]" />}
                    <span>{scene.audio_duration ? `${scene.audio_duration.toFixed(1)}s` : 'Play'}</span>
                  </button>
                )}

                {onGenerateVoice && (
                  <button
                    onClick={onGenerateVoice}
                    disabled={isGeneratingVoice}
                    className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-[#271f36] border border-[#4a3a66] text-[#e0b368] hover:text-white hover:bg-[#382b4f] transition-colors disabled:opacity-50"
                    title={`Generate or re-synthesize voice-over for this scene (${(currentLanguage || 'active').toUpperCase()})`}
                  >
                    {isGeneratingVoice ? <Loader2 className="w-2.5 h-2.5 animate-spin text-[#d9a042]" /> : <RefreshCw className="w-2.5 h-2.5" />}
                    <span>{scene.narration_audio_url ? 'Re-voice' : 'Generate voice'}</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-sm text-[#ece8de] leading-relaxed font-normal">"{scene.voice_line}"</p>

            {scene.caption_text && (
              <div className="mt-1.5 flex items-baseline gap-1.5 text-xs text-[#a59eb7] pt-1.5 border-t border-[#241f30]">
                <span className="shrink-0 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#272236] text-[#e0b368] font-semibold">
                  Caption
                </span>
                <span className="italic leading-snug">"{scene.caption_text}"</span>
              </div>
            )}
          </div>

          {/* Always-visible Visual Prompt preview box */}
          <div className="mt-2 text-xs bg-[#131018] border border-[#272234] rounded-lg px-2.5 py-1.5 text-[#b5adc6]">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#7a728b] mb-0.5">
              <span className="flex items-center gap-1 font-semibold text-[#8a8399]">
                <Sparkles className="w-3 h-3 text-[#d9a042]" />
                <span>VISUAL PROMPT</span>
              </span>
              <button
                onClick={() => setExpanded(true)}
                className="hover:text-[#e0b368] text-[#8a8399] transition-colors"
                title="Edit visual prompt"
              >
                Edit
              </button>
            </div>
            <p className="line-clamp-2 hover:line-clamp-none transition-all leading-relaxed" title={scene.visual_prompt}>
              {scene.visual_prompt}
            </p>
          </div>

          {/* Always-visible Sound Selection Row */}
          <div className="mt-2.5 pt-2 border-t border-[#272234] flex items-center flex-wrap gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#8a8399] mr-1">
              <Volume2 className="w-3 h-3 text-[#d9a042]" />
              <span>Sounds:</span>
            </span>

            {scene.sound_effects.length === 0 ? (
              <span className="text-[11px] text-[#6b6579] italic mr-1">None selected</span>
            ) : (
              scene.sound_effects.map((sfx) => (
                <span
                  key={sfx.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#251f33] border border-[#3e3454] text-[11px] text-[#d8d2ea]"
                  title={`${sfxLabel(sfx)} (${Math.round(sfx.volume * 100)}% volume)`}
                >
                  {sfx.audio_url && sfx.status === 'ready' && (
                    <button onClick={() => toggleSfxPlay(sfx)} className="text-[#d9a042] hover:text-[#f3bf6d]" title="Play sound">
                      {playingSfxId === sfx.id ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                    </button>
                  )}
                  <span className="max-w-[120px] truncate">{sfxLabel(sfx)}</span>
                  <span className="text-[9px] text-[#8e85a5] font-mono">{Math.round(sfx.volume * 100)}%</span>
                  <button
                    onClick={() => onToggleSound(sfx.cue)}
                    className="text-[#8e85a5] hover:text-red-400 ml-0.5"
                    title="Remove sound"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))
            )}

            <button
              onClick={onDetectSounds}
              className="inline-flex items-center gap-1 text-[11px] text-[#d9a042] hover:text-[#f3bf6d] ml-auto transition-colors font-medium px-2 py-0.5 rounded hover:bg-[#272015]"
              title="Extract sound effects from caption, voice line, and scene text"
            >
              <Sparkles className="w-3 h-3" />
              <span>Extract from caption/text</span>
            </button>
          </div>

          <div className="flex items-center flex-wrap gap-2 mt-3">
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2a2437] text-[#c9c2e0] hover:bg-[#332c44] disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {scene.image_url ? 'Regenerate' : 'Generate'}
            </button>
            {scene.image_url && scene.status !== 'approved' && (
              <button onClick={onApprove} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/90 text-white hover:bg-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </button>
            )}
            {scene.status !== 'skipped' && scene.status !== 'approved' && (
              <button onClick={onSkip} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#6b6579] hover:text-[#c9c2e0]">
                <SkipForward className="w-3.5 h-3.5" />
                Skip
              </button>
            )}
            <div className="flex items-center gap-1.5 bg-[#121017] border border-[#2f2a3a] rounded-lg pl-2 pr-1" title="How this scene's image moves during playback">
              <MoveDiagonal className="w-3.5 h-3.5 text-[#6b6579] shrink-0" />
              <select
                value={scene.animation_style}
                onChange={(e) => onUpdateFields({ animation_style: e.target.value as Scene['animation_style'] })}
                className="bg-transparent text-xs text-[#c9c2e0] outline-none py-1.5 pr-1"
              >
                {ANIMATION_STYLES.map((a) => (
                  <option key={a.id} value={a.id} className="bg-[#1b1822]">
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 bg-[#121017] border border-[#2f2a3a] rounded-lg pl-2 pr-1" title="Vector particle effect drawn over the image during playback">
              <Wand2 className="w-3.5 h-3.5 text-[#6b6579] shrink-0" />
              <select
                value={scene.overlay_effect}
                onChange={(e) => onUpdateFields({ overlay_effect: e.target.value as Scene['overlay_effect'] })}
                className="bg-transparent text-xs text-[#c9c2e0] outline-none py-1.5 pr-1"
              >
                {OVERLAY_EFFECTS.map((f) => (
                  <option key={f.id} value={f.id} className="bg-[#1b1822]">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1 ml-auto text-xs font-medium text-[#6b6579] hover:text-[#c9c2e0]">
              {expanded ? 'Hide details' : 'Edit & refine'}
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {expanded && (
            <div className="mt-4 pt-4 border-t border-[#2f2a3a] space-y-3">
              <div>
                <label className="text-xs font-medium text-[#8a8399] block mb-1">Narration line</label>
                <textarea
                  value={scene.voice_line}
                  onChange={(e) => onUpdateFields({ voice_line: e.target.value })}
                  rows={2}
                  className="w-full bg-[#121017] border border-[#2f2a3a] rounded-lg px-3 py-2 text-sm text-[#ece8de] outline-none focus:border-[#d9a042] resize-none"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#8a8399]">Caption / Subtitle</label>
                  <span className="text-[10px] text-[#6b6579]">Used for on-screen text &amp; sound cue extraction</span>
                </div>
                <textarea
                  value={scene.caption_text ?? ''}
                  onChange={(e) => onUpdateFields({ caption_text: e.target.value })}
                  placeholder="Caption text (e.g., [wind howling] A lone figure steps forward...)"
                  rows={2}
                  className="w-full bg-[#121017] border border-[#2f2a3a] rounded-lg px-3 py-2 text-sm text-[#ece8de] outline-none focus:border-[#d9a042] resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#8a8399] block mb-1">Visual prompt</label>
                <textarea
                  value={scene.visual_prompt}
                  onChange={(e) => onUpdateFields({ visual_prompt: e.target.value })}
                  rows={3}
                  className="w-full bg-[#121017] border border-[#2f2a3a] rounded-lg px-3 py-2 text-sm text-[#ece8de] outline-none focus:border-[#d9a042] resize-none font-mono text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-[#c9c2e0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={scene.reference_previous_scene}
                  onChange={(e) => onUpdateFields({ reference_previous_scene: e.target.checked })}
                  className="w-3.5 h-3.5 accent-[#d9a042]"
                />
                Match the previous approved scene's image for continuity
                <span className="text-[#6b6579]">— turn on if this scene shares the same setting as the one before it</span>
              </label>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#8a8399]">Sound effects</label>
                  <button onClick={onDetectSounds} className="flex items-center gap-1 text-[10px] font-medium text-[#8a8399] hover:text-[#c9c2e0]">
                    <Volume2 className="w-3 h-3" />
                    Detect from text
                  </button>
                </div>

                {scene.sound_effects.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {scene.sound_effects.map((sfx) => (
                      <div key={sfx.id} className="flex items-center gap-2 bg-[#121017] border border-[#2f2a3a] rounded-lg px-2.5 py-1.5">
                        {sfx.audio_url && sfx.status === 'ready' && (
                          <button onClick={() => toggleSfxPlay(sfx)} className="text-[#d9a042] hover:text-[#f3bf6d] shrink-0" title="Play sound">
                            {playingSfxId === sfx.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <span className="text-xs text-[#c9c2e0] w-28 shrink-0 truncate" title={sfxLabel(sfx)}>{sfxLabel(sfx)}</span>
                        {sfx.status === 'generating' ? (
                          <span className="flex-1 flex items-center gap-1.5 text-[10px] text-[#6b6579]">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Generating…
                          </span>
                        ) : sfx.status === 'failed' ? (
                          <span className="flex-1 text-[10px] text-red-400 truncate" title={sfx.error_message}>
                            Failed — {sfx.error_message || 'unknown error'}
                          </span>
                        ) : (
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={sfx.volume}
                            onChange={(e) => onSetSoundVolume(sfx.id, parseFloat(e.target.value))}
                            className="flex-1 accent-[#d9a042]"
                            title={sfx.is_ai_generated ? 'AI-generated (ElevenLabs)' : 'Procedural fallback'}
                          />
                        )}
                        {sfx.status !== 'generating' && (
                          <button onClick={() => onRegenerateSound(sfx.id)} className="text-[#6b6579] hover:text-[#c9c2e0] shrink-0" title="Regenerate">
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                        <button onClick={() => onToggleSound(sfx.cue)} className="text-[#6b6579] hover:text-red-400 shrink-0" title="Remove">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative mb-1.5">
                  <Search className="w-3 h-3 text-[#6b6579] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={sfxSearch}
                    onChange={(e) => setSfxSearch(e.target.value)}
                    placeholder="Search sound effects…"
                    className="w-full bg-[#121017] border border-[#2f2a3a] rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-[#ece8de] placeholder-[#6b6579] outline-none focus:border-[#d9a042]"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {SOUND_EFFECT_CATALOG.filter(
                    (d) => !scene.sound_effects.some((s) => s.cue === d.id) && d.label.toLowerCase().includes(sfxSearch.trim().toLowerCase())
                  ).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => onToggleSound(d.id)}
                      className="px-2 py-1 rounded-full text-[10px] font-medium border border-[#2f2a3a] text-[#8a8399] hover:border-[#4a4458] hover:text-[#c9c2e0]"
                    >
                      + {d.label}
                    </button>
                  ))}
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-[#241f30]">
                  <p className="text-[10px] text-[#6b6579] mb-1.5">Not in the list? Describe a custom sound effect:</p>
                  <div className="flex gap-1.5">
                    <input
                      value={customSfxPrompt}
                      onChange={(e) => setCustomSfxPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitCustomSfx()}
                      placeholder="e.g. a creaking ship deck at sea"
                      className="flex-1 bg-[#121017] border border-[#2f2a3a] rounded-lg px-2.5 py-1.5 text-xs text-[#ece8de] placeholder-[#6b6579] outline-none focus:border-[#d9a042]"
                    />
                    <button
                      onClick={submitCustomSfx}
                      disabled={!customSfxPrompt.trim()}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#2a2437] text-[#c9c2e0] hover:bg-[#332c44] disabled:opacity-40 shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      Generate
                    </button>
                  </div>
                </div>
              </div>

              {scene.chat_history.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {scene.chat_history.map((m, i) => (
                    <div key={i} className={`text-xs rounded-lg px-2.5 py-1.5 ${m.role === 'user' ? 'bg-[#231e2e] text-[#c9c2e0] ml-6' : 'bg-[#182a28] text-[#a9d9d2] mr-6'}`}>
                      {m.content}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-[#121017] border border-[#2f2a3a] rounded-lg px-3">
                  <MessageSquareText className="w-3.5 h-3.5 text-[#6b6579] shrink-0" />
                  <input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitRefine()}
                    placeholder="e.g. pull the camera back, make it dusk instead"
                    className="flex-1 bg-transparent py-2 text-sm text-[#ece8de] outline-none placeholder:text-[#4a4458]"
                  />
                </div>
                <button onClick={submitRefine} disabled={!chatMessage.trim()} className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#2a2437] text-[#c9c2e0] hover:bg-[#332c44] disabled:opacity-40 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Refine
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
