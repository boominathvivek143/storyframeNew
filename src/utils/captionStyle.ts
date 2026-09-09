import { CaptionConfig } from '../types';
import type { CSSProperties } from 'react';

// Every size in a CaptionConfig (font_size, stroke_width, border_width) is
// authored against a 1080px-wide reference frame. buildCaptionStyle()
// below converts each of those to whatever length unit the caller passes
// in, so the exact same visual recipe can render at two very different
// scales: the real playback frame (via cqw, "container query width" --
// resolves relative to the actual frame regardless of its own pixel size,
// as long as it has `containerType: 'inline-size'`) and a small fixed-px
// preset-picker card (via a flat px scale -- a picker card is never a
// query container, so cqw units there would resolve against some
// unrelated ancestor and come out wildly oversized).
const REF_WIDTH = 1080;

export function cqw(px: number): string {
  return `${(px / REF_WIDTH) * 100}cqw`;
}

function previewPx(px: number): string {
  // ~15px at font_size 32 -- large enough to read the preset's character,
  // small enough to sit inside a picker card without overflowing it.
  return `${px * 0.47}px`;
}

function buildCaptionStyle(config: CaptionConfig, unit: (px: number) => string): CSSProperties {
  const base: CSSProperties = {
    display: 'inline-block',
    fontFamily: config.font_family,
    fontWeight: config.font_weight as any,
    fontSize: unit(config.font_size),
    color: config.text_color,
    textTransform: config.text_case === 'uppercase' ? 'uppercase' : 'none',
    WebkitTextStroke: config.stroke_width > 0 ? `${unit(config.stroke_width)} ${config.stroke_color}` : undefined,
    paintOrder: 'stroke fill',
    lineHeight: 1.25,
    letterSpacing: config.font_weight === '900' || config.font_weight === '800' ? '0.01em' : undefined,
    whiteSpace: 'nowrap',
  };

  switch (config.shadow_type) {
    case 'soft':
      base.filter = `drop-shadow(0 ${unit(4)} ${unit(10)} ${config.shadow_color || 'rgba(0,0,0,0.6)'})`;
      break;
    case 'heavy_3d':
      base.textShadow = [1, 2, 3, 4, 5, 6].map((n) => `${unit(n)} ${unit(n)} 0 ${config.shadow_color || '#000'}`).join(', ');
      break;
    case 'neon':
      base.filter = `drop-shadow(0 0 ${unit(6)} ${config.shadow_color || config.highlight_color}) drop-shadow(0 0 ${unit(14)} ${config.shadow_color || config.highlight_color})`;
      break;
    default:
      break;
  }

  if (config.box_style === 'none') return base;

  base.padding = `${unit(10)} ${unit(20)}`;
  base.backgroundColor = hexToRgba(config.box_color, config.box_opacity);
  if (config.border_color && config.border_width) {
    base.border = `${unit(config.border_width)} solid ${config.border_color}`;
  }

  if (config.box_style === 'pill') base.borderRadius = '999px';
  else if (config.box_style === 'box' || config.box_style === 'word_badge') base.borderRadius = unit(8);
  else if (config.box_style === 'glass') {
    base.borderRadius = unit(14);
    (base as any).backdropFilter = 'blur(6px)';
  }

  return base;
}

// For the real playback frame -- the frame element needs
// `containerType: 'inline-size'` for these cqw units to resolve correctly.
export function boxStyle(config: CaptionConfig): CSSProperties {
  return buildCaptionStyle(config, cqw);
}

// For a small fixed-size preset-picker card -- flat px, no containment
// requirement, deliberately NOT to scale with the real video frame.
export function previewBoxStyle(config: CaptionConfig): CSSProperties {
  return buildCaptionStyle(config, previewPx);
}

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
