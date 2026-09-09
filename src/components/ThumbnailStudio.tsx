import { Download, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { THUMBNAIL_THEMES } from '../data/presets';
import { Scene, Story, ThumbnailConfig } from '../types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    // The browser's image-load error event carries no diagnostic detail
    // at all (same withholding-for-privacy behavior as a failed fetch) --
    // the one thing this code *can* tell apart is whether the source was
    // an embedded data: URL (a corrupted/invalid image, a real bug here)
    // or a remote URL (almost certainly a network/CORS/404 issue on
    // whatever's hosting it), since those point to very different fixes.
    img.onerror = () => reject(new Error(src.startsWith('data:') ? 'The embedded image data is corrupted or in an unsupported format.' : `Could not load the image from ${src} -- check it's reachable and allows cross-origin loading.`));
    img.src = src;
  });
}

export function ThumbnailStudio({ story, onUpdate }: { story: Story; onUpdate: (patch: Partial<ThumbnailConfig>) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = story.thumbnail;
  const [renderError, setRenderError] = useState<string | null>(null);

  const approvedScenes = story.scenes.filter((s) => s.image_url);
  const sourceImage =
    config.source_type === 'custom'
      ? config.custom_image_url
      : approvedScenes[config.source_scene_index ?? 0]?.image_url || approvedScenes[0]?.image_url;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage) return;
    const { width, height } = story.dimensions;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    loadImage(sourceImage)
      .then((img) => {
        if (cancelled) return;
        setRenderError(null);
        ctx.clearRect(0, 0, width, height);

        // cover-fit draw
        const scale = Math.max(width / img.width, height / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);

        // theme gradient overlay
        const theme = THUMBNAIL_THEMES.find((t) => t.id === config.theme) || THUMBNAIL_THEMES[0];
        if (config.show_shadow_scrim) {
          const gradient =
            config.text_position === 'top'
              ? ctx.createLinearGradient(0, height * 0.4, 0, 0)
              : ctx.createLinearGradient(0, height * 0.45, 0, height);
          gradient.addColorStop(0, theme.overlay[0]);
          gradient.addColorStop(1, theme.overlay[1]);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
        }

        const scaleF = config.font_size_scale || 1;

        // safe zone guide
        if (config.show_safe_zone_guides) {
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 8]);
          const margin = width * 0.08;
          ctx.strokeRect(margin, height * 0.12, width - margin * 2, height * 0.76);
          ctx.setLineDash([]);
        }

        const textX = width / 2;
        const badgeY = config.text_position === 'top' ? height * 0.1 : height * 0.72;
        let cursorY = badgeY;

        ctx.textAlign = 'center';
        ctx.fillStyle = theme.text;

        if (config.badge_text) {
          ctx.font = `700 ${width * 0.032 * scaleF}px sans-serif`;
          const padX = width * 0.02;
          const metrics = ctx.measureText(config.badge_text.toUpperCase());
          const badgeW = metrics.width + padX * 2;
          const badgeH = width * 0.06 * scaleF;
          ctx.fillStyle = 'rgba(255,255,255,0.14)';
          roundRect(ctx, textX - badgeW / 2, cursorY - badgeH * 0.7, badgeW, badgeH, badgeH / 2);
          ctx.fill();
          ctx.fillStyle = theme.text;
          ctx.fillText(config.badge_text.toUpperCase(), textX, cursorY);
          cursorY += width * 0.09 * scaleF;
        }

        ctx.font = `800 ${width * 0.075 * scaleF}px Georgia, serif`;
        wrapText(ctx, config.title || story.story_title, textX, cursorY, width * 0.86, width * 0.085 * scaleF);
        const titleLines = wrapLineCount(ctx, config.title || story.story_title, width * 0.86);
        cursorY += width * 0.085 * scaleF * titleLines + width * 0.02;

        if (config.subtitle) {
          ctx.font = `500 ${width * 0.036 * scaleF}px sans-serif`;
          ctx.globalAlpha = 0.85;
          wrapText(ctx, config.subtitle, textX, cursorY, width * 0.8, width * 0.046 * scaleF);
          ctx.globalAlpha = 1;
        }
      })
      .catch((err: Error) => setRenderError(err.message || 'Could not load the source image.'));

    return () => {
      cancelled = true;
    };
  }, [sourceImage, config, story.dimensions, story.story_title]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    onUpdate({ generated_image_url: url });
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thumbnail.png';
    a.click();
  };

  const handleCustomUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate({ source_type: 'custom', custom_image_url: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 grid sm:grid-cols-[1fr_260px] gap-6">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-[#8a8399] block mb-1">Source</label>
          <div className="flex flex-wrap gap-1.5">
            {approvedScenes.map((s: Scene) => (
              <button
                key={s.id}
                onClick={() => onUpdate({ source_type: 'scene', source_scene_index: story.scenes.indexOf(s) })}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 ${
                  config.source_type === 'scene' && config.source_scene_index === story.scenes.indexOf(s) ? 'border-[#d9a042]' : 'border-transparent'
                }`}
              >
                <img src={s.image_url} className="w-full h-full object-cover" />
              </button>
            ))}
            <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-lg border-2 border-dashed border-[#4a4458] flex items-center justify-center text-[#6b6579] hover:text-[#c9c2e0]">
              <Upload className="w-4 h-4" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleCustomUpload(e.target.files?.[0])} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-[#8a8399] block mb-1">Badge</label>
          <input value={config.badge_text || ''} onChange={(e) => onUpdate({ badge_text: e.target.value })} placeholder="e.g. NEW STORY" className="w-full bg-[#1b1822] border border-[#2f2a3a] rounded-lg px-3 py-2 text-sm text-[#ece8de] outline-none focus:border-[#d9a042]" />
        </div>
        <div>
          <label className="text-xs font-medium text-[#8a8399] block mb-1">Title</label>
          <input value={config.title} onChange={(e) => onUpdate({ title: e.target.value })} className="w-full bg-[#1b1822] border border-[#2f2a3a] rounded-lg px-3 py-2 text-sm text-[#ece8de] outline-none focus:border-[#d9a042]" />
        </div>
        <div>
          <label className="text-xs font-medium text-[#8a8399] block mb-1">Subtitle</label>
          <input value={config.subtitle || ''} onChange={(e) => onUpdate({ subtitle: e.target.value })} className="w-full bg-[#1b1822] border border-[#2f2a3a] rounded-lg px-3 py-2 text-sm text-[#ece8de] outline-none focus:border-[#d9a042]" />
        </div>

        <div>
          <label className="text-xs font-medium text-[#8a8399] block mb-1">Theme</label>
          <div className="flex gap-1.5">
            {THUMBNAIL_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => onUpdate({ theme: t.id })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${config.theme === t.id ? 'bg-[#d9a042] border-[#d9a042] text-[#1b1408]' : 'border-[#2f2a3a] text-[#9d97ab]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-[#8a8399] block mb-1">Text position</label>
          <div className="flex gap-1.5">
            {(['top', 'bottom_safe'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => onUpdate({ text_position: pos })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize ${config.text_position === pos ? 'bg-[#d9a042] border-[#d9a042] text-[#1b1408]' : 'border-[#2f2a3a] text-[#9d97ab]'}`}
              >
                {pos.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-[#8a8399] block mb-1">
            Text size <span className="font-mono">{Math.round((config.font_size_scale || 1) * 100)}%</span>
          </label>
          <input
            type="range"
            min={0.7}
            max={1.4}
            step={0.05}
            value={config.font_size_scale || 1}
            onChange={(e) => onUpdate({ font_size_scale: Number(e.target.value) })}
            className="w-full accent-[#d9a042]"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-[#c9c2e0] cursor-pointer">
          <input type="checkbox" checked={config.show_shadow_scrim} onChange={(e) => onUpdate({ show_shadow_scrim: e.target.checked })} className="w-4 h-4 accent-[#d9a042]" />
          Darken behind text for legibility
        </label>
        <label className="flex items-center gap-2 text-sm text-[#c9c2e0] cursor-pointer">
          <input type="checkbox" checked={config.show_safe_zone_guides} onChange={(e) => onUpdate({ show_safe_zone_guides: e.target.checked })} className="w-4 h-4 accent-[#d9a042]" />
          Show platform safe-zone guides
        </label>

        <button onClick={handleDownload} disabled={!sourceImage} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766] disabled:opacity-50">
          <Download className="w-4 h-4" />
          Download PNG
        </button>

        <div className="pt-4 mt-2 border-t border-[#2f2a3a] space-y-3">
          <p className="text-xs font-medium text-[#8a8399]">Share text (optional)</p>
          <textarea
            value={config.social_caption || ''}
            onChange={(e) => onUpdate({ social_caption: e.target.value })}
            placeholder="Caption to post alongside this thumbnail…"
            rows={2}
            className="w-full bg-[#1b1822] border border-[#2f2a3a] rounded-lg px-3 py-2 text-sm text-[#ece8de] outline-none focus:border-[#d9a042] resize-none"
          />
          <input
            value={config.hashtags || ''}
            onChange={(e) => onUpdate({ hashtags: e.target.value })}
            placeholder="#storytime #shortstory"
            className="w-full bg-[#1b1822] border border-[#2f2a3a] rounded-lg px-3 py-2 text-sm text-[#ece8de] outline-none focus:border-[#d9a042]"
          />
          {(config.social_caption || config.hashtags) && (
            <button
              onClick={() => navigator.clipboard.writeText([config.social_caption, config.hashtags].filter(Boolean).join('\n\n')).catch(() => {})}
              className="text-xs font-medium text-[#c9c2e0] hover:text-white"
            >
              Copy caption + hashtags
            </button>
          )}
        </div>
      </div>

      <div className="sm:sticky sm:top-20 h-fit">
        <div className="bg-[#1b1822] border border-[#2f2a3a] rounded-xl overflow-hidden" style={{ aspectRatio: story.dimensions.width / story.dimensions.height }}>
          {sourceImage ? <canvas ref={canvasRef} className="w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-xs text-[#6b6579] p-4 text-center">Approve a scene first to pick a source image.</div>}
        </div>
        {renderError && <p className="text-xs text-red-400 mt-2">{renderError}</p>}
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let cursorY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
}

function wrapLineCount(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): number {
  const words = text.split(' ');
  let line = '';
  let lines = 1;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines += 1;
      line = word;
    } else {
      line = test;
    }
  }
  return lines;
}
