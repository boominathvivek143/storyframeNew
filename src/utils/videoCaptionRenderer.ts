import { CaptionConfig } from '../types';

// Canvas equivalent of src/utils/captionStyle.ts's boxStyle() -- same
// visual recipe (box/stroke/shadow/highlight/reveal), reimplemented with
// the Canvas 2D API instead of CSS, since that's what actually needs to
// end up in an exported video frame. Sized against a 1080px-wide
// reference frame exactly like the DOM version, scaled here by the
// canvas's own real width instead of cqw.
const REF_WIDTH = 1080;
const px = (value: number, canvasWidth: number) => (value / REF_WIDTH) * canvasWidth;

function hexToRgba(color: string, opacity: number): string {
  if (color.startsWith('rgba') || color.startsWith('rgb')) return color;
  if (color === 'transparent') return 'transparent';
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r)) return color;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function applyShadow(ctx: CanvasRenderingContext2D, config: CaptionConfig, canvasWidth: number) {
  switch (config.shadow_type) {
    case 'soft':
      ctx.shadowColor = config.shadow_color || 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = px(10, canvasWidth);
      ctx.shadowOffsetY = px(4, canvasWidth);
      break;
    case 'heavy_3d':
      ctx.shadowColor = config.shadow_color || '#000';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = px(4, canvasWidth);
      ctx.shadowOffsetY = px(4, canvasWidth);
      break;
    case 'neon':
      ctx.shadowColor = config.shadow_color || config.highlight_color;
      ctx.shadowBlur = px(16, canvasWidth);
      break;
    default:
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
  }
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// Same stops as index.css's @keyframes caption-bounce (translateY as a
// fraction of the word's own font size, plus a scale), piecewise-linearly
// interpolated -- canvas has no keyframe/animation-fill-mode of its own,
// so this is evaluated by hand from `t` (0-1 across the word's reveal slot).
const BOUNCE_STOPS: { t: number; y: number; s: number }[] = [
  { t: 0, y: 0, s: 1 },
  { t: 0.3, y: -0.38, s: 1.06 },
  { t: 0.55, y: 0.04, s: 0.98 },
  { t: 0.78, y: -0.1, s: 1.02 },
  { t: 1, y: 0, s: 1 },
];

function bounceCurve(t: number): { y: number; s: number } {
  const clamped = Math.min(1, Math.max(0, t));
  for (let i = 1; i < BOUNCE_STOPS.length; i++) {
    const prev = BOUNCE_STOPS[i - 1];
    const next = BOUNCE_STOPS[i];
    if (clamped <= next.t) {
      const span = next.t - prev.t || 1;
      const localT = (clamped - prev.t) / span;
      return { y: prev.y + (next.y - prev.y) * localT, s: prev.s + (next.s - prev.s) * localT };
    }
  }
  return { y: 0, s: 1 };
}

/**
 * Draws the caption for one video frame. `revealFraction` (0-1) is how far
 * through the scene's on-screen time we are, used both to pace which word
 * is "current" (every mode, static included) and to slide a short window
 * of words (a few before/after the current one) across the full line --
 * long narration otherwise sits on screen in full for the whole scene,
 * which is a lot more text than a viewer needs at once. Mirrors
 * src/components/SlideshowPlayer.tsx's CaptionOverlay in the DOM preview.
 */
export function drawCaption(ctx: CanvasRenderingContext2D, config: CaptionConfig, text: string, revealFraction: number, canvasWidth: number, canvasHeight: number) {
  if (!config.enabled || !text.trim()) return;

  const allWords = (config.text_case === 'uppercase' ? text.toUpperCase() : text).split(/\s+/).filter(Boolean);
  if (allWords.length === 0) return;

  const totalWords = allWords.length;
  const revealedCount = Math.max(1, Math.ceil(revealFraction * totalWords));
  const windowSize = Math.max(3, config.max_words_per_line || 5);
  const activeIdx = Math.min(totalWords - 1, Math.max(0, revealedCount - 1));
  const before = Math.floor((windowSize - 1) / 2);
  const windowStart = Math.max(0, Math.min(totalWords - Math.min(windowSize, totalWords), activeIdx - before));
  const words = allWords.slice(windowStart, windowStart + Math.min(windowSize, totalWords));

  const fontSize = px(config.font_size, canvasWidth);
  const lineHeight = fontSize * 1.35;
  const wordGap = px(8, canvasWidth);
  ctx.font = `${config.font_weight} ${fontSize}px ${config.font_family}`;
  ctx.textBaseline = 'middle';

  // Measure the visible window's words up front so they can be centered
  // and the background box sized before drawing any text.
  const widths = words.map((w) => ctx.measureText(w).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0) + wordGap * Math.max(0, words.length - 1);

  const centerX = canvasWidth / 2;
  const centerY = config.position_y * canvasHeight;
  const top = centerY - lineHeight / 2;

  // Background box, sized to the measured text.
  if (config.box_style !== 'none') {
    const padX = px(20, canvasWidth);
    const padY = px(10, canvasWidth);
    ctx.fillStyle = hexToRgba(config.box_color, config.box_opacity);
    const boxW = totalWidth + padX * 2;
    const boxH = lineHeight + padY * 2 - (lineHeight - fontSize);
    const boxX = centerX - boxW / 2;
    const boxY = top - padY + (lineHeight - fontSize) / 2;
    const radius = config.box_style === 'pill' ? boxH / 2 : px(8, canvasWidth);
    roundRect(ctx, boxX, boxY, boxW, boxH, radius);
    ctx.fill();
    if (config.border_color && config.border_width) {
      ctx.strokeStyle = config.border_color;
      ctx.lineWidth = px(config.border_width, canvasWidth);
      ctx.stroke();
    }
  }

  {
    let cursorX = centerX - totalWidth / 2;
    const y = top + lineHeight / 2;

    words.forEach((word, wi) => {
      const wordIndex = windowStart + wi;
      const isRevealed = wordIndex < revealedCount;
      const isCurrent = wordIndex === revealedCount - 1 && config.animation_mode !== 'static';
      const w = widths[wi];

      ctx.globalAlpha = isRevealed ? 1 : 0.35;
      ctx.fillStyle = isCurrent && config.highlight_style === 'color' ? config.highlight_color : config.text_color;

      const drawX = cursorX + w / 2;
      let drawY = y;
      let scale = isCurrent && config.animation_mode === 'pop' ? 1.12 : 1;
      if (isCurrent && config.animation_mode === 'bounce') {
        const rawPos = revealFraction * totalWords;
        const wordFrac = Math.max(0, Math.min(1, rawPos - Math.floor(rawPos)));
        const bounce = bounceCurve(wordFrac);
        drawY = y + bounce.y * fontSize;
        scale = bounce.s;
      }

      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.scale(scale, scale);

      applyShadow(ctx, config, canvasWidth);
      if (isCurrent && config.highlight_style === 'glow') {
        ctx.shadowColor = config.highlight_color;
        ctx.shadowBlur = px(14, canvasWidth);
      }

      if (config.stroke_width > 0) {
        ctx.strokeStyle = config.stroke_color;
        ctx.lineWidth = px(config.stroke_width, canvasWidth) * 2;
        ctx.lineJoin = 'round';
        ctx.textAlign = 'center';
        ctx.strokeText(word, 0, 0);
      }
      clearShadow(ctx);
      // Redraw the fill's own (lighter) shadow after clearing the stroke
      // pass's shadow, so the stroke doesn't get its blur doubled onto the
      // fill on top of it.
      applyShadow(ctx, config, canvasWidth);
      ctx.textAlign = 'center';
      ctx.fillText(word, 0, 0);
      clearShadow(ctx);
      ctx.restore();

      cursorX += w + wordGap;
    });
  }

  ctx.globalAlpha = 1;
}
