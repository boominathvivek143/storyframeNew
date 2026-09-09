import { CheckCheck, FileJson, Globe, Loader2, Mic, Sparkles, Volume2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { Scene, SoundEffectCue } from '../types';
import { SceneReviewCard } from './SceneReviewCard';

export function ScenesSection({
  scenes,
  currentLanguage,
  availableLanguages,
  onLanguageChange,
  isTranslating,
  onGenerateVoice,
  onGenerateAllVoices,
  generatingVoiceIndex,
  isVoiceBusy,
  onGenerate,
  onGenerateAll,
  onApprove,
  onApproveAll,
  onSkip,
  onUpdateFields,
  onRefine,
  onToggleSound,
  onRegenerateSound,
  onSetSoundVolume,
  onAddCustomSound,
  onDetectSounds,
  onDetectAllSounds,
  onOpenImportJson,
  isBusy,
}: {
  scenes: Scene[];
  currentLanguage?: string;
  availableLanguages?: string[];
  onLanguageChange?: (lang: string) => void;
  isTranslating?: boolean;
  onGenerateVoice?: (index: number) => void;
  onGenerateAllVoices?: () => void;
  generatingVoiceIndex?: number | null;
  isVoiceBusy?: boolean;
  onGenerate: (index: number) => void;
  onGenerateAll: () => void;
  onApprove: (index: number) => void;
  onApproveAll?: () => void;
  onSkip: (index: number) => void;
  onUpdateFields: (index: number, patch: Partial<Scene>) => void;
  onRefine: (index: number, message: string) => void;
  onToggleSound: (index: number, cue: SoundEffectCue | string) => void;
  onRegenerateSound: (index: number, sfxId: string) => void;
  onSetSoundVolume: (index: number, sfxId: string, volume: number) => void;
  onAddCustomSound: (index: number, promptText: string) => void;
  onDetectSounds: (index: number) => void;
  onDetectAllSounds?: () => void;
  onOpenImportJson?: () => void;
  isBusy: boolean;
}) {
  const approved = scenes.filter((s) => s.status === 'approved').length;
  const unapprovedCount = scenes.filter((s) => s.status !== 'approved' && s.status !== 'skipped').length;
  const pending = scenes.filter((s) => s.status === 'pending' || s.status === 'failed').length;
  const voicedScenesCount = scenes.filter((s) => !!s.narration_audio_url).length;

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === (currentLanguage || 'en'));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header & Actions */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-[#ece8de] text-lg">Scene by Scene</h2>
          <p className="text-sm text-[#6b6579] mt-0.5">
            {approved}/{scenes.length} approved · {voicedScenesCount}/{scenes.length} voiced in{' '}
            <span className="text-[#e0b368] font-medium">{currentLangObj?.nativeLabel || currentLangObj?.label || 'English'}</span>
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sound extraction */}
          {onDetectAllSounds && scenes.length > 0 && (
            <button
              onClick={onDetectAllSounds}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#221c2e] border border-[#3e3454] text-[#c9c2e0] hover:bg-[#2e263d] hover:text-white transition-colors"
              title="Scan all scene captions and text to extract matching sound effects"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#d9a042]" />
              <span>Extract sounds</span>
            </button>
          )}

          {/* Approve All */}
          {unapprovedCount > 0 && onApproveAll && (
            <button
              onClick={onApproveAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#212726] border border-[#2e5246] text-emerald-300 hover:bg-[#263732] hover:text-white transition-colors"
              title="Approve all scenes for slideshow preview and video export"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Approve All ({unapprovedCount})</span>
            </button>
          )}

          {/* Generate All Images */}
          {pending > 0 && (
            <button
              onClick={onGenerateAll}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766] disabled:opacity-50 shrink-0"
            >
              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Generate images ({pending})
            </button>
          )}
        </div>
      </div>

      {/* Language & Voice-Over Bar */}
      <div className="mb-5 p-3 rounded-xl bg-[#171320] border border-[#2b2538] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#c9c2e0]">
            <Globe className="w-4 h-4 text-[#d9a042]" />
            <span>Story Language:</span>
          </div>

          <div className="relative inline-block">
            <select
              value={currentLanguage || 'en'}
              onChange={(e) => onLanguageChange?.(e.target.value)}
              disabled={isTranslating}
              className="text-xs bg-[#221c2d] border border-[#433758] text-[#ece8de] rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:border-[#d9a042] cursor-pointer disabled:opacity-50"
            >
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isPreloaded = availableLanguages?.includes(lang.code);
                return (
                  <option key={lang.code} value={lang.code}>
                    {lang.label} ({lang.nativeLabel}) {isPreloaded ? '★ In Story' : ''}
                  </option>
                );
              })}
            </select>
            {isTranslating && (
              <span className="absolute right-2 top-2 pointer-events-none">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d9a042]" />
              </span>
            )}
          </div>

          {isTranslating && (
            <span className="text-xs text-[#d9a042] flex items-center gap-1 font-medium animate-pulse">
              Translating story voice-over & captions…
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Update from JSON */}
          {onOpenImportJson && (
            <button
              onClick={onOpenImportJson}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#221c2e] border border-[#3e3554] text-[#c9c2e0] hover:bg-[#2b233a] hover:text-white transition-colors"
              title="Upload or paste story JSON to update voice-overs, translations, captions, or sounds without losing approved scenes"
            >
              <FileJson className="w-3.5 h-3.5 text-[#d9a042]" />
              <span>Update from JSON</span>
            </button>
          )}

          {/* Regenerate Voice-Over Button */}
          {onGenerateAllVoices && scenes.length > 0 && (
            <button
              onClick={onGenerateAllVoices}
              disabled={isVoiceBusy || isTranslating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#261e33] border border-[#523f6d] text-[#e0b368] hover:bg-[#342749] hover:text-white transition-colors disabled:opacity-50"
              title={`Regenerate or synthesize all scene voice-overs for ${currentLangObj?.label || 'selected language'}`}
            >
              {isVoiceBusy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d9a042]" />
                  <span>Synthesizing voice-overs…</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-[#d9a042]" />
                  <span>
                    {voicedScenesCount === 0 ? 'Generate All Voices' : 'Regenerate All Voices'} ({currentLangObj?.code.toUpperCase() || 'EN'})
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Scenes List */}
      <div className="space-y-3">
        {scenes.map((scene, idx) => (
          <SceneReviewCard
            key={scene.id}
            scene={scene}
            currentLanguage={currentLanguage}
            onLanguageChange={onLanguageChange}
            onGenerateVoice={onGenerateVoice ? () => onGenerateVoice(idx) : undefined}
            isGeneratingVoice={generatingVoiceIndex === idx}
            onGenerate={() => onGenerate(idx)}
            onApprove={() => onApprove(idx)}
            onSkip={() => onSkip(idx)}
            onUpdateFields={(patch) => onUpdateFields(idx, patch)}
            onRefine={(message) => onRefine(idx, message)}
            onToggleSound={(cue) => onToggleSound(idx, cue)}
            onRegenerateSound={(sfxId) => onRegenerateSound(idx, sfxId)}
            onSetSoundVolume={(sfxId, volume) => onSetSoundVolume(idx, sfxId, volume)}
            onAddCustomSound={(promptText) => onAddCustomSound(idx, promptText)}
            onDetectSounds={() => onDetectSounds(idx)}
          />
        ))}
      </div>
    </div>
  );
}
