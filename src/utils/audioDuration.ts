// Measures a narration clip's real length client-side (the server never
// returns one -- /api/voice/generate only hands back the audio bytes).
// Playback trusts this value to know how long to hold a slide, so an
// unmeasured or wrong duration here directly means narration gets cut off
// mid-sentence by the safety-net timer in SlideshowPlayer/videoExport.
export function measureAudioDuration(dataUrl: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const audio = new Audio();
    let settled = false;
    const finish = (value: number | undefined) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(value);
    };
    const timeoutId = setTimeout(() => finish(undefined), 8000);

    audio.addEventListener('error', () => finish(undefined));
    audio.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        finish(audio.duration);
        return;
      }
      // Some browsers report Infinity for certain MP3 data until a seek
      // forces a real duration recalculation -- nudge it once before
      // giving up entirely.
      const onDurationChange = () => {
        audio.removeEventListener('durationchange', onDurationChange);
        finish(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : undefined);
      };
      audio.addEventListener('durationchange', onDurationChange);
      audio.currentTime = 1e7;
    });

    audio.src = dataUrl;
  });
}
