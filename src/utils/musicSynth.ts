// Procedural ambient background-music beds -- there's no bundled audio
// asset library or backend storage to host real music files, so each
// built-in track is synthesized live with the Web Audio API instead: a
// handful of detuned oscillators through a slow filter sweep, distinct
// per track. Genuinely plays and loops for free, with zero asset weight.
// A "custom" track instead plays a user-supplied URL through a plain
// <audio> element (see MusicController.setCustomUrl).

type TrackId = 'none' | 'gentle_piano' | 'ambient_strings' | 'soft_pulse' | 'custom';

interface TrackRecipe {
  baseFreqs: number[];
  waveform: OscillatorType;
  filterHz: number;
  lfoHz: number;
  gain: number;
}

const RECIPES: Record<Exclude<TrackId, 'none' | 'custom'>, TrackRecipe> = {
  gentle_piano: { baseFreqs: [261.63, 329.63, 392.0], waveform: 'triangle', filterHz: 1800, lfoHz: 0.06, gain: 0.05 },
  ambient_strings: { baseFreqs: [196.0, 246.94, 293.66, 392.0], waveform: 'sawtooth', filterHz: 900, lfoHz: 0.03, gain: 0.045 },
  soft_pulse: { baseFreqs: [130.81, 196.0, 261.63], waveform: 'square', filterHz: 700, lfoHz: 0.9, gain: 0.035 },
};

export class MusicController {
  private ctx: AudioContext | null = null;
  private nodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private customAudio: HTMLAudioElement | null = null;
  private duckLevel = 1;
  private baseVolume = 0.18;

  // Video export needs this bed's audio flowing into the SAME AudioContext
  // (and an extra MediaStreamAudioDestinationNode) as the narration lines,
  // so they can be captured together into one recording -- Web Audio nodes
  // can't be connected across two different AudioContext instances. Live
  // playback leaves both unset and gets its own private context as before.
  constructor(private externalCtx?: AudioContext, private recordDestination?: AudioNode) {}

  private getCtx(): AudioContext {
    if (this.externalCtx) return this.externalCtx;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  play(track: TrackId, volume: number, customUrl?: string) {
    this.stop();
    this.baseVolume = volume;
    if (track === 'none') return;

    if (track === 'custom') {
      if (!customUrl) return;
      const audio = new Audio(customUrl);
      audio.loop = true;
      audio.volume = volume * this.duckLevel;
      audio.play().catch(() => {});
      this.customAudio = audio;
      return;
    }

    const recipe = RECIPES[track];
    const ctx = this.getCtx();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const master = ctx.createGain();
    master.gain.value = volume * this.duckLevel;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = recipe.filterHz;
    filter.connect(master);
    // Recording mode routes ONLY to the capture destination (no speaker
    // output) -- the export flow renders the whole story in a hidden pass
    // instead of playing it audibly, since that's an implementation detail
    // of how the recording happens, not something to make the user sit
    // through hearing.
    master.connect(this.recordDestination || ctx.destination);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = recipe.lfoHz;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = recipe.filterHz * 0.35;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const voices = recipe.baseFreqs.map((freq) => {
      const osc = ctx.createOscillator();
      osc.type = recipe.waveform;
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = recipe.gain;
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      return { osc, gain };
    });

    this.masterGain = master;
    this.filter = filter;
    this.lfo = lfo;
    this.nodes = voices;
  }

  setVolume(volume: number) {
    this.baseVolume = volume;
    if (this.masterGain) this.masterGain.gain.value = volume * this.duckLevel;
    if (this.customAudio) this.customAudio.volume = volume * this.duckLevel;
  }

  // Called while narration audio is playing to duck the bed under it, and
  // again when narration ends to bring it back up -- both ramped, not
  // instant, so it doesn't pop.
  duck(active: boolean) {
    this.duckLevel = active ? 0.28 : 1;
    const target = this.baseVolume * this.duckLevel;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.4);
    }
    if (this.customAudio) this.customAudio.volume = target;
  }

  stop() {
    this.nodes.forEach(({ osc }) => {
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
    });
    this.nodes = [];
    if (this.lfo) {
      try {
        this.lfo.stop();
      } catch {
        /* already stopped */
      }
    }
    this.lfo = null;
    this.masterGain = null;
    this.filter = null;
    if (this.customAudio) {
      this.customAudio.pause();
      this.customAudio = null;
    }
  }
}
