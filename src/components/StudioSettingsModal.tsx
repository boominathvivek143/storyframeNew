import { BarChart3, CheckCircle2, Image as ImageIcon, Info, Music2, Palette, User, Type as TypeIcon, Wand2, X, Zap } from 'lucide-react';
import { useRef, useState } from 'react';
import { CAPTION_PRESETS, DEFAULT_CAPTION_CONFIG, DEFAULT_WATERMARK_CONFIG } from '../data/captionPresets';
import { MOOD_PRESETS, MUSIC_TRACKS } from '../data/presets';
import { CaptionAnimationMode, CaptionConfig, MoodPreset, Story, WatermarkConfig, WatermarkPosition } from '../types';
import { previewBoxStyle } from '../utils/captionStyle';

type Tab = 'account' | 'captions' | 'watermark' | 'mood' | 'music';

const WATERMARK_POSITIONS: { id: WatermarkPosition; label: string }[] = [
  { id: 'top_left', label: 'Top left' },
  { id: 'top_center', label: 'Top center' },
  { id: 'top_right', label: 'Top right' },
  { id: 'bottom_left', label: 'Bottom left' },
  { id: 'bottom_center', label: 'Bottom center' },
  { id: 'bottom_right', label: 'Bottom right' },
  { id: 'drift', label: 'Drift' },
];

export function StudioSettingsModal({
  story,
  onPatch,
  onClose,
  initialTab = 'account',
  userEmail,
  credits = 10,
  onOpenRecharge,
  onOpenReconciliation,
  onLogout,
}: {
  story: Story | null;
  onPatch?: (patch: Partial<Story>) => void;
  onClose: () => void;
  initialTab?: Tab;
  userEmail?: string;
  credits?: number;
  onOpenRecharge?: () => void;
  onOpenReconciliation?: () => void;
  onLogout?: () => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [localCaptionConfig, setLocalCaptionConfig] = useState<CaptionConfig>(story?.caption_config || DEFAULT_CAPTION_CONFIG);
  const [localWatermarkConfig, setLocalWatermarkConfig] = useState<WatermarkConfig>(story?.watermark_config || DEFAULT_WATERMARK_CONFIG);
  const [localMood, setLocalMood] = useState<MoodPreset>(story?.mood || 'natural');
  const [localMusicTrack, setLocalMusicTrack] = useState<Story['music_track']>(story?.music_track || 'none');
  const [localMusicVolume, setLocalMusicVolume] = useState<number>(story?.music_volume ?? 0.18);
  const [localCustomMusicUrl, setLocalCustomMusicUrl] = useState<string>(story?.custom_music_url || '');

  const handlePatch = (patch: Partial<Story>) => {
    if (patch.caption_config) setLocalCaptionConfig(patch.caption_config);
    if (patch.watermark_config) setLocalWatermarkConfig(patch.watermark_config);
    if (patch.mood) setLocalMood(patch.mood);
    if (patch.music_track) setLocalMusicTrack(patch.music_track);
    if (patch.music_volume !== undefined) setLocalMusicVolume(patch.music_volume);
    if (patch.custom_music_url !== undefined) setLocalCustomMusicUrl(patch.custom_music_url);
    if (onPatch) onPatch(patch);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1b1822] border border-[#2f2a3a] rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f2a3a] shrink-0">
          <div>
            <h2 className="font-semibold text-[#ece8de]">Studio settings</h2>
            {!story && (
              <p className="text-[11px] text-[#8a8399] mt-0.5">
                Your account, credits, and studio defaults
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-[#6b6579] hover:text-[#ece8de]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-5 pt-3 border-b border-[#2f2a3a] shrink-0 overflow-x-auto">
          {([
            { id: 'account', label: 'Account', icon: User },
            { id: 'captions', label: 'Captions', icon: TypeIcon },
            { id: 'watermark', label: 'Watermark', icon: ImageIcon },
            { id: 'mood', label: 'Mood', icon: Palette },
            { id: 'music', label: 'Music', icon: Music2 },
          ] as { id: Tab; label: string; icon: any }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors shrink-0 ${
                tab === t.id ? 'border-[#d9a042] text-[#ece8de]' : 'border-transparent text-[#6b6579] hover:text-[#c9c2e0]'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {tab === 'account' && (
            <AccountTab
              story={story}
              onPatch={handlePatch}
              userEmail={userEmail}
              credits={credits}
              onOpenRecharge={onOpenRecharge}
              onOpenReconciliation={onOpenReconciliation}
              onLogout={onLogout}
            />
          )}
          {tab === 'captions' && (
            <div className="space-y-4">
              {!story && (
                <div className="p-3 rounded-lg bg-[#221c2e] border border-[#3b324d] text-xs text-[#c9c2e0] flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#d9a042] shrink-0" />
                  <span>Previewing caption presets. These will style speech on-screen when your story runs.</span>
                </div>
              )}
              <CaptionsTab config={story?.caption_config || localCaptionConfig} onChange={(caption_config) => handlePatch({ caption_config })} />
            </div>
          )}
          {tab === 'watermark' && (
            <div className="space-y-4">
              {!story && (
                <div className="p-3 rounded-lg bg-[#221c2e] border border-[#3b324d] text-xs text-[#c9c2e0] flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#d9a042] shrink-0" />
                  <span>Branding and watermarks appear on scene images and final video exports.</span>
                </div>
              )}
              <WatermarkTab config={story?.watermark_config || localWatermarkConfig} onChange={(watermark_config) => handlePatch({ watermark_config })} />
            </div>
          )}
          {tab === 'mood' && (
            <div className="space-y-4">
              {!story && (
                <div className="p-3 rounded-lg bg-[#221c2e] border border-[#3b324d] text-xs text-[#c9c2e0] flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#d9a042] shrink-0" />
                  <span>Mood presets apply cinematic color grading across all scene cards.</span>
                </div>
              )}
              <MoodTab value={story?.mood || localMood} onChange={(mood) => handlePatch({ mood })} />
            </div>
          )}
          {tab === 'music' && (
            <div className="space-y-4">
              {!story && (
                <div className="p-3 rounded-lg bg-[#221c2e] border border-[#3b324d] text-xs text-[#c9c2e0] flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#d9a042] shrink-0" />
                  <span>Background music will play under your scene narration with automatic audio ducking.</span>
                </div>
              )}
              <MusicTab
                track={story?.music_track || localMusicTrack}
                volume={story?.music_volume ?? localMusicVolume}
                customUrl={story?.custom_music_url || localCustomMusicUrl}
                onChange={(patch) => handlePatch(patch)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------

function AccountTab({
  story,
  onPatch,
  userEmail,
  credits = 10,
  onOpenRecharge,
  onOpenReconciliation,
  onLogout,
}: {
  story: Story | null;
  onPatch: (patch: Partial<Story>) => void;
  userEmail?: string;
  credits?: number;
  onOpenRecharge?: () => void;
  onOpenReconciliation?: () => void;
  onLogout?: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="p-3.5 rounded-xl bg-[#13101a] border border-[#2a2336]">
        <h3 className="text-sm font-semibold text-[#ece8de] mb-1">Signed in</h3>
        <p className="text-xs text-[#8a8399]">{userEmail}</p>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 text-xs font-medium text-[#c9c2e0] hover:text-[#ece8de] px-3 py-1.5 rounded-lg bg-[#2a2437] hover:bg-[#332c44] transition-colors"
          >
            Log out
          </button>
        )}
      </section>

      {/* AI Generation Credits & Razorpay Recharge */}
      <section className="p-3.5 rounded-xl bg-[#13101a] border border-[#2a2336]">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-sm font-semibold text-[#ece8de] flex items-center gap-2">
            <Zap className="w-4 h-4 fill-[#d9a042] text-[#d9a042]" />
            <span>AI Generation Credits</span>
            <span className="text-[11px] font-semibold text-[#d9a042] bg-[#d9a042]/10 border border-[#d9a042]/30 px-2 py-0.5 rounded-full">
              {credits} Credits Available
            </span>
          </h3>
          {onOpenRecharge && (
            <button
              type="button"
              onClick={onOpenRecharge}
              className="text-xs font-semibold text-[#1b1408] bg-[#d9a042] hover:bg-[#e6b356] px-3 py-1.5 rounded-lg shadow transition-all cursor-pointer"
            >
              Recharge via Razorpay
            </button>
          )}
        </div>
        <p className="text-xs text-[#8a8399] leading-relaxed">
          1 credit = 1 scene or character visual with zero prompt setup. Standard recharge is ₹100 for 50 credits via Razorpay UPI / Cards.
        </p>
        {onOpenReconciliation && (
          <div className="mt-3 pt-2.5 border-t border-[#261f31] flex items-center justify-between">
            <span className="text-xs text-[#8a8399] flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[#d9a042]" />
              <span>Owner Financial Ledger:</span>
            </span>
            <button
              type="button"
              onClick={onOpenReconciliation}
              className="text-xs font-semibold text-[#d9a042] hover:text-[#f3bf6d] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Check API Cost vs Recharge Ledger ↗</span>
            </button>
          </div>
        )}
      </section>

      {story && (
        <section className="pt-4 border-t border-[#2f2a3a]">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm font-medium text-[#ece8de]">Auto-approve scenes</div>
              <div className="text-xs text-[#6b6579]">Skip manual review and chain straight through generation.</div>
            </div>
            <input type="checkbox" checked={story.auto_approve} onChange={(e) => onPatch({ auto_approve: e.target.checked })} className="w-4 h-4 accent-[#d9a042]" />
          </label>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------

function CaptionsTab({ config, onChange }: { config: CaptionConfig; onChange: (c: CaptionConfig) => void }) {
  return (
    <div className="space-y-5">
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm font-medium text-[#ece8de]">Show captions</span>
        <input type="checkbox" checked={config.enabled} onChange={(e) => onChange({ ...config, enabled: e.target.checked })} className="w-4 h-4 accent-[#d9a042]" />
      </label>

      <div>
        <p className="text-xs font-medium text-[#8a8399] mb-2">Style preset</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
          {CAPTION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onChange({ ...config, ...preset.config, enabled: config.enabled })}
              title={preset.tagline}
              className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 bg-[#0d0b10] ${
                config.preset_id === preset.id ? 'border-[#d9a042]' : 'border-[#2f2a3a] hover:border-[#4a4458]'
              }`}
            >
              <div className="h-9 flex items-center justify-center overflow-hidden">
                <span style={previewBoxStyle({ ...preset.config, enabled: true } as CaptionConfig)}>
                  {preset.previewWords.map((w, i) => (
                    <span
                      key={i}
                      style={
                        w.isBadge
                          ? { background: w.badgeBg, color: '#111', borderRadius: 4, padding: '0 4px', WebkitTextStroke: '0px transparent' }
                          : w.isHighlight
                          ? { color: preset.config.highlight_color }
                          : undefined
                      }
                    >
                      {w.text}
                      {i < preset.previewWords.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                </span>
              </div>
              <span className="text-[10px] font-medium text-[#8a8399] truncate w-full text-center">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-[#8a8399] mb-2">Reveal style</p>
        <div className="flex gap-1.5">
          {(['static', 'karaoke', 'pop', 'bounce'] as CaptionAnimationMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onChange({ ...config, animation_mode: mode })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize ${
                config.animation_mode === mode ? 'bg-[#d9a042] border-[#d9a042] text-[#1b1408]' : 'border-[#2f2a3a] text-[#9d97ab]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-[#8a8399] mb-1">
          Vertical position <span className="font-mono">{Math.round(config.position_y * 100)}%</span>
        </p>
        <input
          type="range"
          min={0.1}
          max={0.9}
          step={0.02}
          value={config.position_y}
          onChange={(e) => onChange({ ...config, position_y: Number(e.target.value) })}
          className="w-full accent-[#d9a042]"
        />
      </div>

      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm text-[#c9c2e0]">Uppercase text</span>
        <input
          type="checkbox"
          checked={config.text_case === 'uppercase'}
          onChange={(e) => onChange({ ...config, text_case: e.target.checked ? 'uppercase' : 'normal' })}
          className="w-4 h-4 accent-[#d9a042]"
        />
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------

function WatermarkTab({ config, onChange }: { config: WatermarkConfig; onChange: (c: WatermarkConfig) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ ...config, type: 'image', image_url: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm font-medium text-[#ece8de]">Show watermark</span>
        <input type="checkbox" checked={config.enabled} onChange={(e) => onChange({ ...config, enabled: e.target.checked })} className="w-4 h-4 accent-[#d9a042]" />
      </label>

      <div className="flex gap-1.5">
        {(['text', 'image'] as const).map((t) => (
          <button
            key={t}
            onClick={() => onChange({ ...config, type: t })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize ${config.type === t ? 'bg-[#d9a042] border-[#d9a042] text-[#1b1408]' : 'border-[#2f2a3a] text-[#9d97ab]'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {config.type === 'text' ? (
        <div>
          <label className="text-xs font-medium text-[#8a8399] block mb-1">Text</label>
          <input
            value={config.text}
            onChange={(e) => onChange({ ...config, text: e.target.value })}
            placeholder="@yourname"
            className="w-full bg-[#121017] border border-[#2f2a3a] rounded-lg px-3 py-2 text-sm text-[#ece8de] outline-none focus:border-[#d9a042]"
          />
        </div>
      ) : (
        <div>
          <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-lg text-xs font-medium bg-[#2a2437] text-[#c9c2e0] hover:bg-[#332c44]">
            {config.image_url ? 'Change logo image' : 'Upload logo image'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0])} />
          {config.image_url && <img src={config.image_url} className="h-10 mt-2 rounded" />}
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-[#8a8399] mb-2">Position</p>
        <div className="grid grid-cols-4 gap-1.5">
          {WATERMARK_POSITIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => onChange({ ...config, position: p.id })}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-medium border ${config.position === p.id ? 'bg-[#d9a042] border-[#d9a042] text-[#1b1408]' : 'border-[#2f2a3a] text-[#9d97ab]'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-[#8a8399] mb-1">
          Opacity <span className="font-mono">{Math.round(config.opacity * 100)}%</span>
        </p>
        <input type="range" min={0.1} max={1} step={0.05} value={config.opacity} onChange={(e) => onChange({ ...config, opacity: Number(e.target.value) })} className="w-full accent-[#d9a042]" />
      </div>

      <div>
        <p className="text-xs font-medium text-[#8a8399] mb-1">
          Size <span className="font-mono">{config.size}px</span>
        </p>
        <input type="range" min={12} max={64} step={2} value={config.size} onChange={(e) => onChange({ ...config, size: Number(e.target.value) })} className="w-full accent-[#d9a042]" />
      </div>

      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm text-[#c9c2e0]">Pill backdrop</span>
        <input type="checkbox" checked={config.show_pill_backdrop} onChange={(e) => onChange({ ...config, show_pill_backdrop: e.target.checked })} className="w-4 h-4 accent-[#d9a042]" />
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------

function MoodTab({ value, onChange }: { value: MoodPreset; onChange: (m: MoodPreset) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {MOOD_PRESETS.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`p-3 rounded-xl border text-left ${value === m.id ? 'border-[#d9a042] bg-[#2a2015]' : 'border-[#2f2a3a] bg-[#121017] hover:border-[#4a4458]'}`}
        >
          <div className="h-14 rounded-lg mb-2 bg-gradient-to-br from-[#6b4a2f] via-[#8a6a4a] to-[#3f5c56]" style={{ filter: m.filter }} />
          <div className="text-sm font-medium text-[#ece8de] flex items-center gap-1.5">
            {m.label}
            {value === m.id && <Wand2 className="w-3 h-3 text-[#d9a042]" />}
          </div>
          <div className="text-[11px] text-[#6b6579] mt-0.5">{m.description}</div>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------

function MusicTab({
  track,
  volume,
  customUrl,
  onChange,
}: {
  track: Story['music_track'];
  volume: number;
  customUrl?: string;
  onChange: (patch: Partial<Story>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {MUSIC_TRACKS.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange({ music_track: t.id })}
            className={`w-full p-3 rounded-xl border text-left flex items-center justify-between ${
              track === t.id ? 'border-[#d9a042] bg-[#2a2015]' : 'border-[#2f2a3a] bg-[#121017] hover:border-[#4a4458]'
            }`}
          >
            <div>
              <div className="text-sm font-medium text-[#ece8de]">{t.label}</div>
              <div className="text-[11px] text-[#6b6579]">{t.description}</div>
            </div>
            {track === t.id && <CheckCircle2 className="w-4 h-4 text-[#d9a042]" />}
          </button>
        ))}
      </div>

      {track === 'custom' && (
        <input
          value={customUrl || ''}
          onChange={(e) => onChange({ custom_music_url: e.target.value })}
          placeholder="https://…/your-track.mp3"
          className="w-full bg-[#121017] border border-[#2f2a3a] rounded-lg px-3 py-2 text-sm text-[#ece8de] outline-none focus:border-[#d9a042]"
        />
      )}

      {track !== 'none' && (
        <div>
          <p className="text-xs font-medium text-[#8a8399] mb-1">
            Volume <span className="font-mono">{Math.round(volume * 100)}%</span> <span className="text-[#6b6579]">· auto-ducks under narration</span>
          </p>
          <input type="range" min={0} max={0.6} step={0.02} value={volume} onChange={(e) => onChange({ music_volume: Number(e.target.value) })} className="w-full accent-[#d9a042]" />
        </div>
      )}
    </div>
  );
}
