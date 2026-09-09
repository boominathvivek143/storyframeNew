import { FileJson, Loader2, Mic, Pause, Play, RefreshCw, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import { EndCard, Scene } from '../types';
import { getAllAvailableVoices } from '../utils/voiceManager';

function AudioRow({ label, text, audioUrl, isGenerating, onGenerate }: { label: string; text: string; audioUrl?: string; isGenerating: boolean; onGenerate: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  return (
    <div className="flex items-center gap-3 bg-[#1b1822] border border-[#2f2a3a] rounded-xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-[#6b6579]">{label}</div>
        <div className="text-sm text-[#c9c2e0] truncate mt-0.5">"{text}"</div>
      </div>
      {audioUrl && (
        <>
          <button onClick={toggle} className="shrink-0 w-8 h-8 rounded-full bg-[#2a2437] flex items-center justify-center text-[#c9c2e0] hover:bg-[#332c44]">
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <audio ref={audioRef} src={audioUrl} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} className="hidden" />
        </>
      )}
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2a2437] text-[#c9c2e0] hover:bg-[#332c44] disabled:opacity-50"
      >
        {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
        {audioUrl ? 'Redo' : 'Generate'}
      </button>
    </div>
  );
}

export function NarrationSection({
  scenes,
  endCard,
  voiceName,
  onVoiceChange,
  onGenerateScene,
  onGenerateEndCard,
  onGenerateAll,
  onRedoAll,
  onOpenImportJson,
  onOpenVoiceStudio,
  isVoiceChanging = false,
  generatingIndex,
  isEndCardGenerating,
  isBusy,
}: {
  scenes: Scene[];
  endCard: EndCard;
  voiceName: string;
  onVoiceChange: (voice: string) => void;
  onGenerateScene: (index: number) => void;
  onGenerateEndCard: () => void;
  onGenerateAll: () => void;
  onRedoAll: () => void;
  onOpenImportJson?: () => void;
  onOpenVoiceStudio?: () => void;
  isVoiceChanging?: boolean;
  generatingIndex: number | null;
  isEndCardGenerating: boolean;
  isBusy: boolean;
}) {
  const eligible = scenes.filter((s) => s.status !== 'skipped').length + (endCard.enabled ? 1 : 0);
  const remaining = scenes.filter((s) => s.status !== 'skipped' && !s.narration_audio_url).length + (endCard.enabled && !endCard.narration_audio_url ? 1 : 0);
  const voicedAlready = eligible - remaining;

  const allVoices = getAllAvailableVoices();
  const currentVoiceObj = allVoices.find((v) => v.voice_id === voiceName || v.id === voiceName);
  const currentDisplayName = currentVoiceObj?.name || voiceName || 'Narrator';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-[#ece8de]">Narration</h2>
          <p className="text-sm text-[#6b6579] mt-0.5">One voice line per scene, synthesized with your chosen narrator.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenVoiceStudio && (
            <button
              onClick={onOpenVoiceStudio}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium bg-[#1b1822] border border-[#2f2a3a] text-[#c9c2e0] hover:bg-[#282235] hover:text-[#ece8de] transition-colors"
              title="Open Voice Studio to preview, add ElevenLabs IDs, or import/export voice JSON"
            >
              <Mic className="w-3.5 h-3.5 text-[#d9a042]" />
              <span>Voice Studio</span>
            </button>
          )}

          {onOpenImportJson && (
            <button
              onClick={onOpenImportJson}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium bg-[#1b1822] border border-[#2f2a3a] text-[#c9c2e0] hover:bg-[#282235] hover:text-white transition-colors"
              title="Upload or paste updated JSON to complete voice-overs, captions, or translations"
            >
              <FileJson className="w-3.5 h-3.5 text-[#d9a042]" />
              <span>Update from JSON</span>
            </button>
          )}

          <div className="relative flex items-center">
            <select
              value={voiceName || 'narrator'}
              disabled={isBusy || isVoiceChanging}
              onChange={(e) => onVoiceChange(e.target.value)}
              className="bg-[#1b1822] border border-[#2f2a3a] rounded-lg px-2.5 py-2 pr-8 text-xs text-[#ece8de] outline-none hover:border-[#d9a042]/50 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {allVoices.map((v) => (
                <option key={v.id} value={v.category === 'elevenlabs' ? v.voice_id : v.id}>
                  {v.name} · {v.style} {v.is_custom ? '(Custom)' : ''}
                </option>
              ))}
            </select>
            {isVoiceChanging && (
              <div className="absolute right-2.5 pointer-events-none">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d9a042]" />
              </div>
            )}
          </div>

          {remaining > 0 && (
            <button
              onClick={onGenerateAll}
              disabled={isBusy || isVoiceChanging}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766] disabled:opacity-50"
            >
              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Voice all ({remaining})
            </button>
          )}

          {voicedAlready > 0 && (
            <button
              onClick={onRedoAll}
              disabled={isBusy || isVoiceChanging}
              title="Regenerate every narration line, including ones already voiced -- useful after changing the narrator or its speed/pitch"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#2a2437] text-[#c9c2e0] hover:bg-[#332c44] disabled:opacity-50"
            >
              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Redo all
            </button>
          )}
        </div>
      </div>

      {isVoiceChanging && (
        <div className="flex items-center gap-2 text-xs text-[#d9a042] bg-[#d9a042]/10 border border-[#d9a042]/30 rounded-xl px-3.5 py-2.5 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Switching active narrator to <strong>{currentDisplayName}</strong>...</span>
        </div>
      )}

      {voicedAlready > 0 && !isVoiceChanging && (
        <div className="flex items-center justify-between gap-3 text-xs text-[#c9c2e0] bg-[#16131c] border border-[#2f2a3a] rounded-xl px-3.5 py-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#d9a042] shrink-0" />
            <span>
              Narrator is <strong className="text-[#ece8de]">{currentDisplayName}</strong>. If you changed the voice, redo narration to hear the new voice on existing scenes.
            </span>
          </div>
          <button
            onClick={onRedoAll}
            disabled={isBusy}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#2a2437] text-[#c9c2e0] hover:bg-[#332c44] hover:text-white transition-colors disabled:opacity-50"
          >
            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 text-[#d9a042]" />}
            Redo all ({voicedAlready})
          </button>
        </div>
      )}

      <div className="space-y-2.5">
        {scenes
          .filter((s) => s.status !== 'skipped')
          .map((scene) => {
            const idx = scenes.indexOf(scene);
            return (
              <AudioRow
                key={scene.id}
                label={`Scene ${scene.scene_number}`}
                text={scene.voice_line}
                audioUrl={scene.narration_audio_url}
                isGenerating={generatingIndex === idx}
                onGenerate={() => onGenerateScene(idx)}
              />
            );
          })}
        {endCard.enabled && (
          <AudioRow label="End card" text={endCard.voice_line} audioUrl={endCard.narration_audio_url} isGenerating={isEndCardGenerating} onGenerate={onGenerateEndCard} />
        )}
      </div>
    </div>
  );
}
