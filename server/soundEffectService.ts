// AI-generated sound effects via ElevenLabs' sound-generation API --
// distinct from its text-to-speech endpoint (ttsService.ts): this one
// takes a plain description ("a crackling wood fire") and returns a short
// non-speech audio clip. Requires an ElevenLabs key; the client falls
// back to a procedural synth (src/utils/sfxSynth.ts) when this fails or
// no key is configured, so a failure here is never fatal to the feature.
import { sanitizeElevenLabsKey, isValidElevenLabsKey } from './ttsService';

const sfxCache = new Map<string, { audioBase64: string; mimeType: string }>();

export async function generateSoundEffectAudio(prompt: string, elevenLabsApiKey?: string): Promise<{ audioBase64: string; mimeType: string }> {
  const key = sanitizeElevenLabsKey(elevenLabsApiKey);
  if (!isValidElevenLabsKey(key)) {
    throw new Error('ElevenLabs API key is not configured or invalid. Add it in Voice studio to generate AI sound effects -- otherwise the procedural fallback is used automatically.');
  }

  const cached = sfxCache.get(prompt);
  if (cached) return cached;

  const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': key,
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({ text: prompt, duration_seconds: 4, prompt_influence: 0.35 }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    let detail = errText;
    try {
      const parsed = JSON.parse(errText);
      detail = parsed.detail?.message || parsed.detail || parsed.message || errText;
    } catch {
      /* not JSON, use raw text */
    }
    throw new Error(`[ElevenLabs sound-generation ${response.status}] ${detail || response.statusText || 'Request failed'}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const result = { audioBase64: buffer.toString('base64'), mimeType: 'audio/mpeg' };
  sfxCache.set(prompt, result);
  return result;
}
