import { MOOD_PRESETS } from '../data/presets';
import { Scene, SceneAnimationStyle, SceneOverlayEffect, SceneSoundEffect, Story } from '../types';
import { MusicController } from './musicSynth';
import { computeMotionTransform } from './videoMotion';
import { drawCaption } from './videoCaptionRenderer';
import { createOverlayParticles, drawOverlayFrame, drawWatermark } from './videoOverlayRenderer';
import { applyNarrationPlayback } from './voicePlayback';

// Frames per second for the captured canvas stream. 30 is plenty smooth for
// Ken Burns-style motion and keeps encode time/file size reasonable.
const FPS = 30;

export interface ExportSlide {
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

// Mirrors the `slides` useMemo in SlideshowPlayer.tsx exactly -- export
// must render the same sequence the preview plays.
export function buildExportSlides(story: Story): ExportSlide[] {
  const sceneSlides: ExportSlide[] = story.scenes
    .filter((s: Scene) => s.status === 'approved' && s.include_in_final)
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
      voice_rate: story.voice_rate,
      voice_pitch: story.voice_pitch,
      sound_effects: [],
    });
  }
  return sceneSlides;
}

export type ExportPhase = 'loading' | 'recording' | 'transcoding' | 'done';

export interface ExportProgress {
  phase: ExportPhase;
  sceneIndex: number;
  sceneCount: number;
  message: string;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // missing/broken image -> render a black frame instead of aborting the whole export
    img.src = src;
  });
}

// Deterministic string -> uint32 hash (FNV-1a) so a scene's overlay
// particle layout is stable across the recording's repeated frames without
// needing any persisted state -- same reasoning as createOverlayParticles'
// own mulberry32 seeding.
function hashSeed(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Same math as CSS `object-fit: cover`: scale the image up just enough
// that it fills the box on both axes, then center the overflow.
function coverRect(imgW: number, imgH: number, boxW: number, boxH: number) {
  const scale = Math.max(boxW / imgW, boxH / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  return { dx: (boxW - dw) / 2, dy: (boxH - dh) / 2, dw, dh };
}

function drawSceneImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  moodFilter: string,
  style: SceneAnimationStyle,
  progress: number
) {
  ctx.save();
  ctx.filter = moodFilter;
  const motion = computeMotionTransform(style, progress);
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  // Mirrors CSS `transform: scale(s) rotate(deg) translate(tx%, ty%)` on an
  // object-cover-filled element with the default center transform-origin:
  // translate first (canvas composes later calls as applying to the point
  // first), then rotate, then scale, all about the box center.
  ctx.translate(cx, cy);
  ctx.scale(motion.scale, motion.scale);
  ctx.rotate(motion.rotate);
  ctx.translate(motion.tx * canvasWidth, motion.ty * canvasHeight);
  ctx.translate(-cx, -cy);
  const { dx, dy, dw, dh } = coverRect(img.naturalWidth, img.naturalHeight, canvasWidth, canvasHeight);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function pickMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];
  return candidates.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || '';
}

export class ExportAbortedError extends Error {
  constructor() {
    super('Export cancelled');
    this.name = 'ExportAbortedError';
  }
}

export async function exportStoryAsMp4(story: Story, onProgress: (p: ExportProgress) => void, signal?: AbortSignal): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('This browser does not support recording video (MediaRecorder API unavailable). Try a recent Chrome, Edge, or Firefox.');
  }

  const slides = buildExportSlides(story);
  if (slides.length === 0) {
    throw new Error('Approve at least one scene before exporting.');
  }
  const checkAborted = () => {
    if (signal?.aborted) throw new ExportAbortedError();
  };

  onProgress({ phase: 'loading', sceneIndex: 0, sceneCount: slides.length, message: 'Loading images...' });

  const images = new Map<string, HTMLImageElement | null>();
  for (const slide of slides) {
    images.set(slide.key, slide.image_url ? await loadImage(slide.image_url) : null);
  }
  checkAborted();

  const watermarkCfg = story.watermark_config;
  const watermarkImage = watermarkCfg.enabled && watermarkCfg.type === 'image' && watermarkCfg.image_url ? await loadImage(watermarkCfg.image_url) : null;
  checkAborted();

  const canvas = document.createElement('canvas');
  canvas.width = story.dimensions.width;
  canvas.height = story.dimensions.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create a canvas rendering context for export.');

  const mood = MOOD_PRESETS.find((m) => m.id === story.mood) || MOOD_PRESETS[0];

  // Audio graph: narration and music both route ONLY into the recording
  // destination (never ctx.destination/speakers) -- export renders the
  // whole story in a silent hidden pass rather than playing it audibly,
  // since that's an implementation detail of how the capture happens.
  const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx: AudioContext = new AudioCtor();
  if (audioCtx.state === 'suspended') await audioCtx.resume().catch(() => {});
  const destination = audioCtx.createMediaStreamDestination();

  const narrationEl = new Audio();
  narrationEl.crossOrigin = 'anonymous';
  const narrationSource = audioCtx.createMediaElementSource(narrationEl);
  narrationSource.connect(destination);

  const musicController = story.music_track !== 'none' ? new MusicController(audioCtx, destination) : null;

  const videoStream = canvas.captureStream(FPS);
  const combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...destination.stream.getAudioTracks()]);
  const mimeType = pickMimeType();
  // 2.5 Mbps is crisp for high-res animated storyboards and keeps 1-minute videos ~17MB
  const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType, videoBitsPerSecond: 2_500_000 } : undefined);

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  const cleanup = async () => {
    musicController?.stop();
    narrationEl.pause();
    try {
      narrationSource.disconnect();
    } catch {
      /* already disconnected */
    }
    await audioCtx.close().catch(() => {});
  };

  try {
    recorder.start(250);
    if (musicController) musicController.play(story.music_track, story.music_volume, story.custom_music_url);

    const exportStart = performance.now();

    for (let i = 0; i < slides.length; i++) {
      checkAborted();
      const slide = slides[i];
      onProgress({ phase: 'recording', sceneIndex: i, sceneCount: slides.length, message: `Rendering scene ${i + 1} of ${slides.length}...` });

      const img = images.get(slide.key) || null;
      const particles = createOverlayParticles(slide.overlay_effect, hashSeed(slide.key));
      let rate = 1;

      if (slide.audio_url) {
        narrationEl.src = slide.audio_url;
        narrationEl.currentTime = 0;
        // audio_duration was measured at normal (1x) speed -- scale the
        // hold time below by this same rate, or the recording either cuts
        // narration off or lingers on silence once it's sped up/slowed down.
        rate = applyNarrationPlayback(narrationEl, slide.voice_rate, slide.voice_pitch);
        musicController?.duck(true);
        await narrationEl.play().catch(() => {
          // Autoplay/decode failure -- keep going on the visual timer alone.
        });
      } else {
        musicController?.duck(false);
      }

      const durationMs = Math.max(((slide.audio_duration || slide.fallback_duration || 4) * 1000) / rate, 500);

      // Sound effects: each gets its own <audio> + MediaElementAudioSourceNode
      // routed into the same recording destination as narration/music --
      // created fresh per scene (audio_url differs scene to scene) and torn
      // down once this scene's hold time is up.
      const sfxElements = slide.sound_effects
        .filter((sfx) => sfx.status === 'ready' && sfx.audio_url)
        .map((sfx) => {
          const el = new Audio(sfx.audio_url);
          el.volume = sfx.volume;
          const source = audioCtx.createMediaElementSource(el);
          source.connect(destination);
          el.play().catch(() => {});
          return { el, source };
        });

      await new Promise<void>((resolve, reject) => {
        const sceneStart = performance.now();
        let timerId: ReturnType<typeof setTimeout> | undefined;
        // Driven by setTimeout, not requestAnimationFrame -- rAF is fully
        // suspended on a hidden/backgrounded tab, which would hang an
        // export indefinitely the moment a user switches away from it
        // (very plausible for anything longer than a few seconds).
        // setTimeout still fires (throttled, but not stopped) in that
        // case, so the export keeps making progress in the background.
        const frame = () => {
          if (signal?.aborted) {
            if (timerId) clearTimeout(timerId);
            reject(new ExportAbortedError());
            return;
          }
          const elapsed = performance.now() - sceneStart;
          const progress = Math.min(1, elapsed / durationMs);

          ctx.save();
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();

          if (img) drawSceneImage(ctx, img, canvas.width, canvas.height, mood.filter, slide.animation_style, progress);
          drawOverlayFrame(ctx, slide.overlay_effect, particles, elapsed, canvas.width, canvas.height);
          drawCaption(ctx, story.caption_config, slide.caption, progress, canvas.width, canvas.height);
          drawWatermark(ctx, story.watermark_config, canvas.width, canvas.height, performance.now() - exportStart, watermarkImage);

          if (elapsed >= durationMs) {
            resolve();
            return;
          }
          timerId = setTimeout(frame, 1000 / FPS);
        };
        frame();
      });

      narrationEl.pause();
      musicController?.duck(false);
      sfxElements.forEach(({ el, source }) => {
        el.pause();
        source.disconnect();
      });
    }

    checkAborted();
    recorder.stop();
    await stopped;
  } finally {
    await cleanup();
  }

  const webmBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
  if (webmBlob.size === 0) {
    throw new Error('Recording produced no video data. Your browser may not support canvas/audio capture.');
  }

  checkAborted();
  onProgress({ phase: 'transcoding', sceneIndex: slides.length, sceneCount: slides.length, message: 'Converting to MP4...' });

  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunk (comfortably below Nginx / Cloud Run 32MB limit)

  async function uploadInChunks(): Promise<Blob> {
    const uploadId = `up_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const totalChunks = Math.ceil(webmBlob.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      checkAborted();
      const start = i * CHUNK_SIZE;
      const end = Math.min(webmBlob.size, start + CHUNK_SIZE);
      const chunkBlob = webmBlob.slice(start, end);

      onProgress({
        phase: 'transcoding',
        sceneIndex: slides.length,
        sceneCount: slides.length,
        message: `Uploading video to converter (${i + 1}/${totalChunks})...`,
      });

      const chunkResponse = await fetch('/api/export/to-mp4-chunk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-upload-id': uploadId,
          'x-chunk-index': i.toString(),
          'x-total-chunks': totalChunks.toString(),
        },
        body: await chunkBlob.arrayBuffer(),
        signal,
      });

      if (!chunkResponse.ok) {
        const body = await chunkResponse.json().catch(() => ({}) as any);
        const err: any = new Error(body?.error || `Video chunk upload failed (server responded ${chunkResponse.status}).`);
        err.webmBlob = webmBlob;
        throw err;
      }

      if (i === totalChunks - 1) {
        onProgress({ phase: 'done', sceneIndex: slides.length, sceneCount: slides.length, message: 'Done' });
        return await chunkResponse.blob();
      }
    }
    throw new Error('Video conversion did not complete');
  }

  try {
    let mp4Blob: Blob;
    // If the video payload is already above 20MB, bypass single-POST immediately to avoid 413
    if (webmBlob.size > 20 * 1024 * 1024) {
      mp4Blob = await uploadInChunks();
    } else {
      try {
        const response = await fetch('/api/export/to-mp4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: await webmBlob.arrayBuffer(),
          signal,
        });

        if (response.status === 413) {
          // Fallback to chunked upload if server or reverse-proxy responded 413
          mp4Blob = await uploadInChunks();
        } else if (!response.ok) {
          const body = await response.json().catch(() => ({}) as any);
          const err: any = new Error(body?.error || `Video conversion failed (server responded ${response.status}).`);
          err.webmBlob = webmBlob;
          throw err;
        } else {
          mp4Blob = await response.blob();
        }
      } catch (postErr: any) {
        if (postErr instanceof ExportAbortedError) throw postErr;
        // If direct post was rejected by reverse proxy with 413, retry chunked
        if (
          postErr?.message?.includes('413') ||
          postErr?.message?.includes('Payload too large') ||
          postErr?.message?.includes('too large')
        ) {
          mp4Blob = await uploadInChunks();
        } else {
          throw postErr;
        }
      }
    }

    onProgress({ phase: 'done', sceneIndex: slides.length, sceneCount: slides.length, message: 'Done' });
    const finalMp4Blob = new Blob([await mp4Blob.arrayBuffer()], { type: 'video/mp4' });
    return finalMp4Blob;
  } catch (error: any) {
    if (error && !(error instanceof ExportAbortedError) && !error.webmBlob) {
      error.webmBlob = webmBlob;
    }
    throw error;
  }
}
