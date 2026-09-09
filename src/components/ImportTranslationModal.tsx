import { AlertCircle, FileJson, Languages, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { postJson } from '../utils/apiClient';

export interface ImportedScene {
  scene_number: number;
  voice_line: string;
  caption_text?: string;
  visual_prompt?: string; // only set if the raw file actually provided one
  image_url?: string; // only set if the raw file actually provided one
  sound_effects?: any[];
}

export interface ImportFieldSelection {
  voiceOver: boolean;
  captions: boolean;
  visualPrompt: boolean;
  image: boolean;
  soundEffects: boolean;
}

export function ImportTranslationModal({
  currentLanguage,
  onClose,
  onImport,
}: {
  currentLanguage: string;
  onClose: () => void;
  onImport: (targetLang: string, fields: ImportFieldSelection, scenes: ImportedScene[], endCard: { voice_line?: string; cta_text?: string }) => number;
}) {
  const [targetLang, setTargetLang] = useState(currentLanguage || 'en');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fields, setFields] = useState<ImportFieldSelection>({
    voiceOver: true,
    captions: true,
    visualPrompt: false,
    image: false,
    soundEffects: true,
  });
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilePicked = async (file: File | undefined) => {
    if (!file) return;
    try {
      setFileName(file.name);
      setText(await file.text());
      setError(null);
    } catch (e: any) {
      setError(`Failed to read file: ${e.message}`);
    }
  };

  function toggleField(key: keyof ImportFieldSelection) {
    setFields((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleImport() {
    setError(null);
    if (!text.trim()) {
      setError('Paste or upload the story JSON first.');
      return;
    }
    if (!fields.voiceOver && !fields.captions && !fields.visualPrompt && !fields.image && !fields.soundEffects) {
      setError('Pick at least one field to update.');
      return;
    }

    let rawParsed: any;
    try {
      rawParsed = JSON.parse(text);
    } catch (err: any) {
      setError(`That isn't valid JSON: ${err.message}`);
      return;
    }
    const rawScenesByNumber = new Map<number, any>();
    (Array.isArray(rawParsed.scenes) ? rawParsed.scenes : []).forEach((s: any, idx: number) => {
      rawScenesByNumber.set(typeof s?.scene_number === 'number' ? s.scene_number : idx + 1, s);
    });

    setIsImporting(true);
    // Normalizing server-side reuses the same forgiving field-alias and
    // multi-language extraction logic the main upload path already has
    const res = await postJson('/api/story/normalize', { story_json: rawParsed });
    setIsImporting(false);

    if (!res.ok) {
      setError(res.error || 'Could not parse that file.');
      return;
    }
    if (!res.data.scenes || res.data.scenes.length === 0) {
      setError('That file has no scenes[] array to match against -- this only works with a per-scene file, not a synopsis-only one.');
      return;
    }

    const scenes: ImportedScene[] = res.data.scenes.map((s: any) => {
      const raw = rawScenesByNumber.get(s.scene_number);
      return {
        scene_number: s.scene_number,
        voice_line: s.voice_line,
        caption_text: s.caption_text,
        visual_prompt: typeof raw?.visual_prompt === 'string' ? raw.visual_prompt : typeof raw?.prompt === 'string' ? raw.prompt : undefined,
        image_url: typeof raw?.image_url === 'string' ? raw.image_url : undefined,
        sound_effects: Array.isArray(raw?.sound_effects) ? raw.sound_effects : Array.isArray(raw?.sound_effect_cues) ? raw.sound_effect_cues : undefined,
      };
    });

    const matched = onImport(targetLang, fields, scenes, res.data.end_card || {});
    if (matched === 0) {
      setError(`None of that file's scene_number values matched this story's scenes -- nothing was imported. Check the file has the same scenes, numbered the same way.`);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1b1822] border border-[#2f2a3a] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f2a3a] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#272138] border border-[#3e3454] flex items-center justify-center text-[#d9a042]">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-[#ece8de]">Import & Update Story Fields from JSON</h2>
              <p className="text-xs text-[#8e85a5]">Selectively update prompts, captions, voice-overs, or sound effects</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#6b6579] hover:text-[#ece8de] hover:bg-[#251f33]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="p-3 rounded-xl bg-[#14111d] border border-[#292336] text-xs text-[#8e85a5] leading-relaxed">
            Upload or paste an updated story JSON. Matched by <code className="text-[#d9a042]">scene_number</code>. Only the fields you check below will be overwritten or appended.
          </div>

          <div>
            <p className="text-xs font-semibold text-[#ece8de] mb-2">Decide what to update:</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: 'voiceOver', label: 'Voice-Over Narration', desc: 'Updates voice lines for the chosen language' },
                  { key: 'captions', label: 'Scene Captions', desc: 'Updates text overlay captions' },
                  { key: 'visualPrompt', label: 'Visual Image Prompt', desc: 'Updates generation prompt for images' },
                  { key: 'soundEffects', label: 'Sound Effects & Cues', desc: 'Extracts / updates audio cues from text' },
                  { key: 'image', label: 'Image URL', desc: 'Directly replaces rendered image URLs' },
                ] as { key: keyof ImportFieldSelection; label: string; desc: string }[]
              ).map((f) => (
                <label
                  key={f.key}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    fields[f.key]
                      ? 'border-[#d9a042] bg-[#272015] text-[#ece8de]'
                      : 'border-[#2f2a3a] bg-[#14111d] text-[#8a8399] hover:border-[#3e3554]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={fields[f.key]}
                    onChange={() => toggleField(f.key)}
                    className="w-4 h-4 mt-0.5 accent-[#d9a042] shrink-0"
                  />
                  <div>
                    <span className="text-xs font-semibold block">{f.label}</span>
                    <span className="text-[10px] text-[#7d7590] leading-tight block mt-0.5">{f.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            {(fields.visualPrompt || fields.image) && (
              <p className="text-[11px] text-amber-400 mt-2 bg-amber-950/30 border border-amber-800/40 p-2 rounded-lg">
                ⚠️ Updating visual prompts or images on approved scenes resets them to &ldquo;needs review&rdquo;.
              </p>
            )}
          </div>

          {(fields.voiceOver || fields.captions) && (
            <div className="p-3.5 rounded-xl bg-[#14111d] border border-[#292336] space-y-2">
              <label className="text-xs font-semibold text-[#ece8de] block">
                Target Language for Voice-Over & Captions
              </label>
              <p className="text-[11px] text-[#8e85a5]">
                Support multiple languages: choose whether this file updates your main language ({currentLanguage}) or adds an additional translation.
              </p>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full bg-[#1b1822] border border-[#3e3454] rounded-lg px-3 py-2 text-xs text-[#ece8de] outline-none focus:border-[#d9a042]"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeLabel} ({l.label}) {l.code === currentLanguage ? '— [Current Project Language]' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Drag and Drop / File Picker Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFilePicked(e.dataTransfer.files?.[0]);
            }}
            className="border-2 border-dashed border-[#3e3454] hover:border-[#d9a042] rounded-xl p-4 text-center cursor-pointer bg-[#14111d] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => handleFilePicked(e.target.files?.[0])} />
            <FileJson className="w-7 h-7 text-[#d9a042] mx-auto mb-1.5" />
            <p className="text-xs font-medium text-[#ece8de]">
              {fileName ? <span className="text-[#d9a042] font-semibold">{fileName} loaded</span> : 'Click to Browse JSON file or drag & drop here'}
            </p>
            <p className="text-[10px] text-[#6b6579] mt-0.5">Accepts Story JSON with scenes[] array</p>
          </div>

          <div className="bg-[#121017] border border-[#2f2a3a] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2f2a3a] bg-[#161320]">
              <span className="text-[11px] font-mono text-[#6b6579]">Raw JSON view / edit</span>
              {text && (
                <button onClick={() => { setText(''); setFileName(null); }} className="text-[10px] text-[#8e85a5] hover:text-red-400">
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='{\n  "scenes": [\n    { "scene_number": 1, "caption_text": "...", "voice_line": "..." }\n  ]\n}'
              spellCheck={false}
              className="w-full h-28 bg-transparent text-[#dcd7e8] font-mono text-xs leading-relaxed p-3 outline-none resize-none placeholder:text-[#4a4458]"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-300 bg-red-950/40 border border-red-500/30 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#2f2a3a] bg-[#161320] shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-medium text-[#8a8399] hover:text-[#c9c2e0]">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || !text.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766] disabled:opacity-50 shadow-md transition-all active:scale-95"
          >
            {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileJson className="w-3.5 h-3.5" />}
            <span>Apply Updates</span>
          </button>
        </div>
      </div>
    </div>
  );
}
