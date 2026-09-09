import { VOICE_OPTIONS } from '../data/presets';
import { VoiceOption } from '../types';

const CUSTOM_VOICES_KEY = 'storyframe_custom_voices';

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

export function getCustomVoices(): VoiceOption[] {
  try {
    const raw = localStorage.getItem(CUSTOM_VOICES_KEY);
    return raw ? (JSON.parse(raw) as VoiceOption[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomVoice(voice: VoiceOption): void {
  const current = getCustomVoices().filter((v) => v.id !== voice.id && v.voice_id !== (voice.voice_id || voice.id));
  localStorage.setItem(CUSTOM_VOICES_KEY, JSON.stringify([...current, voice]));
}

export function saveMultipleCustomVoices(voices: VoiceOption[]): void {
  const current = getCustomVoices();
  const map = new Map<string, VoiceOption>();
  for (const v of current) {
    map.set(v.id, v);
    if (v.voice_id) map.set(v.voice_id, v);
  }
  for (const v of voices) {
    map.set(v.id, v);
  }
  const unique = Array.from(new Set(map.values()));
  localStorage.setItem(CUSTOM_VOICES_KEY, JSON.stringify(unique));
}

export function deleteCustomVoice(voiceId: string): void {
  const current = getCustomVoices().filter((v) => v.id !== voiceId && v.voice_id !== voiceId);
  localStorage.setItem(CUSTOM_VOICES_KEY, JSON.stringify(current));
}

export function getAllAvailableVoices(): VoiceOption[] {
  return [...VOICE_OPTIONS, ...getCustomVoices()];
}

/**
 * Downloads all custom voices as a formatted JSON file.
 * If no custom voices exist, exports a helpful starter template.
 */
export function downloadCustomVoicesJson(): void {
  const customVoices = getCustomVoices();
  const voicesToExport =
    customVoices.length > 0
      ? customVoices
      : [
          {
            id: 'custom_example_1',
            voice_id: '21m00Tcm4TlvDq8ikWAM',
            name: 'Example Custom Voice',
            gender: 'female',
            style: 'Expressive storyteller',
            accent: 'American',
            category: 'elevenlabs',
            sample_text: 'Once upon a time in a land far away...',
            is_custom: true,
          } as VoiceOption,
        ];

  const exportPayload = {
    version: '1.0',
    app: 'storyframe',
    exported_at: new Date().toISOString(),
    total_voices: voicesToExport.length,
    voices: voicesToExport,
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `custom_voices_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Normalizes and imports custom voices from a JSON string or object.
 * Supports various formats:
 * - { voices: VoiceOption[] }
 * - { custom_voices: VoiceOption[] }
 * - VoiceOption[]
 * - Single VoiceOption object
 */
export function importCustomVoicesFromJson(rawInput: string | object): {
  success: boolean;
  importedCount: number;
  error?: string;
} {
  try {
    let parsed: any = rawInput;
    if (typeof rawInput === 'string') {
      const trimmed = rawInput.trim();
      if (!trimmed) return { success: false, importedCount: 0, error: 'File is empty' };
      parsed = JSON.parse(trimmed);
    }

    let candidates: any[] = [];
    if (Array.isArray(parsed)) {
      candidates = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.voices)) {
        candidates = parsed.voices;
      } else if (Array.isArray(parsed.custom_voices)) {
        candidates = parsed.custom_voices;
      } else if (Array.isArray(parsed.data)) {
        candidates = parsed.data;
      } else if (parsed.voice_id || parsed.id || parsed.voiceId) {
        // Single voice object
        candidates = [parsed];
      }
    }

    if (!candidates || candidates.length === 0) {
      return { success: false, importedCount: 0, error: 'No voice definitions found in JSON' };
    }

    const validVoices: VoiceOption[] = [];
    for (const item of candidates) {
      if (!item || typeof item !== 'object') continue;
      const rawId = item.voice_id || item.voiceId || item.id;
      const extracted = extractElevenLabsVoiceId(String(rawId || ''));
      const voiceId = extracted || (rawId ? String(rawId).trim() : null);
      if (!voiceId) continue;

      const name = item.name ? String(item.name).trim() : `Custom (${voiceId.slice(0, 6)}…)`;
      const gender = ['female', 'male', 'unspecified'].includes(item.gender) ? item.gender : 'unspecified';
      const category = item.category === 'gemini' ? 'gemini' : 'elevenlabs';
      const style = item.style ? String(item.style).trim() : 'Custom voice';
      const accent = item.accent ? String(item.accent).trim() : 'Custom';
      const sample_text = item.sample_text || item.sampleText || 'Once upon a time in a land far away...';

      validVoices.push({
        id: voiceId,
        voice_id: voiceId,
        name,
        gender,
        style,
        accent,
        category,
        sample_text,
        is_custom: true,
      });
    }

    if (validVoices.length === 0) {
      return { success: false, importedCount: 0, error: 'No valid voice objects with IDs found in JSON' };
    }

    saveMultipleCustomVoices(validVoices);
    return { success: true, importedCount: validVoices.length };
  } catch (err: any) {
    return { success: false, importedCount: 0, error: err?.message || 'Invalid JSON format' };
  }
}
