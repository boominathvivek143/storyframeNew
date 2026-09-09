import { BarChart3, Download, Film, LogOut, Menu as MenuIcon, Mic2, RotateCcw, Settings, Sparkles, Upload, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Story } from '../types';

export function Header({
  story,
  onExport,
  onImportFile,
  onReset,
  onOpenSettings,
  onOpenVoiceStudio,
  onOpenTitleGenerator,
  userEmail,
  onLogout,
  credits = 10,
  onOpenRecharge,
  onOpenReconciliation,
}: {
  story: Story | null;
  onExport: () => void;
  onImportFile: (file: File) => void;
  onReset: () => void;
  onOpenSettings: () => void;
  onOpenVoiceStudio: () => void;
  onOpenTitleGenerator?: () => void;
  userEmail?: string;
  onLogout?: () => void;
  credits?: number;
  onOpenRecharge?: () => void;
  onOpenReconciliation?: () => void;
}) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <header className="border-b border-[#2f2a3a] bg-[#161320]/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#d9a042] to-[#a8701f] flex items-center justify-center shrink-0">
            <Film className="w-4 h-4 text-[#1b1408]" />
          </div>
          <span className="font-semibold tracking-tight text-[#ece8de]">Storyframe</span>
          {story && (
            <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-2 border-l border-[#2f2a3a] min-w-0">
              <span className="text-sm text-[#ece8de] font-medium truncate max-w-[180px] lg:max-w-[280px]" title={story.story_title}>
                {story.story_title}
              </span>
              {onOpenTitleGenerator && (
                <button
                  onClick={onOpenTitleGenerator}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-[#d9a042] hover:text-[#f3bf6d] hover:bg-[#251f33] transition-colors shrink-0"
                  title="Generate or refine story title with AI"
                >
                  <Sparkles className="w-3 h-3" />
                  <span className="hidden md:inline">AI Title</span>
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {story && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#c9c2e0] hover:bg-[#231e2e] transition-colors"
              title="Start a new story"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New story</span>
            </button>
          )}
          <button onClick={onOpenSettings} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#c9c2e0] hover:bg-[#231e2e] transition-colors" title="Studio settings">
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Studio</span>
          </button>
          {onOpenRecharge && (
            <button
              onClick={onOpenRecharge}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                credits <= 5
                  ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 animate-pulse'
                  : 'bg-[#d9a042]/10 border border-[#d9a042]/30 text-[#f3bf6d] hover:bg-[#d9a042]/20 hover:border-[#d9a042]/50'
              }`}
              title={`You have ${credits} AI credits. Click to recharge via Razorpay.`}
            >
              <Zap className="w-3.5 h-3.5 fill-[#d9a042] text-[#d9a042]" />
              <span className="font-semibold text-[#ece8de]">{credits}</span>
              <span className="hidden md:inline text-[11px] text-[#d9a042]">Credits</span>
            </button>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#c9c2e0] hover:bg-[#231e2e] transition-colors"
              title="More options"
            >
              {isMenuOpen ? <X className="w-3.5 h-3.5" /> : <MenuIcon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Menu</span>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#1b1822] border border-[#2f2a3a] shadow-2xl py-1.5 z-50">
                {userEmail && (
                  <div className="px-3.5 py-2 border-b border-[#2f2a3a] mb-1">
                    <p className="text-[11px] text-[#6b6579]">Signed in as</p>
                    <p className="text-xs text-[#c9c2e0] truncate" title={userEmail}>{userEmail}</p>
                  </div>
                )}

                {story && (
                  <button
                    onClick={() => {
                      onOpenVoiceStudio();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#c9c2e0] hover:bg-[#251f33] transition-colors"
                  >
                    <Mic2 className="w-3.5 h-3.5" />
                    Voice studio
                  </button>
                )}

                {story && (
                  <button
                    onClick={() => {
                      onExport();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#c9c2e0] hover:bg-[#251f33] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export story as JSON
                  </button>
                )}

                <button
                  onClick={() => {
                    importInputRef.current?.click();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#c9c2e0] hover:bg-[#251f33] transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import story
                </button>

                {onOpenReconciliation && (
                  <button
                    onClick={() => {
                      onOpenReconciliation();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#cbbbe8] hover:bg-[#251f33] transition-colors"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-[#d9a042]" />
                    Ledger
                  </button>
                )}

                {onLogout && (
                  <>
                    <div className="border-t border-[#2f2a3a] my-1" />
                    <button
                      onClick={() => {
                        onLogout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#c9c2e0] hover:bg-[#251f33] transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Log out
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </header>
  );
}
