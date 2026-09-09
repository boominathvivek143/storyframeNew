// Narration audio engine -- ElevenLabs neural voices, Gemini's prebuilt
// voices, or a neural fallback synthesizer, tried in that order with
// transparent error propagation so a failure at one tier always says why
// before the next tier is tried.

import { getGenAI } from './geminiService';

// In-memory cache for synthesized lines -- instant replay, zero re-billing
// for a line that hasn't changed since the last request.
const audioCache = new Map<string, { audioBase64: string; mimeType: string; provider?: string }>();

export const ELEVENLABS_VOICE_MAP: Record<string, string> = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
  bella: 'EXAVITQu4vr4xnSDxMaL',
  antoni: 'ErXwobaYiN019PkySvjV',
  adam: 'pNInz6obpgDQGcFmaJgB',
  josh: 'TxGEqnHWrfWFTfGW9XjX',
  elli: 'MF3mGyEYCl7XYWbV9V6O',
  domi: 'AZnzlk1XvdvUeBnXmlld',
  sam: 'yoZ06aMxZJJ28mfd3POQ',
  charlotte: 'XB0fDUnXU5powFXDhCwa',
  arnold: 'VR6AewLTigWG4xSOukaG',
  callum: 'N2lVS1w4EtoT3dr4eOWO',
  freya: 'jsCqWAovK2LkecY7zXl4',
  grace: 'oWAxZDx7w5VEj9dCyTzz',
  liam: 'TX3LPaxmHKxFdv7VOQHJ',
  matilda: 'XrExE9yKIg1WjnnlVkGX',
};

// Maps friendlier narrator archetypes to Gemini's five prebuilt voices.
export const GEMINI_PREBUILT_VOICES: Record<string, string> = {
  kore: 'Kore',
  aoede: 'Aoede',
  puck: 'Puck',
  charon: 'Charon',
  fenrir: 'Fenrir',
  narrator: 'Kore',
  warm: 'Aoede',
  upbeat: 'Puck',
  deep: 'Charon',
  gentle: 'Kore',
  mentor: 'Fenrir',
  storyteller: 'Aoede',
};

export function getMappedGeminiVoice(voiceNameOrId: string = 'narrator'): string {
  const clean = voiceNameOrId.toLowerCase().trim();
  if (GEMINI_PREBUILT_VOICES[clean]) return GEMINI_PREBUILT_VOICES[clean];
  if (clean.includes('deep') || clean.includes('male')) return 'Charon';
  if (clean.includes('upbeat') || clean.includes('energetic')) return 'Puck';
  if (clean.includes('mentor') || clean.includes('crisp')) return 'Fenrir';
  if (clean.includes('story') || clean.includes('warm')) return 'Aoede';
  return 'Kore';
}

export function extractElevenLabsVoiceId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{15,35}$/.test(trimmed)) return trimmed;
  const urlParamMatch = trimmed.match(/[?&](?:voice|id|voice_id|v)=([a-zA-Z0-9_-]{15,35})/i);
  if (urlParamMatch?.[1]) return urlParamMatch[1];
  const pathSegments = trimmed.split(/[/\\?#&]/).filter(Boolean);
  for (let i = pathSegments.length - 1; i >= 0; i--) {
    if (/^[a-zA-Z0-9_-]{18,35}$/.test(pathSegments[i])) return pathSegments[i];
  }
  const match = trimmed.match(/([a-zA-Z0-9_-]{20,35})/);
  return match?.[1] || null;
}

function splitTextIntoChunks(text: string, maxLength = 180): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxLength) return [trimmed];
  const sentences = trimmed.match(/[^.!?\n\u0964\u0965]+[.!?\n\u0964\u0965]+/g) || [trimmed];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length <= maxLength) {
      current += (current ? ' ' : '') + sentence.trim();
    } else {
      if (current) chunks.push(current);
      if (sentence.length <= maxLength) {
        current = sentence.trim();
      } else {
        const words = sentence.split(' ');
        let wordChunk = '';
        for (const word of words) {
          if ((wordChunk + ' ' + word).length <= maxLength) {
            wordChunk += (wordChunk ? ' ' : '') + word;
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = word;
          }
        }
        current = wordChunk;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.filter((c) => c.length > 0);
}

export function detectLanguageCode(text: string, ttsLangCode: string = 'en-US'): string {
  // Check Unicode script ranges first:
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
  if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi
  if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(text)) return 'ja'; // Japanese

  const lower = (ttsLangCode || '').toLowerCase().trim();
  if (lower.startsWith('te')) return 'te';
  if (lower.startsWith('kn')) return 'kn';
  if (lower.startsWith('ml')) return 'ml';
  if (lower.startsWith('ta')) return 'ta';
  if (lower.startsWith('hi')) return 'hi';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('ja')) return 'ja';
  return ttsLangCode || 'en-US';
}

async function fetchNeuralTTSAudio(text: string, langCode: string): Promise<Buffer> {
  const chunks = splitTextIntoChunks(text, 180);
  if (chunks.length === 0) throw new Error('Empty text for TTS');
  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    const encoded = encodeURIComponent(chunk);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encoded}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
        Accept: 'audio/mpeg, audio/*;q=0.9',
      },
    });
    if (!response.ok) throw new Error(`TTS request failed with status: ${response.statusText}`);
    buffers.push(Buffer.from(await response.arrayBuffer()));
  }
  return Buffer.concat(buffers);
}

async function fetchGeminiSpeechAudio(
  text: string,
  voiceName: string,
  geminiApiKey?: string | null
): Promise<{ audioBase64: string; mimeType: string; voiceName: string; error?: undefined } | { error: string; audioBase64?: undefined; mimeType?: undefined; voiceName?: undefined }> {
  const ai = getGenAI(geminiApiKey);
  if (!ai) return { error: 'No Gemini API key configured' };

  const prebuiltVoice = getMappedGeminiVoice(voiceName);
  const contents = `Read the following narration aloud in a natural, expressive storyteller's voice:\n\n"${text}"`;
  const config = {
    responseModalities: ['AUDIO'],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: prebuiltVoice } } },
  };

  const modelsToTry = ['gemini-flash-latest', 'gemini-3.7-flash'];
  let lastError: string | undefined;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({ model, contents, config });
      const part = response.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData?.data && (p.inlineData?.mimeType?.startsWith('audio/') || !p.inlineData?.mimeType)
      );
      if (part?.inlineData?.data) {
        return { audioBase64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'audio/wav', voiceName: prebuiltVoice };
      }
      lastError = 'Gemini returned no audio data';
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }
  return { error: lastError || 'Gemini audio generation failed' };
}

export function sanitizeElevenLabsKey(key?: string): string {
  const candidate = key && typeof key === 'string' && key.trim() ? key : process.env.ELEVENLABS_API_KEY;
  if (!candidate || typeof candidate !== 'string') return '';
  return candidate.trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
}

export function isValidElevenLabsKey(key?: string): boolean {
  const sanitized = sanitizeElevenLabsKey(key);
  if (!sanitized || sanitized.length < 15) return false;
  const lower = sanitized.toLowerCase();
  return !['your_', 'placeholder', 'undefined', 'null', 'elevenlabs_api_key'].some((bad) => lower.includes(bad));
}

function extractRawElevenLabsError(status: number, bodyText: string): { message: string } {
  try {
    const parsed = JSON.parse(bodyText);
    const detail = parsed.detail || parsed.error || parsed;
    const detailMsg = typeof detail === 'string' ? detail : detail?.message || detail?.status || JSON.stringify(detail);
    if (status === 401) return { message: `[ElevenLabs 401] ${detailMsg || 'Invalid API key'}. Check your key at elevenlabs.io/app/settings/api-keys` };
    if (status === 402) return { message: `[ElevenLabs 402] ${detailMsg || 'Paid plan required for this voice.'}` };
    if (status === 429) return { message: `[ElevenLabs 429] Quota or rate limit exceeded. ${detailMsg}` };
    if (status === 404) return { message: `[ElevenLabs 404] Voice ID not found. ${detailMsg}` };
    return { message: `[ElevenLabs ${status}] ${detailMsg || bodyText}` };
  } catch {
    return { message: `[ElevenLabs ${status}] ${bodyText || 'Unknown response from ElevenLabs API'}` };
  }
}

export async function fetchElevenLabsAudio(text: string, voiceId: string, apiKey?: string): Promise<Buffer> {
  const key = sanitizeElevenLabsKey(apiKey);
  if (!key) throw new Error('No ElevenLabs API key provided');
  const cleanVoiceId = (extractElevenLabsVoiceId(voiceId) || voiceId.trim()).replace(/['"\s]/g, '') || '21m00Tcm4TlvDq8ikWAM';
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${cleanVoiceId}`;
  const headers = {
    'Content-Type': 'application/json',
    'xi-api-key': key,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'audio/mpeg',
  };

  let response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75, use_speaker_boost: true } }),
  });

  if (!response.ok && (response.status === 400 || response.status === 422)) {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, model_id: 'eleven_turbo_v2_5', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    });
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(extractRawElevenLabsError(response.status, errText).message);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function testElevenLabsApiKey(apiKey?: string): Promise<{ valid: boolean; message: string; voiceCount?: number; tier?: string }> {
  const key = sanitizeElevenLabsKey(apiKey);
  if (!key) return { valid: false, message: 'No API key provided. Paste your ElevenLabs API key from elevenlabs.io/app/settings/api-keys' };

  const headers = { 'xi-api-key': key, 'User-Agent': 'storyframe', Accept: 'application/json' };
  try {
    const [userRes, voicesRes] = await Promise.all([
      fetch('https://api.elevenlabs.io/v1/user', { headers }).catch((e) => ({ ok: false, status: 500, statusText: e.message } as any)),
      fetch('https://api.elevenlabs.io/v1/voices', { headers }).catch((e) => ({ ok: false, status: 500, statusText: e.message } as any)),
    ]);
    const isAuthorized = userRes.ok || voicesRes.ok;
    const isQuotaExceeded = userRes.status === 402 || voicesRes.status === 402 || userRes.status === 429 || voicesRes.status === 429;
    if (!isAuthorized && !isQuotaExceeded) {
      const errRes = userRes.status !== 500 ? userRes : voicesRes;
      const errText = typeof errRes.text === 'function' ? await errRes.text().catch(() => '') : '';
      return { valid: false, message: extractRawElevenLabsError(errRes.status || 401, errText).message };
    }
    let tier = 'standard';
    let voiceCount = 0;
    if (userRes.ok && typeof (userRes as any).json === 'function') {
      const userData = await (userRes as any).json().catch(() => ({}));
      tier = userData?.subscription?.tier || 'standard';
    }
    if (voicesRes.ok && typeof (voicesRes as any).json === 'function') {
      const voicesData = await (voicesRes as any).json().catch(() => ({ voices: [] }));
      voiceCount = (voicesData.voices || []).length;
    }
    return { valid: true, message: `ElevenLabs verified (${tier.toUpperCase()}) • ${voiceCount || 'all'} voices available`, voiceCount, tier };
  } catch (err: any) {
    return { valid: false, message: err?.message || 'Network error connecting to ElevenLabs API' };
  }
}

export async function fetchElevenLabsVoicesList(apiKey?: string): Promise<any[]> {
  const key = sanitizeElevenLabsKey(apiKey);
  if (!key) throw new Error('ElevenLabs API key is required to fetch voices');
  const response = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key, 'User-Agent': 'storyframe', Accept: 'application/json' } });
  if (!response.ok) throw new Error(extractRawElevenLabsError(response.status, await response.text().catch(() => '')).message);
  const data = await response.json();
  return (data.voices || []).map((v: any) => ({
    id: v.voice_id,
    voice_id: v.voice_id,
    name: v.name,
    gender: v.labels?.gender || 'unspecified',
    accent: v.labels?.accent || v.labels?.description || 'ElevenLabs Neural',
    style: v.labels?.description || (v.category === 'cloned' ? 'Custom cloned voice' : 'Studio narrator'),
    category: 'elevenlabs',
    preview_url: v.preview_url,
  }));
}

/**
 * Resolve narration audio via ElevenLabs, Gemini audio, or a neural
 * fallback synthesizer -- in that order -- returning an honest reason for
 * every fallback taken instead of silently swapping providers.
 */
export async function generateSpeechAudio(
  text: string,
  voiceNameOrId: string = 'narrator',
  elevenLabsApiKey?: string,
  geminiApiKey?: string | null,
  ttsLangCode: string = 'en-US'
): Promise<{ audioBase64: string; mimeType: string; provider: 'gemini' | 'elevenlabs' | 'neural_fallback'; voiceName: string; usedFallback?: boolean; fallbackReason?: string }> {
  const cleanText = text.trim();
  if (!cleanText) throw new Error('Text cannot be empty');

  const effectiveLang = detectLanguageCode(cleanText, ttsLangCode);
  const isSouthIndianDravidian = ['te', 'kn', 'ml'].includes(effectiveLang);
  const isIndicLanguage = ['te', 'kn', 'ml', 'ta', 'hi'].includes(effectiveLang);

  const langDisplayNames: Record<string, string> = {
    te: 'Telugu',
    kn: 'Kannada',
    ml: 'Malayalam',
    ta: 'Tamil',
    hi: 'Hindi',
    ja: 'Japanese',
    es: 'Spanish',
    fr: 'French',
    en: 'English',
  };
  const langName = langDisplayNames[effectiveLang] || effectiveLang.toUpperCase();

  // South Indian languages (Telugu, Kannada, Malayalam) are NOT supported
  // by ElevenLabs Multilingual v2, and Gemini prebuilt voices (Aoede, Kore, etc.)
  // are American voice models that pronounce them with a heavy foreign accent.
  // Google Neural TTS has dedicated native regional speakers for te, kn, and ml,
  // providing authentic native-accent pronunciation.
  if (isSouthIndianDravidian) {
    const regionalCacheKey = `neural:${effectiveLang}:${voiceNameOrId}:${cleanText}`;
    const cached = audioCache.get(regionalCacheKey);
    if (cached) {
      return {
        audioBase64: cached.audioBase64,
        mimeType: cached.mimeType,
        provider: 'neural_fallback',
        voiceName: `${langName} Native Voice`,
        usedFallback: false,
        fallbackReason: undefined,
      };
    }
    const buffer = await fetchNeuralTTSAudio(cleanText, effectiveLang);
    const result = {
      audioBase64: buffer.toString('base64'),
      mimeType: 'audio/mpeg',
      provider: 'neural_fallback' as const,
      voiceName: `${langName} Native Voice`,
      usedFallback: false,
      fallbackReason: undefined,
    };
    audioCache.set(regionalCacheKey, { audioBase64: result.audioBase64, mimeType: result.mimeType, provider: 'neural_fallback' });
    return result;
  }

  const extractedVoiceId = extractElevenLabsVoiceId(voiceNameOrId);
  const matchedElevenVoiceId = extractedVoiceId || ELEVENLABS_VOICE_MAP[voiceNameOrId.toLowerCase().trim()];
  const apiKeyToUse = sanitizeElevenLabsKey(elevenLabsApiKey);
  let recordedElevenError: string | undefined;

  // ElevenLabs supports Tamil and Hindi in multilingual_v2, alongside European/Japanese languages
  if (matchedElevenVoiceId) {
    if (isValidElevenLabsKey(apiKeyToUse)) {
      const cacheKey = `elevenlabs:${matchedElevenVoiceId}:${effectiveLang}:${cleanText}`;
      const cached = audioCache.get(cacheKey);
      if (cached) return { audioBase64: cached.audioBase64, mimeType: cached.mimeType, provider: 'elevenlabs', voiceName: voiceNameOrId };
      try {
        const buffer = await fetchElevenLabsAudio(cleanText, matchedElevenVoiceId, apiKeyToUse);
        const result = { audioBase64: buffer.toString('base64'), mimeType: 'audio/mpeg', provider: 'elevenlabs' as const, voiceName: voiceNameOrId };
        audioCache.set(cacheKey, result);
        return result;
      } catch (err: any) {
        recordedElevenError = err?.message || String(err);
      }
    } else {
      recordedElevenError = 'ElevenLabs isn\'t configured on this server.';
    }
  }

  // If language is Tamil or Hindi and ElevenLabs wasn't used/available,
  // Google Neural TTS provides native Tamil/Hindi speakers, whereas Gemini prebuilt
  // voices (Aoede, Kore, etc.) are American English actors and sound foreign.
  if (isIndicLanguage && !matchedElevenVoiceId) {
    const regionalCacheKey = `neural:${effectiveLang}:${voiceNameOrId}:${cleanText}`;
    const cached = audioCache.get(regionalCacheKey);
    if (cached) {
      return {
        audioBase64: cached.audioBase64,
        mimeType: cached.mimeType,
        provider: 'neural_fallback',
        voiceName: `${langName} Native Voice`,
        usedFallback: false,
        fallbackReason: undefined,
      };
    }
    const buffer = await fetchNeuralTTSAudio(cleanText, effectiveLang);
    const result = {
      audioBase64: buffer.toString('base64'),
      mimeType: 'audio/mpeg',
      provider: 'neural_fallback' as const,
      voiceName: `${langName} Native Voice`,
      usedFallback: false,
      fallbackReason: undefined,
    };
    audioCache.set(regionalCacheKey, { audioBase64: result.audioBase64, mimeType: result.mimeType, provider: 'neural_fallback' });
    return result;
  }

  const geminiVoice = getMappedGeminiVoice(voiceNameOrId);
  const geminiCacheKey = `gemini:${geminiVoice}:${effectiveLang}:${cleanText}`;
  const cachedGemini = audioCache.get(geminiCacheKey);
  if (cachedGemini) {
    return {
      audioBase64: cachedGemini.audioBase64,
      mimeType: cachedGemini.mimeType,
      provider: 'gemini',
      voiceName: geminiVoice,
      usedFallback: Boolean(recordedElevenError),
      fallbackReason: recordedElevenError ? `Switched from ElevenLabs to Gemini voice (${geminiVoice})` : undefined,
    };
  }

  const hasGeminiKey = Boolean(getGenAI(geminiApiKey));
  const geminiResult = await fetchGeminiSpeechAudio(cleanText, geminiVoice, geminiApiKey);
  if (geminiResult.audioBase64) {
    audioCache.set(geminiCacheKey, { audioBase64: geminiResult.audioBase64, mimeType: geminiResult.mimeType, provider: 'gemini' });
    return {
      audioBase64: geminiResult.audioBase64,
      mimeType: geminiResult.mimeType,
      provider: 'gemini',
      voiceName: geminiResult.voiceName,
      usedFallback: Boolean(recordedElevenError),
      fallbackReason: recordedElevenError ? `ElevenLabs error: ${recordedElevenError}. Generated with Gemini voice (${geminiResult.voiceName}).` : undefined,
    };
  }
  const geminiError = geminiResult.error;

  const isQuotaExceeded = (err?: string) => Boolean(err && /RESOURCE_EXHAUSTED|spending cap|quota exceeded|429/i.test(err));
  const isRateLimited = (err?: string) => Boolean(err && !isQuotaExceeded(err) && /UNAVAILABLE|high demand|503|overloaded/i.test(err));
  const buildFallbackReason = (): string => {
    if (recordedElevenError) return recordedElevenError;
    if (matchedElevenVoiceId && !isValidElevenLabsKey(apiKeyToUse)) return 'ElevenLabs isn\'t configured on this server.';
    if (!hasGeminiKey && !matchedElevenVoiceId) return 'AI voice generation isn\'t configured on this server yet.';
    if (hasGeminiKey && isQuotaExceeded(geminiError)) return 'Your Gemini project has exceeded its spending cap. Using the default synthesizer for now.';
    if (hasGeminiKey && isRateLimited(geminiError)) return 'Gemini is experiencing high demand right now -- try again shortly. Using the default synthesizer for now.';
    if (hasGeminiKey) return `Gemini voice generation failed${geminiError ? `: ${geminiError}` : ''}. Using the default synthesizer instead.`;
    return 'Default synthesizer active.';
  };

  const fallbackCacheKey = `neural:${effectiveLang}:${voiceNameOrId}:${cleanText}`;
  const cachedFallback = audioCache.get(fallbackCacheKey);
  if (cachedFallback) {
    return { audioBase64: cachedFallback.audioBase64, mimeType: cachedFallback.mimeType, provider: 'neural_fallback', voiceName: voiceNameOrId, usedFallback: true, fallbackReason: buildFallbackReason() };
  }

  const buffer = await fetchNeuralTTSAudio(cleanText, effectiveLang);
  const result = { audioBase64: buffer.toString('base64'), mimeType: 'audio/mpeg', provider: 'neural_fallback' as const, voiceName: voiceNameOrId, usedFallback: true, fallbackReason: buildFallbackReason() };
  audioCache.set(fallbackCacheKey, { audioBase64: result.audioBase64, mimeType: result.mimeType, provider: 'neural_fallback' });
  return result;
}
