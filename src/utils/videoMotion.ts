import { SceneAnimationStyle } from '../types';

// Canvas-space equivalent of the CSS @keyframes in index.css (anim-zoom-in,
// anim-pan-left, etc.) -- same scale/translate ranges, so an exported video
// moves the same way the live DOM/CSS preview does. `progress` is 0-1
// across the scene's on-screen duration; tx/ty are fractions of the
// canvas's own width/height (mirroring what a CSS `%` translate on the
// image itself would mean).
export interface MotionTransform {
  scale: number;
  tx: number;
  ty: number;
  rotate: number; // radians
}

// Matches the `ease-in-out` timing-function used on every motion keyframe.
function easeInOut(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const DEG = Math.PI / 180;

export function computeMotionTransform(style: SceneAnimationStyle, progress: number): MotionTransform {
  const t = easeInOut(progress);

  switch (style) {
    case 'zoom_in':
      return { scale: lerp(1.02, 1.16, t), tx: 0, ty: 0, rotate: 0 };
    case 'zoom_out':
      return { scale: lerp(1.16, 1.02, t), tx: 0, ty: 0, rotate: 0 };
    case 'pan_left':
      return { scale: 1.12, tx: lerp(0.03, -0.03, t), ty: 0, rotate: 0 };
    case 'pan_right':
      return { scale: 1.12, tx: lerp(-0.03, 0.03, t), ty: 0, rotate: 0 };
    case 'pan_up':
      return { scale: 1.12, tx: 0, ty: lerp(0.03, -0.03, t), rotate: 0 };
    case 'pan_down':
      return { scale: 1.12, tx: 0, ty: lerp(-0.03, 0.03, t), rotate: 0 };
    case 'ken_burns':
      return { scale: lerp(1.04, 1.2, t), tx: lerp(0.02, -0.02, t), ty: lerp(0.02, -0.02, t), rotate: 0 };
    case 'pulse': {
      // 0% / 50% / 100% keyframe -- two linear-in-easeInOut-space halves.
      const half = progress < 0.5 ? easeInOut(progress / 0.5) : easeInOut((progress - 0.5) / 0.5);
      const scale = progress < 0.5 ? lerp(1.04, 1.11, half) : lerp(1.11, 1.04, half);
      return { scale, tx: 0, ty: 0, rotate: 0 };
    }
    case 'rotate_left':
      return { scale: lerp(1.08, 1.16, t), tx: 0, ty: 0, rotate: lerp(-2, 2, t) * DEG };
    case 'rotate_right':
      return { scale: lerp(1.08, 1.16, t), tx: 0, ty: 0, rotate: lerp(2, -2, t) * DEG };
    case 'drift':
      return { scale: 1.05, tx: lerp(-0.02, 0.02, t), ty: lerp(-0.01, 0.01, t), rotate: 0 };
    case 'shake': {
      // Approximates the CSS keyframes' discrete jitter stops with a
      // smooth, fast wobble driven directly off raw (non-eased) progress
      // -- it's a continuous oscillation, not a single eased sweep, so
      // easeInOut's t above isn't the right input here.
      const cycles = 14;
      const tx = Math.sin(progress * Math.PI * 2 * cycles) * 0.012;
      const ty = Math.cos(progress * Math.PI * 2 * cycles * 1.3) * 0.012;
      return { scale: 1.06, tx, ty, rotate: 0 };
    }
    case 'none':
    default:
      return { scale: 1, tx: 0, ty: 0, rotate: 0 };
  }
}
