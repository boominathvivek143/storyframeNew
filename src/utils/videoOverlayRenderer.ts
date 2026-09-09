import { SceneOverlayEffect, WatermarkConfig, WatermarkPosition } from '../types';

// ---------------------------------------------------------------------
// Watermark -- canvas equivalent of the Watermark component in
// SlideshowPlayer.tsx.
// ---------------------------------------------------------------------

function watermarkAnchor(position: WatermarkPosition, canvasWidth: number, canvasHeight: number, textAlign: 'left' | 'center' | 'right'): { x: number; y: number } {
  const pad = canvasWidth * 0.04;
  switch (position) {
    case 'top_left':
    case 'drift':
      return { x: pad, y: pad };
    case 'top_center':
      return { x: canvasWidth / 2, y: pad };
    case 'top_right':
      return { x: canvasWidth - pad, y: pad };
    case 'bottom_left':
      return { x: pad, y: canvasHeight - pad };
    case 'bottom_center':
      return { x: canvasWidth / 2, y: canvasHeight - pad };
    case 'bottom_right':
      return { x: canvasWidth - pad, y: canvasHeight - pad };
  }
}

export function drawWatermark(ctx: CanvasRenderingContext2D, config: WatermarkConfig, canvasWidth: number, canvasHeight: number, elapsedMs: number, watermarkImage: HTMLImageElement | null) {
  if (!config.enabled || (config.type === 'text' && !config.text.trim()) || (config.type === 'image' && !watermarkImage)) return;

  const isLeftAnchor = config.position.includes('left') || config.position === 'drift';
  const isRightAnchor = config.position.includes('right');
  const isTopAnchor = config.position.includes('top') || config.position === 'drift';
  const align: 'left' | 'center' | 'right' = isLeftAnchor ? 'left' : isRightAnchor ? 'right' : 'center';

  let { x, y } = watermarkAnchor(config.position, canvasWidth, canvasHeight, align);

  if (config.position === 'drift') {
    // Matches @keyframes watermark-drift: a there-and-back sweep to
    // (8%, 6%) and back over a 9s cycle, ease-in-out shaped via sin().
    const t = (elapsedMs / 1000 / 9) % 1;
    const wave = Math.sin(Math.PI * t);
    x += canvasWidth * 0.08 * wave;
    y += canvasHeight * 0.06 * wave;
  }

  ctx.save();
  ctx.globalAlpha = config.opacity;

  if (config.type === 'image' && watermarkImage) {
    const height = (config.size * 2.2 * canvasWidth) / 1080;
    const width = (watermarkImage.width / watermarkImage.height) * height;
    const drawX = align === 'left' ? x : align === 'right' ? x - width : x - width / 2;
    const drawY = isTopAnchor ? y : y - height;
    ctx.drawImage(watermarkImage, drawX, drawY, width, height);
  } else {
    const fontSize = (config.size * 2.2 * canvasWidth) / 1080;
    ctx.font = `700 ${fontSize}px sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = isTopAnchor ? 'top' : 'bottom';

    if (config.show_pill_backdrop) {
      const padX = fontSize * 0.5;
      const padY = fontSize * 0.35;
      const textWidth = ctx.measureText(config.text).width;
      const boxW = textWidth + padX * 2;
      const boxH = fontSize + padY * 2;
      const boxX = align === 'left' ? x - padX : align === 'right' ? x - textWidth - padX : x - boxW / 2;
      const boxY = isTopAnchor ? y - padY * 0.3 : y - boxH + padY * 0.3;
      ctx.fillStyle = config.pill_color || 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, boxH / 2);
      ctx.fill();
    }

    ctx.fillStyle = config.text_color || '#fff';
    ctx.fillText(config.text, x, isTopAnchor ? y + fontSize * 0.1 : y - fontSize * 0.1);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------
// Vector overlay particles -- canvas equivalent of SceneOverlay.tsx. A
// particle set is generated ONCE per scene (createOverlayParticles) so
// its random attributes stay fixed across frames; drawOverlayFrame then
// positions each particle purely as a function of elapsed time, mirroring
// the same @keyframes math from index.css evaluated by hand instead of
// left to the browser to interpolate.
// ---------------------------------------------------------------------

export interface OverlayParticle {
  leftFrac: number;
  topFrac: number;
  size: number; // fraction of canvas width
  durationMs: number;
  delayMs: number;
  sway: number; // fraction of canvas width, signed
}

export function createOverlayParticles(effect: SceneOverlayEffect, seed: number): OverlayParticle[] {
  // Deterministic PRNG (mulberry32) seeded per-scene so a given scene's
  // particle layout is stable across frames without needing shared state.
  let a = seed || 1;
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const counts: Record<SceneOverlayEffect, number> = { none: 0, sparkles: 14, floating_dust: 9, snow: 18, rain: 16, embers: 11, light_rays: 2 };
  const ranges: Record<SceneOverlayEffect, { size: [number, number]; duration: [number, number] }> = {
    none: { size: [0, 0], duration: [1, 1] },
    sparkles: { size: [0.006, 0.014], duration: [2, 4.5] },
    floating_dust: { size: [0.008, 0.018], duration: [9, 15] },
    snow: { size: [0.006, 0.014], duration: [6, 11] },
    rain: { size: [0.003, 0.003], duration: [0.5, 0.9] },
    embers: { size: [0.006, 0.012], duration: [4, 7] },
    light_rays: { size: [0.3, 0.3], duration: [9, 9] },
  };

  const count = counts[effect];
  const { size, duration } = ranges[effect];
  return Array.from({ length: count }, () => ({
    leftFrac: rand(),
    topFrac: rand(),
    size: size[0] + rand() * (size[1] - size[0]),
    durationMs: (duration[0] + rand() * (duration[1] - duration[0])) * 1000,
    delayMs: -rand() * duration[1] * 1000,
    sway: (rand() - 0.5) * 0.1,
  }));
}

function progress(elapsedMs: number, p: OverlayParticle): number {
  const t = ((elapsedMs + p.delayMs) % p.durationMs) / p.durationMs;
  return ((t % 1) + 1) % 1; // normalize negative results from a negative delay
}

export function drawOverlayFrame(ctx: CanvasRenderingContext2D, effect: SceneOverlayEffect, particles: OverlayParticle[], elapsedMs: number, canvasWidth: number, canvasHeight: number) {
  if (effect === 'none') return;

  ctx.save();

  if (effect === 'light_rays') {
    for (let i = 0; i < particles.length; i++) {
      const t = progress(elapsedMs + i * 4500, particles[i]);
      const sweepX = -canvasWidth * 0.5 + t * canvasWidth * 1.5;
      const grad = ctx.createLinearGradient(sweepX - canvasWidth * 0.2, 0, sweepX + canvasWidth * 0.2, canvasHeight);
      grad.addColorStop(0, 'rgba(255,233,184,0)');
      grad.addColorStop(0.5, 'rgba(255,233,184,0.22)');
      grad.addColorStop(1, 'rgba(255,233,184,0)');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sweepX - canvasWidth * 0.15, 0);
      ctx.lineTo(sweepX + canvasWidth * 0.15, 0);
      ctx.lineTo(sweepX + canvasWidth * 0.05, canvasHeight);
      ctx.lineTo(sweepX - canvasWidth * 0.25, canvasHeight);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  for (const p of particles) {
    const t = progress(elapsedMs, p);
    let x = p.leftFrac * canvasWidth;
    let y = p.topFrac * canvasHeight;
    let opacity = 1;
    const size = p.size * canvasWidth;
    let color = '#ffffff';

    switch (effect) {
      case 'sparkles': {
        // 0%/100% -> opacity 0, scale 0.3; 50% -> opacity 1, scale 1.
        const phase = Math.sin(Math.PI * t);
        opacity = phase;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * Math.PI * 0.5);
        ctx.scale(0.3 + 0.7 * phase, 0.3 + 0.7 * phase);
        ctx.globalAlpha = Math.max(0, opacity);
        ctx.fillStyle = '#fff8dc';
        drawStar(ctx, size);
        ctx.restore();
        continue;
      }
      case 'floating_dust': {
        opacity = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1;
        x += Math.sin(Math.PI * t) * p.sway * canvasWidth;
        y -= Math.sin(Math.PI * t) * canvasHeight * 0.05;
        color = 'rgba(255,255,255,0.55)';
        break;
      }
      case 'snow': {
        opacity = t < 0.08 ? t / 0.08 : t > 0.92 ? (1 - t) / 0.08 : 1;
        x += p.sway * canvasWidth * t;
        y = -size + t * (canvasHeight + size * 2);
        color = '#ffffff';
        break;
      }
      case 'rain': {
        opacity = 0.8;
        y = -20 + t * (canvasHeight + 40);
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = 'rgba(180,210,255,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 14);
        ctx.stroke();
        continue;
      }
      case 'embers': {
        opacity = t < 0.15 ? t / 0.15 : 0.9 * (1 - t);
        x += p.sway * canvasWidth * t;
        y = canvasHeight - t * (canvasHeight * 1.95);
        color = '#ff8a3d';
        break;
      }
      default:
        continue;
    }

    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  const spikes = 4;
  const outer = size / 2;
  const inner = outer * 0.4;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / spikes) * i;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
