import { ArrowRight, CheckCircle2, Edit3, Loader2, RefreshCw, Sparkles, User, Users } from 'lucide-react';
import { useState } from 'react';
import { Character } from '../types';
import { CharacterRefineModal } from './CharacterRefineModal';

export function CastPanel({
  characters,
  artStylePrompt = '',
  onGenerateSheet,
  onGenerateAll,
  onUpdateDescription,
  onGoToScenes,
  isBusy,
  hasCredits,
  onInsufficientCredits,
  onCreditsUpdated,
}: {
  characters: Character[];
  artStylePrompt?: string;
  onGenerateSheet: (characterId: string) => void;
  onGenerateAll: () => void;
  onUpdateDescription?: (characterId: string, description: string) => void;
  onGoToScenes?: () => void;
  isBusy: boolean;
  hasCredits: boolean;
  onInsufficientCredits: () => void;
  onCreditsUpdated: (credits: number) => void;
}) {
  const [refiningCharacter, setRefiningCharacter] = useState<Character | null>(null);

  if (characters.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="p-8 rounded-2xl bg-[#1a1626] border border-[#2f2a3a] shadow-lg">
          <div className="w-12 h-12 rounded-full bg-[#272138] border border-[#3e3654] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-[#ece8de] mb-2">No Cast Sheets Needed</h3>
          <p className="text-sm text-[#9f98af] leading-relaxed mb-6">
            This story has no recurring named characters defined. Each scene will be generated directly from its visual prompts and descriptive actions.
          </p>
          {onGoToScenes && (
            <button
              onClick={onGoToScenes}
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766] transition-all shadow-md active:scale-95"
            >
              <span>Continue to Scenes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  const pendingCount = characters.filter((c) => c.status !== 'ready').length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-[#ece8de]">Cast reference sheets</h2>
          <p className="text-sm text-[#6b6579] mt-0.5">Generated once per character, then reused to keep them consistent across every scene they appear in.</p>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={onGenerateAll}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766] disabled:opacity-50 shrink-0"
          >
            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Generate all ({pendingCount})
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {characters.map((c) => (
          <div key={c.id} className="bg-[#1b1822] border border-[#2f2a3a] rounded-xl overflow-hidden flex flex-col">
            <div className="aspect-square bg-[#121017] relative">
              {c.reference_image_url ? (
                <img src={c.reference_image_url} alt={c.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {c.status === 'generating' ? <Loader2 className="w-6 h-6 animate-spin text-[#4a4458]" /> : <User className="w-8 h-8 text-[#332c44]" />}
                </div>
              )}
            </div>
            <div className="p-3.5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-[#ece8de] truncate">{c.name}</span>
                  <button
                    onClick={() => onGenerateSheet(c.id)}
                    disabled={c.status === 'generating'}
                    className="shrink-0 flex items-center gap-1 text-xs font-medium text-[#c9c2e0] hover:text-white disabled:opacity-40"
                  >
                    {c.status === 'generating' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    {c.reference_image_url ? 'Redo' : 'Generate'}
                  </button>
                </div>
                <p className="text-xs text-[#8e85a5] mt-1.5 line-clamp-2 leading-relaxed">{c.description}</p>
                {c.error_message && <p className="text-xs text-red-400 mt-1">{c.error_message}</p>}
              </div>

              <div className="pt-3 mt-3 border-t border-[#292435] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setRefiningCharacter(c)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#d9a042] hover:text-[#f3bf6d] transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Refine prompt</span>
                </button>
                <span className="text-[11px] text-[#6b6579]">
                  {c.status === 'ready' ? 'Ready' : c.status === 'generating' ? 'Generating…' : 'Needs sheet'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {refiningCharacter && (
        <CharacterRefineModal
          character={refiningCharacter}
          artStylePrompt={artStylePrompt}
          isOpen={Boolean(refiningCharacter)}
          onClose={() => setRefiningCharacter(null)}
          onSave={(characterId, updatedDesc) => {
            onUpdateDescription?.(characterId, updatedDesc);
          }}
          onSaveAndGenerate={(characterId, updatedDesc) => {
            onUpdateDescription?.(characterId, updatedDesc);
            onGenerateSheet(characterId);
          }}
          hasCredits={hasCredits}
          onInsufficientCredits={onInsufficientCredits}
          onCreditsUpdated={onCreditsUpdated}
        />
      )}
    </div>
  );
}
