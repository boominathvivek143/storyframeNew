import { useMemo } from 'react';
import { SceneOverlayEffect } from '../types';

// Vector particle/sweep layer drawn between the image and the caption.
// Each particle is its own small <svg> (a handful of vector shapes, not a
// raster sprite), positioned with plain CSS percentages -- which resolve
// against the frame's own box for an absolutely positioned child, no
// container-query units needed just for placement -- and animated with
// CSS keyframes. Travel *distance* (how far a snowflake falls, how far a
// light sweep travels) does need to track the frame's real size
// regardless of aspect ratio, so those keyframes use cqw/cqh (the frame
// sets `containerType: size` in SlideshowPlayer so both axes resolve,
// not just cqw as elsewhere in this app).

interface ParticleSpec {
  left: number; // %
  top: number; // %
  size: number; // px
  duration: number; // s
  delay: number; // s, negative to desync the loop from first paint
  sway: number; // cqw, horizontal wander for fall/rise effects
  opacity: number;
}

function useParticles(seedKey: string, count: number, sizeRange: [number, number], durationRange: [number, number]): ParticleSpec[] {
  return useMemo(() => {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
      duration: durationRange[0] + Math.random() * (durationRange[1] - durationRange[0]),
      delay: -Math.random() * durationRange[1],
      sway: Math.round((Math.random() - 0.5) * 10),
      opacity: 0.55 + Math.random() * 0.45,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);
}

function particleStyle(p: ParticleSpec, extraTop?: number): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${p.left}%`,
    top: `${extraTop ?? p.top}%`,
    width: p.size,
    height: p.size,
    animationDuration: `${p.duration}s`,
    animationDelay: `${p.delay}s`,
    ['--sway' as string]: p.sway,
    opacity: p.opacity,
  };
}

function SparklesFx({ seedKey }: { seedKey: string }) {
  const particles = useParticles(seedKey, 14, [5, 11], [2, 4.5]);
  return (
    <>
      {particles.map((p, i) => (
        <svg key={i} viewBox="0 0 24 24" className="fx-sparkle" style={particleStyle(p)}>
          <path d="M12 0 L14.2 9.8 L24 12 L14.2 14.2 L12 24 L9.8 14.2 L0 12 L9.8 9.8 Z" fill="#fff8dc" />
        </svg>
      ))}
    </>
  );
}

function FloatingDustFx({ seedKey }: { seedKey: string }) {
  const particles = useParticles(seedKey, 9, [6, 13], [9, 15]);
  return (
    <>
      {particles.map((p, i) => (
        <svg key={i} viewBox="0 0 10 10" className="fx-dust" style={{ ...particleStyle(p), filter: 'blur(0.6px)' }}>
          <circle cx="5" cy="5" r="5" fill="#ffffff" />
        </svg>
      ))}
    </>
  );
}

function SnowFx({ seedKey }: { seedKey: string }) {
  const particles = useParticles(seedKey, 18, [4, 9], [6, 11]);
  return (
    <>
      {particles.map((p, i) => (
        <svg key={i} viewBox="0 0 10 10" className="fx-snow" style={particleStyle(p, -10)}>
          <circle cx="5" cy="5" r="5" fill="#ffffff" />
        </svg>
      ))}
    </>
  );
}

function RainFx({ seedKey }: { seedKey: string }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, () => ({
        left: Math.random() * 100,
        duration: 0.5 + Math.random() * 0.4,
        delay: -Math.random() * 1,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seedKey]
  );
  return (
    <>
      {particles.map((p, i) => (
        <svg
          key={i}
          viewBox="0 0 4 28"
          className="fx-rain"
          style={{ position: 'absolute', left: `${p.left}%`, top: -30, width: 4, height: 28, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }}
        >
          <defs>
            <linearGradient id={`rain-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bcd6ff" stopOpacity="0" />
              <stop offset="100%" stopColor="#bcd6ff" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <line x1="2" y1="0" x2="2" y2="28" stroke={`url(#rain-grad-${i})`} strokeWidth="2" strokeLinecap="round" />
        </svg>
      ))}
    </>
  );
}

function EmbersFx({ seedKey }: { seedKey: string }) {
  const particles = useParticles(seedKey, 11, [4, 8], [4, 7]);
  return (
    <>
      {particles.map((p, i) => (
        <svg key={i} viewBox="0 0 10 10" className="fx-ember" style={{ ...particleStyle(p, 100), filter: 'blur(0.3px)' }}>
          <circle cx="5" cy="5" r="5" fill="#ff8a3d" />
        </svg>
      ))}
    </>
  );
}

function LightRaysFx() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="ray-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe9b8" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffe9b8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffe9b8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="fx-light-ray" style={{ animationDelay: '0s' }}>
        <polygon points="-40,0 -10,0 40,100 10,100" fill="url(#ray-grad)" />
      </g>
      <g className="fx-light-ray" style={{ animationDelay: '-5s' }}>
        <polygon points="-40,0 -10,0 40,100 10,100" fill="url(#ray-grad)" />
      </g>
    </svg>
  );
}

export function SceneOverlay({ effect, sceneKey }: { effect: SceneOverlayEffect; sceneKey: string }) {
  if (effect === 'none') return null;
  const seedKey = `${sceneKey}:${effect}`;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 3 }}>
      {effect === 'sparkles' && <SparklesFx seedKey={seedKey} />}
      {effect === 'floating_dust' && <FloatingDustFx seedKey={seedKey} />}
      {effect === 'snow' && <SnowFx seedKey={seedKey} />}
      {effect === 'rain' && <RainFx seedKey={seedKey} />}
      {effect === 'embers' && <EmbersFx seedKey={seedKey} />}
      {effect === 'light_rays' && <LightRaysFx />}
    </div>
  );
}
