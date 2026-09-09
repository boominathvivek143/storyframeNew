export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  // Google Translate TTS language code, used by the neural-fallback voice
  // path (translate.google.com/translate_tts?tl=...) so pronunciation
  // actually matches the translated text instead of defaulting to English.
  ttsLangCode: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', ttsLangCode: 'en-US' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', ttsLangCode: 'es' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', ttsLangCode: 'fr' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', ttsLangCode: 'hi' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', ttsLangCode: 'ta' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', ttsLangCode: 'te' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', ttsLangCode: 'kn' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', ttsLangCode: 'ml' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', ttsLangCode: 'ja' },
];

export function getLanguageOption(code?: string): LanguageOption {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) || SUPPORTED_LANGUAGES[0];
}
