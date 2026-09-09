import { SoundEffectCue } from '../types';
import { audioBufferToWavDataUrl } from './wavEncode';

// Procedural sound-effect fallback for when no ElevenLabs key is
// configured (or generation fails) -- noise + filters + envelopes
// rendered offline into a short WAV clip, the same trick musicSynth.ts
// uses for background music beds, just non-looping and per-cue instead
// of one continuous bed. Genuinely free and instant, at the cost of being
// an approximation rather than a real recorded/generated sound.
const SAMPLE_RATE = 22050;

function createNoiseBuffer(ctx: OfflineAudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(seconds * ctx.sampleRate)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function noiseSource(ctx: OfflineAudioContext, seconds: number): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = createNoiseBuffer(ctx, seconds);
  return src;
}

// Schedules a linear-ramp envelope on a gain node from a list of
// [time, value] breakpoints.
function scheduleEnvelope(gain: GainNode, points: [number, number][]) {
  const g = gain.gain;
  g.setValueAtTime(points[0][1], points[0][0]);
  for (let i = 1; i < points.length; i++) g.linearRampToValueAtTime(points[i][1], points[i][0]);
}

function thumpOsc(ctx: OfflineAudioContext, dest: AudioNode, time: number, freq: number, peak: number, decay: number) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + decay + 0.05);
}

async function render(seconds: number, build: (ctx: OfflineAudioContext) => void): Promise<string> {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE);
  build(ctx);
  const rendered = await ctx.startRendering();
  return audioBufferToWavDataUrl(rendered);
}

function renderThunder(): Promise<string> {
  const duration = 4;
  return render(duration, (ctx) => {
    const src = noiseSource(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, 0);
    filter.frequency.linearRampToValueAtTime(140, duration);
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.03, 1],
      [0.4, 0.75],
      [duration * 0.6, 0.5],
      [duration, 0.0001],
    ]);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    src.stop(duration);
  });
}

function renderRain(): Promise<string> {
  const duration = 3;
  return render(duration, (ctx) => {
    const src = noiseSource(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3500;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.15, 0.75],
      [duration - 0.15, 0.75],
      [duration, 0.0001],
    ]);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    src.stop(duration);
  });
}

function renderFire(): Promise<string> {
  const duration = 3;
  return render(duration, (ctx) => {
    // Low bed.
    const bed = noiseSource(ctx, duration);
    const bedFilter = ctx.createBiquadFilter();
    bedFilter.type = 'lowpass';
    bedFilter.frequency.value = 800;
    const bedGain = ctx.createGain();
    scheduleEnvelope(bedGain, [
      [0, 0.0001],
      [0.2, 0.6],
      [duration - 0.2, 0.6],
      [duration, 0.0001],
    ]);
    bed.connect(bedFilter);
    bedFilter.connect(bedGain);
    bedGain.connect(ctx.destination);
    bed.start(0);
    bed.stop(duration);

    // Random crackle pops layered on top.
    const popCount = 24;
    for (let i = 0; i < popCount; i++) {
      const t = Math.random() * (duration - 0.1);
      const popDur = 0.03 + Math.random() * 0.05;
      const pop = noiseSource(ctx, popDur);
      const popFilter = ctx.createBiquadFilter();
      popFilter.type = 'highpass';
      popFilter.frequency.value = 2000;
      const popGain = ctx.createGain();
      scheduleEnvelope(popGain, [
        [t, 0.0001],
        [t + 0.005, 0.45 + Math.random() * 0.4],
        [t + popDur, 0.0001],
      ]);
      pop.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(ctx.destination);
      pop.start(t);
      pop.stop(t + popDur);
    }
  });
}

function renderWind(): Promise<string> {
  const duration = 3.5;
  return render(duration, (ctx) => {
    const src = noiseSource(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(280, 0);
    for (let t = 0.4; t < duration; t += 0.8) {
      filter.frequency.linearRampToValueAtTime(200 + Math.random() * 450, t);
    }
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.3, 0.8],
      [duration - 0.3, 0.8],
      [duration, 0.0001],
    ]);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    src.stop(duration);
  });
}

function renderWaterFlow(): Promise<string> {
  const duration = 3;
  return render(duration, (ctx) => {
    const src = noiseSource(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(1100, 0);
    for (let t = 0.15; t < duration; t += 0.3) {
      filter.frequency.linearRampToValueAtTime(800 + Math.random() * 700, t);
    }
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.2, 0.75],
      [duration - 0.2, 0.75],
      [duration, 0.0001],
    ]);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    src.stop(duration);
  });
}

function renderWaves(): Promise<string> {
  const duration = 4.5;
  return render(duration, (ctx) => {
    const src = noiseSource(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 750;
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.1],
      [1.4, 0.85],
      [2.2, 0.25],
      [3.6, 0.85],
      [4.4, 0.15],
      [duration, 0.0001],
    ]);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    src.stop(duration);
  });
}

function renderFootsteps(): Promise<string> {
  const duration = 1.8;
  return render(duration, (ctx) => {
    const stepTimes = [0.05, 0.5, 0.95, 1.4];
    for (const t of stepTimes) {
      const thumpDur = 0.09;
      const thump = noiseSource(ctx, thumpDur);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      const gain = ctx.createGain();
      const peak = 0.8 + Math.random() * 0.15;
      scheduleEnvelope(gain, [
        [t, 0.0001],
        [t + 0.01, peak],
        [t + thumpDur, 0.0001],
      ]);
      thump.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      thump.start(t);
      thump.stop(t + thumpDur);
      thumpOsc(ctx, ctx.destination, t, 85, 0.7, 0.12);
    }
  });
}

function renderDoorCreak(): Promise<string> {
  const duration = 1.6;
  return render(duration, (ctx) => {
    const src = noiseSource(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 10;
    filter.frequency.setValueAtTime(320, 0);
    filter.frequency.linearRampToValueAtTime(850, duration * 0.55);
    filter.frequency.linearRampToValueAtTime(420, duration);
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.15, 0.85],
      [duration - 0.2, 0.75],
      [duration, 0.0001],
    ]);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    src.stop(duration);
  });
}

function renderCrowd(): Promise<string> {
  const duration = 3;
  return render(duration, (ctx) => {
    for (const centerFreq of [600, 1100]) {
      const src = noiseSource(ctx, duration);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 0.9;
      filter.frequency.value = centerFreq;
      const gain = ctx.createGain();
      scheduleEnvelope(gain, [
        [0, 0.0001],
        [0.25, 0.65],
        [duration - 0.25, 0.65],
        [duration, 0.0001],
      ]);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(0);
      src.stop(duration);
    }
  });
}

function renderBirds(): Promise<string> {
  const duration = 3;
  return render(duration, (ctx) => {
    const chirpTimes = [0, 0.6, 1.3, 2.0, 2.6];
    for (const t of chirpTimes) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000, t);
      osc.frequency.linearRampToValueAtTime(3400, t + 0.06);
      osc.frequency.linearRampToValueAtTime(2200, t + 0.15);
      const gain = ctx.createGain();
      scheduleEnvelope(gain, [
        [t, 0.0001],
        [t + 0.015, 0.75],
        [t + 0.15, 0.0001],
      ]);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    }
  });
}

function renderHeartbeat(): Promise<string> {
  const duration = 2;
  return render(duration, (ctx) => {
    for (const t of [0, 1.0]) {
      thumpOsc(ctx, ctx.destination, t, 65, 0.95, 0.16);
      thumpOsc(ctx, ctx.destination, t + 0.16, 55, 0.75, 0.14);
    }
  });
}

function renderImpact(): Promise<string> {
  const duration = 0.7;
  return render(duration, (ctx) => {
    const src = noiseSource(ctx, 0.18);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.008, 0.98],
      [0.18, 0.0001],
    ]);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    src.stop(0.18);
    thumpOsc(ctx, ctx.destination, 0, 75, 0.98, 0.35);
  });
}

function renderWhoosh(): Promise<string> {
  const duration = 0.8;
  return render(duration, (ctx) => {
    const src = noiseSource(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.0;
    filter.frequency.setValueAtTime(300, 0);
    filter.frequency.exponentialRampToValueAtTime(2800, 0.35);
    filter.frequency.exponentialRampToValueAtTime(400, duration);
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.25, 0.88],
      [duration, 0.0001],
    ]);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    src.stop(duration);
  });
}

function renderWhisper(): Promise<string> {
  const duration = 1.8;
  return render(duration, (ctx) => {
    const src = noiseSource(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.8;
    filter.frequency.value = 2200;
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.2, 0.7],
      [0.6, 0.3],
      [1.1, 0.65],
      [duration, 0.0001],
    ]);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    src.stop(duration);
  });
}

function renderBell(): Promise<string> {
  const duration = 3.5;
  return render(duration, (ctx) => {
    const freqs = [440, 880, 1320, 1760];
    const amps = [0.65, 0.45, 0.25, 0.15];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.linearRampToValueAtTime(amps[i] * 0.9, 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(duration);
    });
  });
}

function renderClockTick(): Promise<string> {
  const duration = 2.0;
  return render(duration, (ctx) => {
    [0.05, 0.55, 1.05, 1.55].forEach((t, idx) => {
      const click = noiseSource(ctx, 0.03);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = idx % 2 === 0 ? 1800 : 1400;
      filter.Q.value = 8;
      const gain = ctx.createGain();
      scheduleEnvelope(gain, [
        [t, 0.0001],
        [t + 0.004, 0.85],
        [t + 0.025, 0.0001],
      ]);
      click.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      click.start(t);
      click.stop(t + 0.03);
    });
  });
}

function renderGasp(): Promise<string> {
  const duration = 0.9;
  return render(duration, (ctx) => {
    const src = noiseSource(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, 0);
    filter.frequency.linearRampToValueAtTime(1600, duration * 0.7);
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.08, 0.8],
      [duration * 0.7, 0.65],
      [duration, 0.0001],
    ]);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    src.stop(duration);
  });
}

function renderLaughter(): Promise<string> {
  const duration = 2.2;
  return render(duration, (ctx) => {
    const haTimes = [0.1, 0.45, 0.8, 1.15, 1.5];
    haTimes.forEach((t) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.linearRampToValueAtTime(260, t + 0.18);
      const gain = ctx.createGain();
      scheduleEnvelope(gain, [
        [t, 0.0001],
        [t + 0.03, 0.75],
        [t + 0.22, 0.0001],
      ]);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  });
}

function renderCrying(): Promise<string> {
  const duration = 2.5;
  return render(duration, (ctx) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(460, 0);
    osc.frequency.linearRampToValueAtTime(380, 0.8);
    osc.frequency.linearRampToValueAtTime(450, 1.4);
    osc.frequency.linearRampToValueAtTime(360, 2.4);
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.2, 0.7],
      [0.9, 0.25],
      [1.4, 0.65],
      [duration, 0.0001],
    ]);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
    osc.stop(duration);
  });
}

function renderScream(): Promise<string> {
  const duration = 1.5;
  return render(duration, (ctx) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(550, 0);
    osc.frequency.linearRampToValueAtTime(1100, 0.3);
    osc.frequency.linearRampToValueAtTime(750, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.1, 0.88],
      [duration - 0.2, 0.7],
      [duration, 0.0001],
    ]);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
    osc.stop(duration);
  });
}

function renderSwordClash(): Promise<string> {
  const duration = 1.2;
  return render(duration, (ctx) => {
    // Sharp metallic impact
    const strike = noiseSource(ctx, 0.08);
    const fStrike = ctx.createBiquadFilter();
    fStrike.type = 'highpass';
    fStrike.frequency.value = 3200;
    const gStrike = ctx.createGain();
    scheduleEnvelope(gStrike, [
      [0, 0.0001],
      [0.005, 0.95],
      [0.08, 0.0001],
    ]);
    strike.connect(fStrike);
    fStrike.connect(gStrike);
    gStrike.connect(ctx.destination);
    strike.start(0);
    strike.stop(0.08);

    // Resonant ring
    [2400, 3600].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.linearRampToValueAtTime(0.45, 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(duration);
    });
  });
}

function renderExplosion(): Promise<string> {
  const duration = 2.5;
  return render(duration, (ctx) => {
    const src = noiseSource(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, 0);
    filter.frequency.exponentialRampToValueAtTime(80, duration);
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.02, 0.98],
      [0.5, 0.7],
      [duration, 0.0001],
    ]);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    src.stop(duration);
    thumpOsc(ctx, ctx.destination, 0, 90, 1.0, 0.8);
  });
}

function renderGlassShatter(): Promise<string> {
  const duration = 1.0;
  return render(duration, (ctx) => {
    const src = noiseSource(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3500;
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.01, 0.9],
      [0.2, 0.45],
      [duration, 0.0001],
    ]);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    src.stop(duration);

    // Shatter shards ring
    [4200, 5600, 6800].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, 0);
      g.gain.linearRampToValueAtTime(0.3, 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, 0.4 + i * 0.15);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.7);
    });
  });
}

function renderGrowl(): Promise<string> {
  const duration = 2.0;
  return render(duration, (ctx) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, 0);
    osc.frequency.linearRampToValueAtTime(60, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.2, 0.88],
      [duration - 0.2, 0.88],
      [duration, 0.0001],
    ]);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
    osc.stop(duration);
  });
}

function renderMagic(): Promise<string> {
  const duration = 2.0;
  return render(duration, (ctx) => {
    const notes = [1046, 1318, 1567, 2093, 2637];
    notes.forEach((freq, idx) => {
      const t = idx * 0.12;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.95);
    });
  });
}

function renderPageTurn(): Promise<string> {
  const duration = 0.6;
  return render(duration, (ctx) => {
    const src = noiseSource(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    scheduleEnvelope(gain, [
      [0, 0.0001],
      [0.1, 0.78],
      [0.35, 0.5],
      [duration, 0.0001],
    ]);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    src.stop(duration);
  });
}

function renderHorseGallop(): Promise<string> {
  const duration = 2.2;
  return render(duration, (ctx) => {
    const clops = [0.1, 0.22, 0.6, 0.72, 1.1, 1.22, 1.6, 1.72];
    clops.forEach((t, i) => {
      const src = noiseSource(ctx, 0.06);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = i % 2 === 0 ? 420 : 360;
      filter.Q.value = 3;
      const gain = ctx.createGain();
      scheduleEnvelope(gain, [
        [t, 0.0001],
        [t + 0.008, 0.88],
        [t + 0.05, 0.0001],
      ]);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(t);
      src.stop(t + 0.06);
      thumpOsc(ctx, ctx.destination, t, i % 2 === 0 ? 120 : 100, 0.7, 0.06);
    });
  });
}

function renderChains(): Promise<string> {
  const duration = 1.8;
  return render(duration, (ctx) => {
    const clinks = [0.05, 0.25, 0.6, 0.95, 1.3];
    clinks.forEach((t) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 1600 + Math.random() * 800;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2200;
      filter.Q.value = 7;
      const gain = ctx.createGain();
      scheduleEnvelope(gain, [
        [t, 0.0001],
        [t + 0.006, 0.75],
        [t + 0.12, 0.0001],
      ]);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  });
}

export function synthesizeSoundEffect(cue: SoundEffectCue): Promise<string> {
  switch (cue) {
    case 'thunder':
      return renderThunder();
    case 'rain':
      return renderRain();
    case 'fire':
      return renderFire();
    case 'wind':
      return renderWind();
    case 'water_flow':
      return renderWaterFlow();
    case 'waves':
      return renderWaves();
    case 'footsteps':
      return renderFootsteps();
    case 'door_creak':
      return renderDoorCreak();
    case 'crowd':
      return renderCrowd();
    case 'birds':
      return renderBirds();
    case 'heartbeat':
      return renderHeartbeat();
    case 'impact':
      return renderImpact();
    case 'whoosh':
      return renderWhoosh();
    case 'whisper':
      return renderWhisper();
    case 'bell':
      return renderBell();
    case 'clock_tick':
      return renderClockTick();
    case 'gasp':
      return renderGasp();
    case 'laughter':
      return renderLaughter();
    case 'crying':
      return renderCrying();
    case 'scream':
      return renderScream();
    case 'sword_clash':
      return renderSwordClash();
    case 'explosion':
      return renderExplosion();
    case 'glass_shatter':
      return renderGlassShatter();
    case 'growl':
      return renderGrowl();
    case 'magic':
      return renderMagic();
    case 'page_turn':
      return renderPageTurn();
    case 'horse_gallop':
      return renderHorseGallop();
    case 'chains':
      return renderChains();
    default:
      return renderImpact();
  }
}
