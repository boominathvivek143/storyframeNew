import { Check, Copy, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { postJson } from '../utils/apiClient';
import { Scene } from '../types';

export interface TitleOption {
  title: string;
  style: string;
  rationale: string;
}

export function TitleGeneratorModal({
  isOpen,
  onClose,
  currentTitle,
  synopsis,
  scenes,
  artStylePrompt,
  onApplyTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentTitle: string;
  synopsis: string;
  scenes: Scene[];
  artStylePrompt: string;
  onApplyTitle: (title: string) => void;
}) {
  const [titles, setTitles] = useState<TitleOption[]>([]);
  const [selectedTitle, setSelectedTitle] = useState(currentTitle);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchTitles() {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await postJson<{ recommended: string; options: TitleOption[] }>('/api/story/generate-titles', {
        synopsis,
        scenes: scenes.slice(0, 8),
        current_title: currentTitle,
        art_style_prompt: artStylePrompt,
      });

      if (res.ok && res.data?.options?.length) {
        setTitles(res.data.options);
        if (res.data.recommended) {
          setSelectedTitle(res.data.recommended);
        }
      } else {
        setError(res.error || 'Failed to generate title choices.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with AI service.');
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      setSelectedTitle(currentTitle);
      if (titles.length === 0) {
        fetchTitles();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1b1822] border border-[#2f2a3a] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2f2a3a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d9a042] to-[#a8701f] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#1b1408]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#ece8de]">AI Title Generator</h3>
              <p className="text-xs text-[#8e85a5]">Generate compelling, click-worthy titles tailored to your story scenes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#8e85a5] hover:text-[#ece8de] hover:bg-[#251f33]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Current / Custom Title Input */}
          <div>
            <label className="block text-xs font-medium text-[#c9c2e0] mb-1.5">Chosen Story Title</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedTitle}
                onChange={(e) => setSelectedTitle(e.target.value)}
                placeholder="Enter or select a story title..."
                className="flex-1 bg-[#121017] border border-[#3e3554] rounded-xl px-3.5 py-2 text-sm text-[#ece8de] placeholder-[#6b6579] focus:border-[#d9a042] focus:outline-none transition-colors"
              />
              <button
                onClick={fetchTitles}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#272138] border border-[#3e3554] text-[#c9c2e0] hover:text-white hover:border-[#d9a042] disabled:opacity-50 shrink-0 transition-colors"
                title="Generate fresh AI titles"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d9a042]" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Regenerate</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* AI Suggestions List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#8e85a5]">AI Suggestions ({titles.length})</span>
              {isGenerating && <span className="text-[11px] text-[#d9a042] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Crafting titles with Gemini...</span>}
            </div>

            <div className="space-y-2">
              {titles.map((opt, idx) => {
                const isSelected = selectedTitle.trim().toLowerCase() === opt.title.trim().toLowerCase();
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedTitle(opt.title)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#2a2238] border-[#d9a042] shadow-md'
                        : 'bg-[#14111d] border-[#292336] hover:border-[#463c5d] hover:bg-[#1a1626]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#ece8de]">{opt.title}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#241e33] border border-[#3e3554] text-[#d9a042]">
                            {opt.style}
                          </span>
                        </div>
                        {opt.rationale && <p className="text-xs text-[#8e85a5] leading-relaxed">{opt.rationale}</p>}
                      </div>
                      <div className="shrink-0 pt-0.5">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-[#d9a042] flex items-center justify-center text-[#1b1408]">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTitle(opt.title);
                            }}
                            className="text-xs text-[#8e85a5] hover:text-[#d9a042] font-medium px-2 py-1 rounded hover:bg-[#251f33]"
                          >
                            Select
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#2f2a3a] bg-[#161320] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8e85a5] hover:text-[#ece8de] hover:bg-[#251f33] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedTitle.trim()) {
                onApplyTitle(selectedTitle.trim());
                onClose();
              }
            }}
            disabled={!selectedTitle.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766] disabled:opacity-50 shadow-md transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply to Story</span>
          </button>
        </div>
      </div>
    </div>
  );
}
