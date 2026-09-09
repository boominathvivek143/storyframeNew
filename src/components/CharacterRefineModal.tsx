import { Check, Eye, Loader2, RefreshCw, Sparkles, User, Wand2, X } from 'lucide-react';
import { useState } from 'react';
import { Character } from '../types';
import { postJson } from '../utils/apiClient';

const QUICK_INSPIRATIONS = [
  'Add weathered battle scars and determined expression',
  'Ornate golden embroidery and royal velvet cape',
  'Steampunk brass goggles and utility harness',
  'Mystical glowing tattoos and ethereal gaze',
  'Casual modern cyberpunk jacket with subtle neon accents',
  'Ancient scholar robes with talisman necklace',
];

export function CharacterRefineModal({
  character,
  artStylePrompt,
  isOpen,
  onClose,
  onSave,
  onSaveAndGenerate,
  hasCredits,
  onInsufficientCredits,
  onCreditsUpdated,
}: {
  character: Character | null;
  artStylePrompt: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (characterId: string, updatedDescription: string) => void;
  onSaveAndGenerate: (characterId: string, updatedDescription: string) => void;
  hasCredits: boolean;
  onInsufficientCredits: () => void;
  onCreditsUpdated: (credits: number) => void;
}) {
  if (!isOpen || !character) return null;

  const [description, setDescription] = useState(character.description || '');
  const [direction, setDirection] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fullPromptPreview = `Character reference sheet. ${character.name}: ${description.trim()}. Neutral standing pose, plain uncluttered background, clear full-body view, front-facing. Style: ${artStylePrompt || 'cinematic digital art'}`;

  async function handleAiRefine(customNote?: string) {
    const note = customNote || direction;
    if (!note.trim()) return;

    if (!hasCredits) {
      onInsufficientCredits();
      return;
    }

    setIsRefining(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await postJson<{
        refinedDescription: string;
        fullPromptPreview: string;
        replyMessage: string;
        credits_remaining?: number;
        error?: string;
      }>('/api/character/refine-prompt', {
        character_name: character?.name,
        current_description: description,
        user_instruction: note,
        art_style_prompt: artStylePrompt,
      });

      if (res.ok && res.data?.refinedDescription) {
        if (typeof res.data.credits_remaining === 'number') onCreditsUpdated(res.data.credits_remaining);
        setDescription(res.data.refinedDescription);
        setFeedback(res.data.replyMessage || 'Character prompt refined successfully.');
        setDirection('');
      } else if (res.status === 402 || res.data?.error === 'INSUFFICIENT_CREDITS') {
        onInsufficientCredits();
      } else {
        setError(res.error || 'Failed to refine character prompt with AI.');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to refinement service.');
    } finally {
      setIsRefining(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1b1822] border border-[#2f2a3a] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2f2a3a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#262035] border border-[#3b3350] flex items-center justify-center text-[#d9a042]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#ece8de]">Refine Character Sheet Prompt</h3>
              <p className="text-xs text-[#8e85a5]">Fine-tune visual appearance & costume for {character.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#8e85a5] hover:text-[#ece8de] hover:bg-[#251f33]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="flex items-center gap-4 p-3.5 rounded-xl bg-[#14111d] border border-[#292336]">
            <div className="w-14 h-14 rounded-lg bg-[#1a1626] border border-[#332b45] overflow-hidden shrink-0 flex items-center justify-center">
              {character.reference_image_url ? (
                <img src={character.reference_image_url} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-[#6b6579]" />
              )}
            </div>
            <div>
              <span className="text-sm font-semibold text-[#ece8de]">{character.name}</span>
              <p className="text-xs text-[#8e85a5] mt-0.5">
                {character.reference_image_url ? 'Active reference sheet loaded' : 'No sheet generated yet'}
              </p>
            </div>
          </div>

          {/* AI Refine Direction Bar */}
          <div className="p-4 rounded-xl bg-[#231c33]/70 border border-[#3c3255]">
            <label className="block text-xs font-semibold text-[#ece8de] mb-1.5 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-[#d9a042]" />
              <span>Direct AI Refinement</span>
            </label>
            <p className="text-xs text-[#9f96b5] mb-2.5">
              Tell AI how to adjust this character (e.g. clothing, color scheme, age, signature accessories):
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAiRefine();
                  }
                }}
                placeholder="e.g., Change outfit to dark emerald armor with silver runes..."
                className="flex-1 bg-[#121017] border border-[#3e3554] rounded-xl px-3.5 py-2 text-xs text-[#ece8de] placeholder-[#6b6579] focus:border-[#d9a042] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAiRefine()}
                disabled={isRefining || !direction.trim()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766] disabled:opacity-50 shrink-0 transition-colors shadow-sm"
              >
                {isRefining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Refine</span>
              </button>
            </div>

            {/* Quick Inspiration Tags */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK_INSPIRATIONS.map((tag, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setDirection(tag);
                    handleAiRefine(tag);
                  }}
                  disabled={isRefining}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-[#1a1527] border border-[#3b3252] text-[#b8b0d1] hover:border-[#d9a042] hover:text-[#ece8de] transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>

            {feedback && (
              <p className="text-xs text-emerald-400 mt-2.5 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {feedback}
              </p>
            )}
            {error && <p className="text-xs text-red-400 mt-2.5">{error}</p>}
          </div>

          {/* Editable Appearance Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#c9c2e0]">Visual Appearance Prompt</label>
              <span className="text-[11px] text-[#8e85a5]">Physical attributes, costume & styling</span>
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe character's physical traits, hair, face, costume, colors..."
              className="w-full bg-[#121017] border border-[#3e3554] rounded-xl p-3.5 text-xs text-[#ece8de] placeholder-[#6b6579] focus:border-[#d9a042] focus:outline-none transition-colors leading-relaxed"
            />
          </div>

          {/* Full Sheet Prompt Preview */}
          <div className="p-3.5 rounded-xl bg-[#14111d] border border-[#292336] text-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8e85a5] uppercase tracking-wider mb-1.5">
              <Eye className="w-3 h-3 text-[#d9a042]" />
              <span>Full Generated Prompt Sent to Image Model</span>
            </div>
            <p className="text-[#a9a2bf] font-mono text-[11px] leading-relaxed bg-[#100d16] p-2.5 rounded-lg border border-[#241e30]">
              {fullPromptPreview}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2f2a3a] bg-[#161320] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8e85a5] hover:text-[#ece8de] hover:bg-[#251f33] transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSave(character.id, description.trim());
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#272138] border border-[#3e3554] text-[#ece8de] hover:border-[#52476d] transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={() => {
                onSaveAndGenerate(character.id, description.trim());
                onClose();
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766] shadow-md transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Save & Generate Sheet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
