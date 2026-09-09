import { ChevronLeft, ChevronRight, Download, ExternalLink, Film, Loader2, Pause, Play, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MOOD_PRESETS } from '../data/presets';
import { SceneAnimationStyle, SceneOverlayEffect, SceneSoundEffect, Story, WatermarkPosition } from '../types';
import { boxStyle, cqw } from '../utils/captionStyle';
import { MusicController } from '../utils/musicSynth';
import { buildSceneImageStyle } from '../utils/sceneMotion';
import { ExportAbortedError, ExportProgress, exportStoryAsMp4 } from '../utils/videoExport';
import { applyNarrationPlayback, computeNarrationPlayback } from '../utils/voicePlayback';
import { SceneOverlay } from './SceneOverlay';

interface Slide {
  key: string;
  image_url?: string;
  caption: string;
  audio_url?: string;
  fallback_duration: number;
  audio_duration?: number;
  animation_style: SceneAnimationStyle;
  overlay_effect: SceneOverlayEffect;
  voice_rate?: number;
  voice_pitch?: number;
  sound_effects: SceneSoundEffect[];
}

const WATERMARK_POSITION_STYLE: Record<WatermarkPosition, React.CSSProperties> = {
  top_left: { top: '4%', left: '4%' },
  top_center: { top: '4%', left: '50%', transform: 'translateX(-50%)' },
  top_right: { top: '4%', right: '4%' },
  bottom_left: { bottom: '4%', left: '4%' },
  bottom_center: { bottom: '4%', left: '50%', transform: 'translateX(-50%)' },
  bottom_right: { bottom: '4%', right: '4%' },
  drift: { top: '4%', left: '4%' },
};

function Watermark({ story }: { story: Story }) {
  const cfg = story.watermark_config;
  if (!cfg.enabled || (cfg.type === 'text' && !cfg.text.trim()) || (cfg.type === 'image' && !cfg.image_url)) return null;

  return (
    <div
      className={cfg.position === 'drift' ? 'animate-watermark-drift' : ''}
      style={{
        position: 'absolute',
        ...WATERMARK_POSITION_STYLE[cfg.position],
        opacity: cfg.opacity,
        zIndex: 5,
        pointerEvents: 'none',
      }}
    >
      {cfg.type === 'image' && cfg.image_url ? (
        <img src={cfg.image_url} style={{ height: cqw(cfg.size * 2.2), display: 'block' }} />
      ) : (
        <span
          style={{
            fontSize: cqw(cfg.size * 2.2),
            fontWeight: 700,
            color: cfg.text_color || '#fff',
            padding: cfg.show_pill_backdrop ? `${cqw(6)} ${cqw(14)}` : undefined,
            background: cfg.show_pill_backdrop ? cfg.pill_color || 'rgba(0,0,0,0.6)' : undefined,
            borderRadius: cfg.show_pill_backdrop ? '999px' : undefined,
            whiteSpace: 'nowrap',
          }}
        >
          {cfg.text}
        </span>
      )}
    </div>
  );
}

function CaptionOverlay({ story, text, activeSeconds }: { story: Story; text: string; activeSeconds: number }) {
  const cfg = story.caption_config;
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  // Word-paced progression runs for every mode now, "static" included --
  // it still shows each visible word at full opacity with no per-word
  // highlight, but the sliding window below needs a "current word" to
  // center on regardless of animation style, or a long line would sit on
  // screen in full the whole time instead of staying short.
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (words.length === 0) return;
    setRevealedCount(1);
    const perWordMs = Math.max(120, (activeSeconds * 1000) / words.length);
    const timers = words.map((_, i) => setTimeout(() => setRevealedCount((c) => Math.max(c, i + 1)), perWordMs * i));
    return () => timers.forEach(clearTimeout);
  }, [text, activeSeconds, words.length]);

  if (!cfg.enabled || words.length === 0) return null;

  // Show only a short sliding window around the current word (a few
  // words of context before and after it) instead of the whole line --
  // long sentences otherwise sit on screen in full for their entire
  // duration, which is a lot more text than a viewer needs at once.
  const windowSize = Math.max(3, cfg.max_words_per_line || 5);
  const activeIdx = Math.min(words.length - 1, Math.max(0, revealedCount - 1));
  const before = Math.floor((windowSize - 1) / 2);
  const windowStart = Math.max(0, Math.min(words.length - Math.min(windowSize, words.length), activeIdx - before));
  const windowEnd = Math.min(words.length, windowStart + windowSize);
  const visibleWords = words.slice(windowStart, windowEnd);

  return (
    <div className="absolute left-1/2 w-[88%] text-center" style={{ top: `${cfg.position_y * 100}%`, transform: 'translate(-50%, -50%)', zIndex: 6 }}>
      <span style={boxStyle(cfg)}>
        {visibleWords.map((word, wi) => {
          const idx = windowStart + wi;
          const isRevealed = idx < revealedCount;
          const isCurrent = idx === revealedCount - 1;
          const highlight = cfg.animation_mode !== 'static' && isCurrent;
          const isBouncing = highlight && cfg.animation_mode === 'bounce';
          return (
            <span
              // Bouncing words get a fresh key so the browser remounts
              // this one span each time it becomes current, restarting
              // the caption-bounce keyframe from scratch -- a plain CSS
              // transition (used for pop/karaoke below) can't replay a
              // spring-with-overshoot curve, only ease toward a target.
              key={isBouncing ? `${idx}-bounce` : idx}
              style={{
                opacity: isRevealed ? 1 : cfg.animation_mode === 'static' ? 1 : 0.35,
                color: highlight && cfg.highlight_style === 'color' ? cfg.highlight_color : undefined,
                textShadow: highlight && cfg.highlight_style === 'glow' ? `0 0 ${cqw(10)} ${cfg.highlight_color}` : undefined,
                display: 'inline-block',
                transform: isBouncing ? undefined : highlight && cfg.animation_mode === 'pop' ? 'scale(1.14)' : 'scale(1)',
                animationName: isBouncing ? 'caption-bounce' : undefined,
                animationDuration: isBouncing ? '0.5s' : undefined,
                animationTimingFunction: isBouncing ? 'ease-out' : undefined,
                animationFillMode: isBouncing ? 'both' : undefined,
                transition: 'opacity 0.15s ease, transform 0.15s ease, color 0.15s ease',
                marginRight: cqw(8),
              }}
            >
              {highlight && (cfg.highlight_style === 'badge' || cfg.highlight_style === 'box') ? (
                // A word on its own solid chip doesn't want the caption's
                // outline stroke -- at any real stroke width, black text
                // (for contrast on a bright chip) plus a black stroke of
                // similar weight fuses into a solid blob instead of
                // legible letters, so it's explicitly reset to none here.
                <span style={{ background: cfg.highlight_color, color: '#111', borderRadius: cqw(6), padding: `0 ${cqw(6)}`, WebkitTextStroke: '0px transparent' }}>{word}</span>
              ) : (
                word
              )}
            </span>
          );
        })}
      </span>
    </div>
  );
}

export function SlideshowPlayer({
  story,
  onApproveAll,
  onNavigateToScenes,
}: {
  story: Story;
  onApproveAll?: () => void;
  onNavigateToScenes?: () => void;
}) {
  const slides: Slide[] = useMemo(() => {
    const sceneSlides: Slide[] = story.scenes
      .filter((s) => s.status === 'approved' && s.include_in_final)
      .sort((a, b) => a.scene_number - b.scene_number)
      .map((s) => ({
        key: s.id,
        image_url: s.image_url,
        caption: s.caption_text || s.voice_line,
        audio_url: s.narration_audio_url,
        fallback_duration: s.duration || 4,
        audio_duration: s.audio_duration,
        animation_style: s.animation_style,
        overlay_effect: s.overlay_effect,
        voice_rate: s.voice_rate ?? story.voice_rate,
        voice_pitch: s.voice_pitch ?? story.voice_pitch,
        sound_effects: s.sound_effects,
      }));

    if (story.end_card.enabled) {
      sceneSlides.push({
        key: 'end-card',
        image_url: story.end_card.image_url || sceneSlides[sceneSlides.length - 1]?.image_url,
        caption: story.end_card.cta_text || story.end_card.voice_line,
        audio_url: story.end_card.narration_audio_url,
        fallback_duration: 4,
        audio_duration: story.end_card.audio_duration,
        animation_style: 'zoom_in',
        overlay_effect: 'none',
        sound_effects: [],
        voice_rate: story.voice_rate,
        voice_pitch: story.voice_pitch,
      });
    }
    return sceneSlides;
  }, [story]);

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const musicRef = useRef<MusicController | null>(null);

  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [rawWebmUrl, setRawWebmUrl] = useState<string | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Revoke the previous download's object URL whenever a new one is
    // created or this player unmounts, so exported MP4 blobs don't leak.
    return () => {
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      if (rawWebmUrl) URL.revokeObjectURL(rawWebmUrl);
    };
  }, [exportUrl, rawWebmUrl]);

  const startExport = async () => {
    setIsPlaying(false);
    if (exportUrl) {
      URL.revokeObjectURL(exportUrl);
      setExportUrl(null);
    }
    if (rawWebmUrl) {
      URL.revokeObjectURL(rawWebmUrl);
      setRawWebmUrl(null);
    }
    setExportError(null);
    setExportProgress({ phase: 'loading', sceneIndex: 0, sceneCount: slides.length, message: 'Preparing export...' });
    const controller = new AbortController();
    exportAbortRef.current = controller;
    try {
      const mp4Blob = await exportStoryAsMp4(story, setExportProgress, controller.signal);
      setExportUrl(URL.createObjectURL(mp4Blob));
    } catch (err: any) {
      if (!(err instanceof ExportAbortedError)) {
        setExportError(err?.message || 'Video export failed for an unknown reason.');
        if (err?.webmBlob instanceof Blob) {
          setRawWebmUrl(URL.createObjectURL(err.webmBlob));
        }
      }
    } finally {
      exportAbortRef.current = null;
      setExportProgress(null);
    }
  };

  const safeFilename = useMemo(() => {
    const raw = (story.story_title || 'story').trim().replace(/[^a-zA-Z0-9_\-]+/g, '_').replace(/^_+|_+$/g, '');
    return `${raw || 'story'}.mp4`;
  }, [story.story_title]);

  const handleDownloadMp4 = (e?: React.MouseEvent) => {
    if (!exportUrl) return;
    try {
      const a = document.createElement('a');
      a.href = exportUrl;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
      if (e) e.preventDefault();
    } catch {
      // Allow standard link fallback
    }
  };

  const cancelExport = () => exportAbortRef.current?.abort();

  const current = slides[index];
  const mood = MOOD_PRESETS.find((m) => m.id === story.mood) || MOOD_PRESETS[0];

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(slides.length - 1, i)));
  const advance = () => {
    setIndex((i) => (i + 1 < slides.length ? i + 1 : i));
    if (index + 1 >= slides.length) setIsPlaying(false);
  };

  // Background music: starts the first time playback starts, stops on
  // unmount. Volume/track changes apply live without restarting playback.
  useEffect(() => {
    if (!musicRef.current) musicRef.current = new MusicController();
    return () => musicRef.current?.stop();
  }, []);

  useEffect(() => {
    if (isPlaying && story.music_track !== 'none') {
      musicRef.current?.play(story.music_track, story.music_volume, story.custom_music_url);
    } else if (!isPlaying) {
      musicRef.current?.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, story.music_track]);

  useEffect(() => {
    musicRef.current?.setVolume(story.music_volume);
  }, [story.music_volume]);

  useEffect(() => {
    // Always routes through here instead of setTimeout directly, so a
    // later call always wins over an earlier one -- without this, a
    // failed play() scheduling its own fallback *in addition to* the
    // safety-net timer below (rather than replacing it) would leave two
    // timers pending and call advance() twice, silently skipping a slide.
    const scheduleAdvance = (ms: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(advance, ms);
    };

    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isPlaying || !current) return;

    // Sound effects: fire-and-forget plain <audio> elements (not JSX --
    // there can be any number of them per scene), started together with
    // narration and torn down whenever the scene changes or playback stops.
    const sfxElements = current.sound_effects
      .filter((sfx) => sfx.status === 'ready' && sfx.audio_url)
      .map((sfx) => {
        const el = new Audio(sfx.audio_url);
        el.volume = sfx.volume;
        el.play().catch(() => {});
        return el;
      });

    if (current.audio_url && audioRef.current) {
      const rate = applyNarrationPlayback(audioRef.current, current.voice_rate, current.voice_pitch);
      // audio_duration was measured at normal (1x) speed -- playing faster
      // or slower shrinks or stretches how long the clip actually takes,
      // so the hold time has to scale with it too or the safety net below
      // fires at the wrong moment again.
      const durationMs = ((current.audio_duration || current.fallback_duration || 4) * 1000) / rate;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay blocked, a decode error, anything else -- don't strand
        // the slideshow on a silently-failed play() call.
        scheduleAdvance(durationMs);
      });
      // Safety net: even if play() resolves but 'ended'/'error' never
      // fire for some reason (a stalled/hung clip), still move on a few
      // seconds past the expected length rather than hanging forever.
      scheduleAdvance(durationMs + 4000);
    } else {
      scheduleAdvance(current.fallback_duration * 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      sfxElements.forEach((el) => el.pause());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isPlaying]);

  useEffect(() => {
    if (!isPlaying) audioRef.current?.pause();
  }, [isPlaying]);

  if (slides.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center text-[#6b6579] space-y-4">
        <p>Approve at least one scene to preview the slideshow.</p>
        <div className="flex items-center justify-center gap-3">
          {onApproveAll && (
            <button
              onClick={onApproveAll}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766] transition-colors"
            >
              Approve all scenes
            </button>
          )}
          {onNavigateToScenes && (
            <button
              onClick={onNavigateToScenes}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-[#3b324d] text-[#c9c2e0] hover:bg-[#252033] transition-colors"
            >
              Back to scenes
            </button>
          )}
        </div>
      </div>
    );
  }

  // Mirrors the timer effect above: the progress bar and caption
  // word-reveal timing both need the *effective* (rate-adjusted) length,
  // not the clip's normal-speed duration, to stay in sync with playback.
  const currentPlaybackRate = current.audio_url ? computeNarrationPlayback(current.voice_rate, current.voice_pitch).playbackRate : 1;
  const activeSeconds = ((current.audio_duration || current.fallback_duration || 4) as number) / currentPlaybackRate;

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-6">
      <div
        className="relative bg-black rounded-2xl overflow-hidden"
        style={{ aspectRatio: story.dimensions.width / story.dimensions.height, containerType: 'inline-size' } as React.CSSProperties}
      >
        {current.image_url && (
          <img
            src={current.image_url}
            className="w-full h-full object-cover"
            style={buildSceneImageStyle(mood.filter, current.animation_style, activeSeconds, isPlaying)}
          />
        )}

        {isPlaying && <SceneOverlay effect={current.overlay_effect} sceneKey={current.key} />}

        <CaptionOverlay story={story} text={current.caption} activeSeconds={activeSeconds} />
        <Watermark story={story} />

        <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
          {slides.map((s, i) => (
            <div key={s.key} className="flex-1 h-0.5 rounded-full bg-white/25 overflow-hidden">
              <div
                className={`h-full bg-white ${i < index ? 'w-full' : i === index && isPlaying ? 'w-full transition-all ease-linear' : 'w-0'}`}
                style={i === index && isPlaying ? { transitionDuration: `${activeSeconds}s` } : undefined}
              />
            </div>
          ))}
        </div>

        <button onClick={() => goTo(index - 1)} className="absolute left-0 top-0 bottom-0 w-1/4 z-10" aria-label="Previous scene" />
        <button onClick={() => goTo(index + 1)} className="absolute right-0 top-0 bottom-0 w-1/4 z-10" aria-label="Next scene" />

        {current.audio_url && (
          <audio
            ref={audioRef}
            src={current.audio_url}
            onEnded={advance}
            onError={advance}
            onPlay={() => musicRef.current?.duck(true)}
            onPause={() => musicRef.current?.duck(false)}
          />
        )}
      </div>

      <div className="flex items-center justify-center gap-4 mt-4">
        <button onClick={() => goTo(index - 1)} disabled={index === 0} className="p-2 rounded-full bg-[#1b1822] text-[#c9c2e0] disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => setIsPlaying((p) => !p)} className="w-11 h-11 rounded-full bg-[#d9a042] text-[#1b1408] flex items-center justify-center hover:bg-[#eab766]">
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button onClick={() => goTo(index + 1)} disabled={index === slides.length - 1} className="p-2 rounded-full bg-[#1b1822] text-[#c9c2e0] disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <p className="text-center text-xs text-[#6b6579] mt-2 font-mono">
        {index + 1} / {slides.length}
      </p>

      <div className="mt-4 border-t border-[#2a2635] pt-4">
        {exportProgress ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#c9c2e0]">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {exportProgress.message}
              </span>
              <button onClick={cancelExport} className="text-[#6b6579] hover:text-[#c9c2e0]" aria-label="Cancel export">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="h-1.5 rounded-full bg-[#1b1822] overflow-hidden">
              <div
                className="h-full bg-[#d9a042] transition-all"
                style={{
                  width:
                    exportProgress.phase === 'transcoding' || exportProgress.phase === 'done'
                      ? '100%'
                      : `${Math.round((exportProgress.sceneIndex / Math.max(1, exportProgress.sceneCount)) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : exportUrl ? (
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden border border-[#2b2638] bg-[#0c0a10]">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#171420] text-xs text-[#a59ebc] border-b border-[#242030]">
                <span className="flex items-center gap-1.5 font-medium text-[#fcd385]">
                  <Film className="w-3.5 h-3.5" />
                  MP4 Preview (H.264 / AAC)
                </span>
                <a
                  href={exportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-[#fcd385] transition-colors"
                  title="Open video in new tab"
                >
                  <ExternalLink className="w-3 h-3" />
                  New Tab
                </a>
              </div>
              <video
                src={exportUrl}
                controls
                playsInline
                className="w-full max-h-48 bg-black object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <a
                href={exportUrl}
                download={safeFilename}
                onClick={handleDownloadMp4}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#d9a042] text-[#1b1408] text-sm font-semibold hover:bg-[#eab766] transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download MP4
              </a>
              <button
                onClick={startExport}
                className="px-3 py-2.5 rounded-lg bg-[#1b1822] text-[#c9c2e0] text-sm hover:bg-[#242030] transition-colors"
              >
                Re-export
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={startExport}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#1b1822] text-[#c9c2e0] text-sm font-medium hover:bg-[#242030]"
          >
            <Download className="w-4 h-4" />
            Export MP4
          </button>
        )}
        {exportError && (
          <div className="mt-2 p-2.5 rounded-lg bg-[#241718] border border-[#522325] text-xs text-[#f2867a] space-y-2">
            <p>{exportError}</p>
            {rawWebmUrl && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#522325]/60">
                <span className="text-[#c9c2e0]">Canvas video captured:</span>
                <a
                  href={rawWebmUrl}
                  download={`${story.story_title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'story'}.webm`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#352528] hover:bg-[#462e33] text-[#fcd385] text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download WebM
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
