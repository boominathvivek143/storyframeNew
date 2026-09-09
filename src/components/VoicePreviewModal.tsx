import { AlertCircle, Check, Download, Loader2, Play, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { VOICE_OPTIONS } from '../data/presets';
import { VoiceOption } from '../types';
import { postJson } from '../utils/apiClient';
import { applyNarrationPlayback } from '../utils/voicePlayback';
import {
  deleteCustomVoice,
  downloadCustomVoicesJson,
  extractElevenLabsVoiceId,
  getAllAvailableVoices,
  getCustomVoices,
  importCustomVoicesFromJson,
  saveCustomVoice,
} from '../utils/voiceManager';

type Filter = 'all' | 'gemini' | 'elevenlabs' | 'custom';

export function VoicePreviewModal({
  currentVoice,
  onSelectVoice,
  voiceRate,
  voicePitch,
  onChangeRate,
  onChangePitch,
  onClose,
}: {
  currentVoice: string;
  onSelectVoice: (voiceId: string) => void | Promise<void>;
  voiceRate: number;
  voicePitch: number;
  onChangeRate: (rate: number) => void;
  onChangePitch: (pitch: number) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('gemini');
  const [allVoices, setAllVoices] = useState<VoiceOption[]>(getAllAvailableVoices());
  const [sampleText, setSampleText] = useState('Once, in a town by the sea, a lighthouse keeper watched the water.');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const [selectingVoiceId, setSelectingVoiceId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCustomVoicePanelOpen, setIsCustomVoicePanelOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customName, setCustomName] = useState('');
  const [isTestingCustom, setIsTestingCustom] = useState(false);

  const refresh = () => setAllVoices(getAllAvailableVoices());

  const filtered = allVoices.filter((v) => {
    if (filter === 'custom') return v.is_custom;
    if (filter === 'gemini') return v.category === 'gemini';
    if (filter === 'elevenlabs') return v.category === 'elevenlabs' && !v.is_custom;
    return true;
  });

  const parsedCustomId = extractElevenLabsVoiceId(customInput);

  async function handlePlay(voice: VoiceOption) {
    setError(null);
    setPlayingId(voice.id);
    const res = await postJson('/api/voice/generate', { text: sampleText.trim() || voice.sample_text, voice_name: voice.voice_id || voice.id, is_preview: true });
    setPlayingId(null);
    if (!res.ok) {
      setError(res.error || 'Could not synthesize a preview for this voice.');
      return;
    }
    const audio = new Audio(res.data.audio_url);
    applyNarrationPlayback(audio, voiceRate, voicePitch);
    audio.play().catch(() => {});
  }

  async function handleTestCustomVoice() {
    if (!parsedCustomId) return;
    setIsTestingCustom(true);
    setError(null);
    const res = await postJson('/api/voice/generate', { text: sampleText.trim() || 'Testing this custom voice.', voice_name: parsedCustomId, is_preview: true });
    setIsTestingCustom(false);
    if (!res.ok) {
      setError(res.error || 'Could not synthesize with this voice ID.');
      return;
    }
    new Audio(res.data.audio_url).play().catch(() => {});
  }

  async function handleSelect(voice: VoiceOption) {
    const voiceId = voice.voice_id || voice.id;
    setSelectingVoiceId(voice.id);
    setError(null);
    try {
      await Promise.resolve(onSelectVoice(voiceId));
      setStatusMessage({ type: 'success', text: `Selected "${voice.name}" as narrator.` });
      // Brief visual reassurance so user sees the loading state switch to selected
      await new Promise((r) => setTimeout(r, 250));
    } finally {
      setSelectingVoiceId(null);
    }
  }

  function handleSaveCustomVoice() {
    if (!parsedCustomId) return;
    const voice: VoiceOption = {
      id: parsedCustomId,
      voice_id: parsedCustomId,
      name: customName.trim() || `Custom (${parsedCustomId.slice(0, 6)}…)`,
      gender: 'unspecified',
      style: 'Custom ElevenLabs voice',
      accent: 'Custom',
      category: 'elevenlabs',
      sample_text: sampleText,
      is_custom: true,
    };
    saveCustomVoice(voice);
    refresh();
    handleSelect(voice);
    setCustomInput('');
    setCustomName('');
    setFilter('custom');
  }

  function handleDeleteCustom(id: string) {
    deleteCustomVoice(id);
    refresh();
    setStatusMessage({ type: 'info', text: 'Custom voice removed.' });
  }

  function handleDownloadJson() {
    try {
      downloadCustomVoicesJson();
      setStatusMessage({ type: 'success', text: 'Downloaded custom voices JSON file.' });
    } catch (err: any) {
      setError(err?.message || 'Failed to download voices JSON.');
    }
  }

  function handleUploadJsonFile(file: File) {
    setError(null);
    setStatusMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = importCustomVoicesFromJson(text);
        if (result.success) {
          refresh();
          setFilter('custom');
          setStatusMessage({
            type: 'success',
            text: `Imported ${result.importedCount} custom voice(s) successfully!`,
          });
          const customVoices = getCustomVoices();
          if (customVoices.length > 0) {
            handleSelect(customVoices[customVoices.length - 1]);
          }
        } else {
          setError(result.error || 'Failed to import custom voices from JSON.');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to read voice JSON file.');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1b1822] border border-[#2f2a3a] rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f2a3a] shrink-0">
          <div>
            <h2 className="font-semibold text-[#ece8de]">Voice studio</h2>
            <p className="text-xs text-[#6b6579] mt-0.5">Preview, configure, or import custom voices for your story narrator.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCustomVoicePanelOpen((v) => !v)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 bg-[#231e2e] border-[#2f2a3a] text-[#c9c2e0]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add custom voice
            </button>
            <button onClick={onClose} className="text-[#6b6579] hover:text-[#ece8de]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-300 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {statusMessage && (
            <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${statusMessage.type === 'success' ? 'text-emerald-300 bg-emerald-950/40 border border-emerald-500/30' : 'text-[#c9c2e0] bg-[#231e2e] border border-[#2f2a3a]'}`}>
              <Check className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {isCustomVoicePanelOpen && (
            <div className="p-3.5 rounded-xl bg-[#121017] border border-[#2f2a3a] space-y-2">
              <p className="text-xs font-medium text-[#c9c2e0]">Add a custom voice</p>
              <p className="text-[10px] text-[#6b6579]">Paste the voice ID, or the full link from that voice's page in the ElevenLabs Voice Library.</p>
              <input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="https://elevenlabs.io/app/voice-library?voiceId=21m00Tcm4TlvDq8ikWAM"
                className="w-full bg-[#0d0b10] border border-[#2f2a3a] rounded-lg px-3 py-2 text-xs text-[#ece8de] outline-none font-mono"
              />
              {parsedCustomId && (
                <div className="flex items-center gap-2">
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Name this voice"
                    className="flex-1 bg-[#0d0b10] border border-[#2f2a3a] rounded-lg px-3 py-1.5 text-xs text-[#ece8de] outline-none"
                  />
                  <button onClick={handleTestCustomVoice} disabled={isTestingCustom} className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#2a2437] text-[#c9c2e0] hover:bg-[#332c44] flex items-center gap-1">
                    {isTestingCustom ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Test
                  </button>
                  <button onClick={handleSaveCustomVoice} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766] flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    Save & select
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-[#121017] p-1 rounded-xl border border-[#2f2a3a]">
              {(['gemini', 'elevenlabs', 'custom', 'all'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize ${filter === f ? 'bg-[#d9a042] text-[#1b1408]' : 'text-[#8a8399] hover:text-[#c9c2e0]'}`}
                >
                  {f === 'gemini' ? 'Built-in' : f}
                  {f === 'custom' && getCustomVoices().length > 0 && ` (${getCustomVoices().length})`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#121017] border border-[#2f2a3a] text-[#c9c2e0] hover:bg-[#231e2e] transition-colors"
                title="Upload custom voice JSON file"
              >
                <Upload className="w-3.5 h-3.5 text-[#d9a042]" />
                <span>Upload Voice JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadJsonFile(file);
                  e.target.value = '';
                }}
              />

              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#121017] border border-[#2f2a3a] text-[#c9c2e0] hover:bg-[#231e2e] transition-colors"
                title="Download custom voices as JSON"
              >
                <Download className="w-3.5 h-3.5 text-[#d9a042]" />
                <span>Download Voice JSON</span>
              </button>
            </div>
          </div>

          <input
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            placeholder="Line to preview"
            className="w-full bg-[#121017] border border-[#2f2a3a] rounded-lg px-3 py-2 text-sm text-[#ece8de] outline-none focus:border-[#d9a042]"
          />

          <div className="grid sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#121017] border border-[#2f2a3a]">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[#c9c2e0]">Speed</span>
                <span className="text-xs font-mono text-[#8a8399]">{voiceRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={voiceRate}
                onChange={(e) => onChangeRate(parseFloat(e.target.value))}
                className="w-full accent-[#d9a042]"
              />
              <p className="text-[10px] text-[#6b6579] mt-1">Applies to playback and export narration.</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[#c9c2e0]">Pitch</span>
                <span className="text-xs font-mono text-[#8a8399]">{voicePitch > 0 ? `+${voicePitch}` : voicePitch} st</span>
              </div>
              <input
                type="range"
                min={-6}
                max={6}
                step={1}
                value={voicePitch}
                onChange={(e) => onChangePitch(parseInt(e.target.value, 10))}
                className="w-full accent-[#d9a042]"
              />
              <p className="text-[10px] text-[#6b6579] mt-1">Nudges pitch up or down for character vocal color.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5">
            {filtered.length === 0 && (
              <div className="col-span-2 text-center py-8 px-4 rounded-xl border border-dashed border-[#2f2a3a] bg-[#121017]">
                <p className="text-xs text-[#8a8399] font-medium">No custom voices found.</p>
                <p className="text-[11px] text-[#6b6579] mt-1 max-w-sm mx-auto">
                  Add one via ElevenLabs Voice ID above, or upload a custom voices JSON file.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2a2437] text-[#c9c2e0] hover:bg-[#332c44]"
                >
                  <Upload className="w-3.5 h-3.5 text-[#d9a042]" />
                  Upload custom voice JSON
                </button>
              </div>
            )}
            {filtered.map((voice) => {
              const isSelected = currentVoice === voice.id || currentVoice === voice.voice_id;
              const isPlaying = playingId === voice.id;
              const isSelecting = selectingVoiceId === voice.id;
              return (
                <div key={voice.id} className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all ${isSelected ? 'border-[#d9a042] bg-[#2a2015] shadow-sm shadow-[#d9a042]/10' : 'border-[#2f2a3a] bg-[#121017]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium text-sm text-[#ece8de] truncate">{voice.name}</span>
                      {voice.gender !== 'unspecified' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#231e2e] text-[#8a8399] uppercase font-semibold shrink-0">{voice.gender}</span>}
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-[#d9a042] shrink-0 bg-[#3a2c1a] px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                    {voice.is_custom && (
                      <button onClick={() => handleDeleteCustom(voice.id)} className="text-[#6b6579] hover:text-red-400 shrink-0" title="Delete custom voice">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#6b6579]">{voice.style}</p>
                  <div className="flex items-center gap-2 mt-auto pt-1">
                    <button
                      onClick={() => handlePlay(voice)}
                      disabled={isPlaying || isSelecting}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-[#231e2e] text-[#c9c2e0] hover:bg-[#2c2637] disabled:opacity-50"
                    >
                      {isPlaying ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d9a042]" /> : <Play className="w-3.5 h-3.5" />}
                      {isPlaying ? 'Playing sample…' : 'Play sample'}
                    </button>
                    {!isSelected && (
                      <button
                        onClick={() => handleSelect(voice)}
                        disabled={isSelecting}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766] disabled:opacity-70 flex items-center gap-1 min-w-[70px] justify-center"
                      >
                        {isSelecting ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Selecting…</span>
                          </>
                        ) : (
                          <span>Select</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-[#2f2a3a] shrink-0">
          <span className="text-xs text-[#6b6579] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {allVoices.length} voices available ({getCustomVoices().length} custom)
          </span>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2a2437] text-[#c9c2e0] hover:bg-[#332c44]">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
