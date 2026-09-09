import { CaptionConfig, CaptionPresetId, WatermarkConfig } from '../types';

export interface CaptionPresetItem {
  id: CaptionPresetId;
  name: string;
  category: 'viral' | 'creator' | 'modern' | 'minimal' | 'vintage';
  previewWords: { text: string; isHighlight?: boolean; isBadge?: boolean; badgeBg?: string }[];
  config: Omit<CaptionConfig, 'enabled'>;
  tagline: string;
}

export const DEFAULT_CAPTION_CONFIG: CaptionConfig = {
  enabled: true,
  preset_id: 'modern',
  font_family: 'Montserrat, sans-serif',
  font_size: 32,
  font_weight: '800',
  text_case: 'normal',
  text_color: '#FFFFFF',
  highlight_color: '#FACC15',
  highlight_style: 'color',
  box_style: 'pill',
  box_color: '#5B45FF',
  box_opacity: 0.92,
  border_color: 'rgba(255, 255, 255, 0.25)',
  border_width: 1,
  stroke_color: '#000000',
  stroke_width: 2.5,
  shadow_type: 'soft',
  shadow_color: 'rgba(0, 0, 0, 0.75)',
  position_y: 0.82,
  max_words_per_line: 4,
  animation_mode: 'karaoke',
};

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  enabled: false,
  type: 'text',
  text: '@yourname',
  size: 16,
  opacity: 0.85,
  position: 'top_right',
  show_pill_backdrop: true,
  pill_color: 'rgba(15, 12, 10, 0.75)',
  text_color: '#FFFFFF',
};

export const CAPTION_PRESETS: CaptionPresetItem[] = [
  {
    id: 'modern', name: 'Modern', category: 'modern',
    tagline: 'Vibrant indigo-purple pill with bright yellow accent',
    previewWords: [{ text: 'Mod' }, { text: 'ern', isHighlight: true }],
    config: { preset_id: 'modern', font_family: 'Montserrat, sans-serif', font_size: 32, font_weight: '800', text_case: 'normal', text_color: '#FFFFFF', highlight_color: '#FACC15', highlight_style: 'color', box_style: 'pill', box_color: '#6046FF', box_opacity: 0.95, border_color: 'rgba(255,255,255,0.3)', border_width: 1.5, stroke_color: '#000000', stroke_width: 2, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.6)', position_y: 0.82, max_words_per_line: 4, animation_mode: 'karaoke' },
  },
  {
    id: 'corporate', name: 'Corporate', category: 'creator',
    tagline: 'Dark slate pill with clean cyan / teal highlight',
    previewWords: [{ text: 'Corpor' }, { text: 'ate', isHighlight: true }],
    config: { preset_id: 'corporate', font_family: 'Inter, sans-serif', font_size: 30, font_weight: '700', text_case: 'normal', text_color: '#FFFFFF', highlight_color: '#2DD4BF', highlight_style: 'color', box_style: 'pill', box_color: '#1E293B', box_opacity: 0.88, border_color: 'rgba(148,163,184,0.25)', border_width: 1, stroke_color: '#000000', stroke_width: 1.5, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.5)', position_y: 0.82, max_words_per_line: 4, animation_mode: 'karaoke' },
  },
  {
    id: 'classic', name: 'Classic', category: 'modern',
    tagline: 'Charcoal backdrop with rich amber serif typography',
    previewWords: [{ text: 'Clas' }, { text: 'sic', isHighlight: true }],
    config: { preset_id: 'classic', font_family: 'Playfair Display, Georgia, serif', font_size: 30, font_weight: '700', text_case: 'normal', text_color: '#FFFFFF', highlight_color: '#F59E0B', highlight_style: 'color', box_style: 'pill', box_color: '#1C1917', box_opacity: 0.9, border_color: 'rgba(245,158,11,0.35)', border_width: 1.5, stroke_color: '#000000', stroke_width: 2, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.8)', position_y: 0.82, max_words_per_line: 4, animation_mode: 'karaoke' },
  },
  {
    id: 'leon', name: 'LEON', category: 'viral',
    tagline: 'Block uppercase with high-contrast orange box badge',
    previewWords: [{ text: 'LE' }, { text: 'ON', isHighlight: true, isBadge: true, badgeBg: '#F97316' }],
    config: { preset_id: 'leon', font_family: 'Impact, Arial Black, sans-serif', font_size: 34, font_weight: '900', text_case: 'uppercase', text_color: '#FFFFFF', highlight_color: '#000000', highlight_style: 'badge', box_style: 'word_badge', box_color: '#F97316', box_opacity: 1, border_color: '#000000', border_width: 2, stroke_color: '#000000', stroke_width: 3.5, shadow_type: 'heavy_3d', shadow_color: '#000000', position_y: 0.8, max_words_per_line: 3, animation_mode: 'pop' },
  },
  {
    id: 'ali', name: 'ALI', category: 'creator',
    tagline: 'Clean solid white container with dark charcoal bold font',
    previewWords: [{ text: 'ALI', isBadge: true, badgeBg: '#FFFFFF' }],
    config: { preset_id: 'ali', font_family: 'Montserrat, sans-serif', font_size: 30, font_weight: '900', text_case: 'uppercase', text_color: '#0F172A', highlight_color: '#000000', highlight_style: 'box', box_style: 'box', box_color: '#FFFFFF', box_opacity: 0.98, border_color: 'rgba(0,0,0,0.15)', border_width: 1, stroke_color: 'transparent', stroke_width: 0, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.4)', position_y: 0.82, max_words_per_line: 3, animation_mode: 'karaoke' },
  },
  {
    id: 'hormozi', name: 'HORMOZI', category: 'viral',
    tagline: 'Heavy stroke & electric green highlight word',
    previewWords: [{ text: 'HOR' }, { text: 'MOZI', isHighlight: true }],
    config: { preset_id: 'hormozi', font_family: 'Impact, Montserrat Black, sans-serif', font_size: 36, font_weight: '900', text_case: 'uppercase', text_color: '#FFFFFF', highlight_color: '#22C55E', highlight_style: 'color', box_style: 'none', box_color: 'rgba(0,0,0,0.6)', box_opacity: 0, stroke_color: '#000000', stroke_width: 4.5, shadow_type: 'heavy_3d', shadow_color: '#000000', position_y: 0.78, max_words_per_line: 3, animation_mode: 'pop' },
  },
  {
    id: 'hormozi2', name: 'HORMOZI 2', category: 'viral',
    tagline: '3D heavy drop-shadow with emerald accent',
    previewWords: [{ text: 'HORMOZI' }, { text: '2', isHighlight: true }],
    config: { preset_id: 'hormozi2', font_family: 'Montserrat Black, Impact, sans-serif', font_size: 36, font_weight: '900', text_case: 'uppercase', text_color: '#FFFFFF', highlight_color: '#10B981', highlight_style: 'glow', box_style: 'pill', box_color: '#111827', box_opacity: 0.85, border_color: 'rgba(16,185,129,0.4)', border_width: 2, stroke_color: '#000000', stroke_width: 4, shadow_type: 'heavy_3d', shadow_color: '#000000', position_y: 0.78, max_words_per_line: 3, animation_mode: 'karaoke' },
  },
  {
    id: 'dd', name: 'DD', category: 'modern',
    tagline: 'Teal rounded pill badge with crisp white lettering',
    previewWords: [{ text: 'DD', isBadge: true, badgeBg: '#0D9488' }],
    config: { preset_id: 'dd', font_family: 'Inter, sans-serif', font_size: 32, font_weight: '900', text_case: 'uppercase', text_color: '#FFFFFF', highlight_color: '#5EEAD4', highlight_style: 'color', box_style: 'pill', box_color: '#0D9488', box_opacity: 0.95, border_color: 'rgba(255,255,255,0.3)', border_width: 1.5, stroke_color: '#000000', stroke_width: 2, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.6)', position_y: 0.82, max_words_per_line: 3, animation_mode: 'karaoke' },
  },
  {
    id: 'dan2', name: 'DAN 2', category: 'viral',
    tagline: 'High-visibility vibrant yellow pill, solid black typography',
    previewWords: [{ text: 'DAN 2', isBadge: true, badgeBg: '#FACC15' }],
    config: { preset_id: 'dan2', font_family: 'Montserrat, sans-serif', font_size: 32, font_weight: '900', text_case: 'uppercase', text_color: '#000000', highlight_color: '#1E293B', highlight_style: 'color', box_style: 'pill', box_color: '#FACC15', box_opacity: 1, border_color: '#000000', border_width: 2, stroke_color: 'transparent', stroke_width: 0, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.6)', position_y: 0.82, max_words_per_line: 3, animation_mode: 'karaoke' },
  },
  {
    id: 'hormozi4', name: 'HORMOZI 4', category: 'viral',
    tagline: 'Metallic gold outline 3D typography',
    previewWords: [{ text: 'HORMOZI' }, { text: '4', isHighlight: true }],
    config: { preset_id: 'hormozi4', font_family: 'Impact, sans-serif', font_size: 36, font_weight: '900', text_case: 'uppercase', text_color: '#FDE047', highlight_color: '#F59E0B', highlight_style: 'glow', box_style: 'none', box_color: '#000000', box_opacity: 0, stroke_color: '#000000', stroke_width: 4.5, shadow_type: 'heavy_3d', shadow_color: '#000000', position_y: 0.78, max_words_per_line: 3, animation_mode: 'pop' },
  },
  {
    id: 'ella', name: 'ELLA', category: 'modern',
    tagline: 'High-fashion elegant serif italic typography',
    previewWords: [{ text: 'ELLA' }],
    config: { preset_id: 'ella', font_family: 'Playfair Display, Times New Roman, serif', font_size: 32, font_weight: '700', text_case: 'normal', text_color: '#FFFFFF', highlight_color: '#E0E7FF', highlight_style: 'color', box_style: 'pill', box_color: 'rgba(24,24,27,0.85)', box_opacity: 0.85, border_color: 'rgba(255,255,255,0.2)', border_width: 1, stroke_color: '#000000', stroke_width: 1.5, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.6)', position_y: 0.82, max_words_per_line: 4, animation_mode: 'karaoke' },
  },
  {
    id: 'maya', name: 'MAYA', category: 'modern',
    tagline: 'Warm amber glow modern bold typography',
    previewWords: [{ text: 'MAYA', isHighlight: true }],
    config: { preset_id: 'maya', font_family: 'Montserrat, sans-serif', font_size: 32, font_weight: '900', text_case: 'uppercase', text_color: '#F59E0B', highlight_color: '#FDE047', highlight_style: 'glow', box_style: 'pill', box_color: 'rgba(30,20,10,0.9)', box_opacity: 0.9, border_color: 'rgba(245,158,11,0.4)', border_width: 1.5, stroke_color: '#000000', stroke_width: 2.5, shadow_type: 'neon', shadow_color: 'rgba(245,158,11,0.6)', position_y: 0.82, max_words_per_line: 3, animation_mode: 'karaoke' },
  },
  {
    id: 'gstaad', name: 'Gstaad', category: 'minimal',
    tagline: 'Minimalist clean Swiss typography with letter-spacing',
    previewWords: [{ text: 'Gstaad' }],
    config: { preset_id: 'gstaad', font_family: 'Inter, Helvetica, sans-serif', font_size: 28, font_weight: '600', text_case: 'normal', text_color: '#FFFFFF', highlight_color: '#94A3B8', highlight_style: 'color', box_style: 'pill', box_color: 'rgba(15,15,15,0.8)', box_opacity: 0.8, border_color: 'rgba(255,255,255,0.15)', border_width: 1, stroke_color: '#000000', stroke_width: 1, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.5)', position_y: 0.84, max_words_per_line: 4, animation_mode: 'karaoke' },
  },
  {
    id: 'nema', name: 'Nema', category: 'modern',
    tagline: 'Crisp white font with vivid crimson active highlight',
    previewWords: [{ text: 'Ne', isHighlight: true }, { text: 'ma' }],
    config: { preset_id: 'nema', font_family: 'Montserrat, sans-serif', font_size: 32, font_weight: '800', text_case: 'normal', text_color: '#FFFFFF', highlight_color: '#EF4444', highlight_style: 'color', box_style: 'pill', box_color: 'rgba(20,20,22,0.9)', box_opacity: 0.9, border_color: 'rgba(239,68,68,0.3)', border_width: 1.5, stroke_color: '#000000', stroke_width: 2.5, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.7)', position_y: 0.82, max_words_per_line: 4, animation_mode: 'karaoke' },
  },
  {
    id: 'warm', name: 'Warm', category: 'modern',
    tagline: 'Soft sunset warm gradient and peach accents',
    previewWords: [{ text: 'Wa' }, { text: 'rm', isHighlight: true }],
    config: { preset_id: 'warm', font_family: 'Montserrat, sans-serif', font_size: 32, font_weight: '800', text_case: 'normal', text_color: '#FFFFFF', highlight_color: '#FB923C', highlight_style: 'color', box_style: 'pill', box_color: 'rgba(38,24,16,0.92)', box_opacity: 0.92, border_color: 'rgba(251,146,60,0.4)', border_width: 1.5, stroke_color: '#000000', stroke_width: 2.5, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.8)', position_y: 0.82, max_words_per_line: 4, animation_mode: 'karaoke' },
  },
  {
    id: 'retro_film', name: 'Retro Film', category: 'vintage',
    tagline: "70s retro film serif, golden amber & coral rose",
    previewWords: [{ text: 'Retro' }, { text: 'Film', isHighlight: true }],
    config: { preset_id: 'retro_film', font_family: 'Playfair Display, Georgia, serif', font_size: 32, font_weight: '800', text_case: 'normal', text_color: '#FBBF24', highlight_color: '#FB7185', highlight_style: 'color', box_style: 'pill', box_color: 'rgba(28,25,23,0.92)', box_opacity: 0.92, border_color: 'rgba(251,191,36,0.4)', border_width: 1.5, stroke_color: '#000000', stroke_width: 2, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.8)', position_y: 0.82, max_words_per_line: 4, animation_mode: 'karaoke' },
  },
  {
    id: 'cloud', name: 'Cloud', category: 'modern',
    tagline: 'Crisp modern typography with fuchsia/pink accent',
    previewWords: [{ text: 'Clo' }, { text: 'ud', isHighlight: true }],
    config: { preset_id: 'cloud', font_family: 'Inter, sans-serif', font_size: 32, font_weight: '800', text_case: 'normal', text_color: '#FFFFFF', highlight_color: '#EC4899', highlight_style: 'color', box_style: 'glass', box_color: 'rgba(255,255,255,0.18)', box_opacity: 0.85, border_color: 'rgba(255,255,255,0.3)', border_width: 1.5, stroke_color: '#000000', stroke_width: 2, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.7)', position_y: 0.82, max_words_per_line: 4, animation_mode: 'karaoke' },
  },
  {
    id: 'hormozi5', name: 'Hormozi 5', category: 'viral',
    tagline: 'High-impact viral style, dual-color green & yellow',
    previewWords: [{ text: 'Hormozi' }, { text: '5', isHighlight: true }],
    config: { preset_id: 'hormozi5', font_family: 'Impact, Montserrat Black, sans-serif', font_size: 36, font_weight: '900', text_case: 'uppercase', text_color: '#FFFFFF', highlight_color: '#4ADE80', highlight_style: 'color', box_style: 'pill', box_color: '#0F172A', box_opacity: 0.9, border_color: '#4ADE80', border_width: 2, stroke_color: '#000000', stroke_width: 4, shadow_type: 'heavy_3d', shadow_color: '#000000', position_y: 0.78, max_words_per_line: 3, animation_mode: 'pop' },
  },
  {
    id: 'beast', name: 'Beast', category: 'viral',
    tagline: 'Bold yellow creator typography with cyan accents',
    previewWords: [{ text: 'BEAST', isHighlight: true }],
    config: { preset_id: 'beast', font_family: 'Impact, sans-serif', font_size: 36, font_weight: '900', text_case: 'uppercase', text_color: '#FEF08A', highlight_color: '#38BDF8', highlight_style: 'color', box_style: 'none', box_color: '#000000', box_opacity: 0, stroke_color: '#000000', stroke_width: 5, shadow_type: 'heavy_3d', shadow_color: '#000000', position_y: 0.78, max_words_per_line: 3, animation_mode: 'pop' },
  },
  {
    id: 'minimalist', name: 'Minimalist', category: 'minimal',
    tagline: 'Clean translucent subtitle for quiet, aesthetic scenes',
    previewWords: [{ text: 'Minimalist' }],
    config: { preset_id: 'minimalist', font_family: 'Inter, sans-serif', font_size: 26, font_weight: '600', text_case: 'normal', text_color: '#FFFFFF', highlight_color: '#E2E8F0', highlight_style: 'color', box_style: 'none', box_color: 'rgba(0,0,0,0.5)', box_opacity: 0, stroke_color: '#000000', stroke_width: 2, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.85)', position_y: 0.85, max_words_per_line: 5, animation_mode: 'karaoke' },
  },
  {
    id: 'firelight', name: 'Firelight', category: 'modern',
    tagline: 'Warm terracotta & amber aesthetic, elegant serif typography -- built for fireside storytelling',
    previewWords: [{ text: 'Once', isHighlight: true }, { text: 'upon a time' }],
    config: { preset_id: 'firelight', font_family: 'Playfair Display, Georgia, serif', font_size: 28, font_weight: '700', text_case: 'normal', text_color: '#FAF5EE', highlight_color: '#F59E0B', highlight_style: 'color', box_style: 'pill', box_color: '#2D1B10', box_opacity: 0.92, border_color: '#B45309', border_width: 1.5, stroke_color: '#000000', stroke_width: 1.5, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.8)', position_y: 0.82, max_words_per_line: 4, animation_mode: 'karaoke' },
  },
  {
    id: 'neon_cyber', name: 'Neon Cyber', category: 'viral',
    tagline: 'Pitch black pill with high-voltage neon lime glow',
    previewWords: [{ text: 'NEON' }, { text: 'CYBER', isHighlight: true }],
    config: { preset_id: 'neon_cyber', font_family: 'Montserrat, sans-serif', font_size: 30, font_weight: '900', text_case: 'uppercase', text_color: '#FFFFFF', highlight_color: '#A3E635', highlight_style: 'glow', box_style: 'pill', box_color: '#09090B', box_opacity: 0.95, border_color: '#84CC16', border_width: 2, stroke_color: '#000000', stroke_width: 3, shadow_type: 'neon', shadow_color: '#A3E635', position_y: 0.8, max_words_per_line: 3, animation_mode: 'pop' },
  },
  {
    id: 'sunset_coral', name: 'Sunset Coral', category: 'viral',
    tagline: 'Vibrant coral peach container with espresso bold typography',
    previewWords: [{ text: 'SUNSET', isBadge: true, badgeBg: '#FB7185' }],
    config: { preset_id: 'sunset_coral', font_family: 'Outfit, Montserrat, sans-serif', font_size: 30, font_weight: '900', text_case: 'uppercase', text_color: '#1C1917', highlight_color: '#991B1B', highlight_style: 'color', box_style: 'pill', box_color: '#FB7185', box_opacity: 0.98, border_color: '#FDA4AF', border_width: 2, stroke_color: 'transparent', stroke_width: 0, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.5)', position_y: 0.82, max_words_per_line: 3, animation_mode: 'karaoke' },
  },
  {
    id: 'cinematic_gold', name: 'Cinematic Gold', category: 'creator',
    tagline: 'Prestige gold borders & crisp condensed typography',
    previewWords: [{ text: 'CINEMATIC', isHighlight: true }, { text: 'GOLD' }],
    config: { preset_id: 'cinematic_gold', font_family: 'Montserrat, Inter, sans-serif', font_size: 28, font_weight: '800', text_case: 'uppercase', text_color: '#FDFBF7', highlight_color: '#FBBF24', highlight_style: 'color', box_style: 'pill', box_color: 'rgba(10,10,10,0.92)', box_opacity: 0.92, border_color: '#D97706', border_width: 1.5, stroke_color: '#000000', stroke_width: 2, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.85)', position_y: 0.82, max_words_per_line: 4, animation_mode: 'karaoke' },
  },
  {
    id: 'tokyo_minimal', name: 'Tokyo Minimal', category: 'minimal',
    tagline: 'Modern frosted glass style with airy letter-spacing',
    previewWords: [{ text: 'TOKYO' }, { text: 'MINIMAL', isHighlight: true }],
    config: { preset_id: 'tokyo_minimal', font_family: 'Inter, system-ui, sans-serif', font_size: 26, font_weight: '600', text_case: 'normal', text_color: '#FFFFFF', highlight_color: '#93C5FD', highlight_style: 'color', box_style: 'glass', box_color: 'rgba(255,255,255,0.16)', box_opacity: 0.9, border_color: 'rgba(255,255,255,0.35)', border_width: 1, stroke_color: '#000000', stroke_width: 1.5, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.6)', position_y: 0.84, max_words_per_line: 4, animation_mode: 'karaoke' },
  },
  {
    id: 'comic_pop', name: 'Comic Pop', category: 'viral',
    tagline: 'Bouncy energetic pop aesthetic with sunshine yellow highlight',
    previewWords: [{ text: 'COMIC' }, { text: 'POP!', isHighlight: true }],
    config: { preset_id: 'comic_pop', font_family: 'Impact, Arial Black, sans-serif', font_size: 32, font_weight: '900', text_case: 'uppercase', text_color: '#FFFFFF', highlight_color: '#FDE047', highlight_style: 'color', box_style: 'pill', box_color: '#4338CA', box_opacity: 0.95, border_color: '#FBBF24', border_width: 2.5, stroke_color: '#000000', stroke_width: 3.5, shadow_type: 'heavy_3d', shadow_color: '#000000', position_y: 0.8, max_words_per_line: 3, animation_mode: 'pop' },
  },
  {
    id: 'matcha_green', name: 'Matcha Green', category: 'creator',
    tagline: 'Calm organic forest and matcha green tone',
    previewWords: [{ text: 'Matcha', isHighlight: true }, { text: 'Green' }],
    config: { preset_id: 'matcha_green', font_family: 'Outfit, Inter, sans-serif', font_size: 28, font_weight: '700', text_case: 'normal', text_color: '#F0FDF4', highlight_color: '#86EFAC', highlight_style: 'color', box_style: 'pill', box_color: '#14230F', box_opacity: 0.92, border_color: '#4ADE80', border_width: 1.5, stroke_color: '#000000', stroke_width: 2, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.7)', position_y: 0.82, max_words_per_line: 4, animation_mode: 'karaoke' },
  },
  {
    id: 'pastel_cafe', name: 'Pastel Cafe', category: 'modern',
    tagline: 'Soft oat cream palette with roasted coffee text',
    previewWords: [{ text: 'CAFE', isBadge: true, badgeBg: '#FDFBF7' }],
    config: { preset_id: 'pastel_cafe', font_family: 'Outfit, Montserrat, sans-serif', font_size: 28, font_weight: '800', text_case: 'normal', text_color: '#3E2723', highlight_color: '#D97706', highlight_style: 'color', box_style: 'pill', box_color: '#FDFBF7', box_opacity: 0.96, border_color: '#D7CCC8', border_width: 1.5, stroke_color: 'transparent', stroke_width: 0, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.3)', position_y: 0.82, max_words_per_line: 4, animation_mode: 'karaoke' },
  },
  {
    id: 'simple_bounce', name: 'Simple Bounce', category: 'minimal',
    tagline: 'Clean text, no box -- each word gently bounces in, nothing else',
    previewWords: [{ text: 'Simple', isHighlight: true }, { text: 'Bounce' }],
    config: { preset_id: 'simple_bounce', font_family: 'Inter, sans-serif', font_size: 32, font_weight: '700', text_case: 'normal', text_color: '#FFFFFF', highlight_color: '#FACC15', highlight_style: 'color', box_style: 'none', box_color: 'rgba(0,0,0,0.5)', box_opacity: 0, stroke_color: '#000000', stroke_width: 2, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.7)', position_y: 0.84, max_words_per_line: 5, animation_mode: 'bounce' },
  },
  {
    id: 'bubble_bounce', name: 'Bubble Bounce', category: 'viral',
    tagline: 'Playful bright pill that bounces each word into place',
    previewWords: [{ text: 'BUB' }, { text: 'BLE', isHighlight: true }],
    config: { preset_id: 'bubble_bounce', font_family: 'Montserrat, sans-serif', font_size: 32, font_weight: '900', text_case: 'uppercase', text_color: '#FFFFFF', highlight_color: '#FDE047', highlight_style: 'color', box_style: 'pill', box_color: '#EC4899', box_opacity: 0.95, border_color: 'rgba(255,255,255,0.35)', border_width: 2, stroke_color: '#000000', stroke_width: 2.5, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.6)', position_y: 0.82, max_words_per_line: 3, animation_mode: 'bounce' },
  },
  {
    id: 'spotlight', name: 'Spotlight', category: 'minimal',
    tagline: 'Elegant glass container, sits higher for a cinematic feel',
    previewWords: [{ text: 'Spot', isHighlight: true }, { text: 'light' }],
    config: { preset_id: 'spotlight', font_family: 'Playfair Display, Georgia, serif', font_size: 30, font_weight: '600', text_case: 'normal', text_color: '#FFFFFF', highlight_color: '#FDE68A', highlight_style: 'color', box_style: 'glass', box_color: 'rgba(255,255,255,0.12)', box_opacity: 0.85, border_color: 'rgba(255,255,255,0.25)', border_width: 1, stroke_color: '#000000', stroke_width: 1, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.6)', position_y: 0.7, max_words_per_line: 5, animation_mode: 'karaoke' },
  },
  {
    id: 'slate_pop', name: 'Slate Pop', category: 'creator',
    tagline: 'Cool slate-blue box with a crisp pop on every word',
    previewWords: [{ text: 'SLATE' }, { text: 'POP', isHighlight: true }],
    config: { preset_id: 'slate_pop', font_family: 'Inter, sans-serif', font_size: 32, font_weight: '800', text_case: 'uppercase', text_color: '#F1F5F9', highlight_color: '#38BDF8', highlight_style: 'color', box_style: 'box', box_color: '#0F172A', box_opacity: 0.92, border_color: 'rgba(56,189,248,0.4)', border_width: 1.5, stroke_color: '#000000', stroke_width: 2, shadow_type: 'soft', shadow_color: 'rgba(0,0,0,0.7)', position_y: 0.82, max_words_per_line: 4, animation_mode: 'pop' },
  },
];

export function getCaptionPreset(id: CaptionPresetId): CaptionPresetItem {
  return CAPTION_PRESETS.find((p) => p.id === id) || CAPTION_PRESETS[0];
}
