import type { CSSProperties } from 'react';
import { SceneAnimationStyle } from '../types';

// Maps each animation style to the @keyframes name defined in index.css.
// 'none' has no entry -- that scene's image gets only the entrance fade,
// no motion.
const KEYFRAME_NAME: Partial<Record<SceneAnimationStyle, string>> = {
  zoom_in: 'anim-zoom-in',
  zoom_out: 'anim-zoom-out',
  pan_left: 'anim-pan-left',
  pan_right: 'anim-pan-right',
  pan_up: 'anim-pan-up',
  pan_down: 'anim-pan-down',
  ken_burns: 'anim-ken-burns',
  pulse: 'anim-pulse',
  rotate_left: 'anim-rotate-left',
  rotate_right: 'anim-rotate-right',
  drift: 'anim-drift',
  shake: 'anim-shake',
};

// Builds the full animation style for a slide's <img> -- a quick entrance
// fade plus (unless the style is "none") a slow pan/zoom keyframe running
// for the slide's whole on-screen duration. Both are expressed as
// comma-separated animation-* values so they run together instead of one
// replacing the other, since the `animation` shorthand can't be split
// across two className rules without the later one winning outright.
export function buildSceneImageStyle(moodFilter: string, style: SceneAnimationStyle, activeSeconds: number, isPlaying: boolean): CSSProperties {
  const motionKeyframe = KEYFRAME_NAME[style];
  const playState = isPlaying ? 'running' : 'paused';
  const duration = Math.max(activeSeconds, 1);

  if (!motionKeyframe) {
    return { filter: moodFilter, animationName: 'image-fade-in', animationDuration: '0.25s', animationTimingFunction: 'ease-out', animationFillMode: 'forwards', animationPlayState: 'running' };
  }

  return {
    filter: moodFilter,
    // image-fade-in animates opacity only (never transform) so it can run
    // alongside the pan/zoom keyframe below without the two fighting over
    // the transform property -- reusing the toast/menu "fade-in" keyframe
    // here (which also slides on translateY) would have the motion
    // keyframe silently win that tug-of-war every time, per spec, since
    // later entries in a comma-separated animation-name list take
    // priority for any property both animations touch.
    animationName: `image-fade-in, ${motionKeyframe}`,
    animationDuration: `0.25s, ${duration}s`,
    animationTimingFunction: 'ease-out, ease-in-out',
    animationFillMode: 'forwards, forwards',
    animationPlayState: `running, ${playState}`,
  } as CSSProperties;
}
