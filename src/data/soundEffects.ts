import { SoundEffectCue } from '../types';

export interface SoundEffectDefinition {
  id: SoundEffectCue;
  label: string;
  // Sent to ElevenLabs' sound-generation API when a key is configured.
  prompt: string;
  // Used to auto-detect this effect from a scene's own action_description
  // / visual_prompt / voice_line at creation time, and by the manual
  // "Detect sounds" re-scan button.
  keywords: RegExp;
}

export const SOUND_EFFECT_CATALOG: SoundEffectDefinition[] = [
  {
    id: 'thunder',
    label: 'Thunder',
    prompt: 'A deep rolling thunder rumble with a sharp crack, distant storm',
    keywords: /\b(thunder|lightning|thunderstorm|thunderous)\b|\[sfx:?\s*thunder\]|\(thunder\)/i,
  },
  {
    id: 'rain',
    label: 'Rain',
    prompt: 'Steady rainfall, soft ambient rain hitting ground and leaves',
    keywords: /\b(rain|rains|raining|rainfall|raindrop|raindrops|drizzle|drizzling|downpour|shower|stormy)\b|\[sfx:?\s*rain\]|\(rain\)/i,
  },
  {
    id: 'fire',
    label: 'Fire crackle',
    prompt: 'A crackling wood fire, warm campfire or hearth',
    keywords: /\b(fire|flame|flames|blaze|blazing|hearth|campfire|bonfire|burning|crackle|crackling)\b|\[sfx:?\s*fire\]|\(fire\)/i,
  },
  {
    id: 'wind',
    label: 'Wind',
    prompt: 'A gusting wind howling through trees',
    keywords: /\b(wind|winds|windy|gust|gusts|gusting|howl|howling|howls|breeze)\b|\[sfx:?\s*wind\]|\(wind\)/i,
  },
  {
    id: 'water_flow',
    label: 'Flowing water',
    prompt: 'A gentle flowing stream or river, water trickling over rocks',
    keywords: /\b(river|stream|creek|trickle|trickling|brook|waterfall|flowing water|water flows?)\b|\[sfx:?\s*water_flow\]|\(water\)/i,
  },
  {
    id: 'waves',
    label: 'Ocean waves',
    prompt: 'Ocean waves crashing on a shore',
    keywords: /\b(wave|waves|ocean|sea shore|seashore|tide|tides|surf|beach)\b|\[sfx:?\s*waves\]|\(waves\)/i,
  },
  {
    id: 'footsteps',
    label: 'Footsteps',
    prompt: 'A few footsteps walking on a hard floor',
    keywords: /\b(footstep|footsteps|walk|walks|walking|walked|run|running|ran|steps|pacing|treading|crept|creeping)\b|\[sfx:?\s*footsteps\]|\(footsteps\)/i,
  },
  {
    id: 'door_creak',
    label: 'Door creak',
    prompt: 'An old wooden door creaking open slowly',
    keywords: /\b(door|gate)\b.*?\b(creak|creaks|creaking|open|opens|opened|close|closes|closed|shut|slam|slammed)\b|\b(creak|creaks|creaking|open|opens|opened|close|closes|closed|shut|slam|slammed)\b.*?\b(door|gate)\b|\[sfx:?\s*door_creak\]/i,
  },
  {
    id: 'crowd',
    label: 'Crowd murmur',
    prompt: 'A crowd of people murmuring and chattering in a busy space',
    keywords: /\b(crowd|crowds|market|marketplace|chatter|chattering|murmur|murmuring|bustle|bustling|cheer|cheering|applause|cheers)\b|\[sfx:?\s*crowd\]|\(crowd\)/i,
  },
  {
    id: 'birds',
    label: 'Birds chirping',
    prompt: 'Birds chirping in a peaceful forest',
    keywords: /\b(bird|birds|chirp|chirps|chirping|tweet|tweets|tweeting|songbird|songbirds|seagull|seagulls)\b|\[sfx:?\s*birds\]|\(birds\)/i,
  },
  {
    id: 'heartbeat',
    label: 'Heartbeat',
    prompt: 'A slow tense heartbeat thumping',
    keywords: /\b(heartbeat|heartbeats|heart pound|heart pounding|heart raced|heart racing|pulse racing|pulse pounding)\b|\[sfx:?\s*heartbeat\]|\(heartbeat\)/i,
  },
  {
    id: 'impact',
    label: 'Impact / fall',
    prompt: 'A heavy object falling and hitting the ground with a thud',
    keywords: /\b(fall|falls|falling|fell|fallen|crash|crashes|crashing|crashed|thud|collapse|collapsed|slam|slams|slammed|bang|hit|hits|smash|smashed|drop|dropped)\b|\[sfx:?\s*impact\]|\(impact\)/i,
  },
  {
    id: 'whoosh',
    label: 'Whoosh / swoosh',
    prompt: 'A fast cinematic whoosh sound effect, swift air rushing past',
    keywords: /\b(whoosh|swoosh|swish|dash|dashed|swift|dart|darted|zoomed|flew past|leaped|slash|slashed|swipe|swiped|suddenly)\b|\[sfx:?\s*whoosh\]|\(whoosh\)/i,
  },
  {
    id: 'whisper',
    label: 'Whisper',
    prompt: 'Soft mysterious whisper in a quiet dark room',
    keywords: /\b(whisper|whispers|whispering|whispered|mutter|mutters|muttered|muttering|hushed|secretive|softly spoke)\b|\[sfx:?\s*whisper\]|\(whisper\)/i,
  },
  {
    id: 'bell',
    label: 'Bell / chime',
    prompt: 'Deep antique brass church bell tolling slowly with long reverberation',
    keywords: /\b(bell|bells|toll|tolling|tolled|chime|chimes|chiming|gong|church bell|clock tower|ring|ringing|rang)\b|\[sfx:?\s*bell\]|\(bell\)/i,
  },
  {
    id: 'clock_tick',
    label: 'Clock ticking',
    prompt: 'Rhythmic mechanical clock ticking, vintage grandfather clock',
    keywords: /\b(clock|ticking|tick-tock|tick tock|clockwork|pendulum|time passing|seconds ticking|time ran out)\b|\[sfx:?\s*clock\]|\(clock\)/i,
  },
  {
    id: 'gasp',
    label: 'Gasp / sigh',
    prompt: 'A sudden sharp dramatic gasp of shock and surprise',
    keywords: /\b(gasp|gasps|gasped|gasping|sigh|sighs|sighed|sighing|breathless|sharp breath|panting|held breath)\b|\[sfx:?\s*gasp\]|\(gasp\)/i,
  },
  {
    id: 'laughter',
    label: 'Laughter',
    prompt: 'A hearty laugh or amused chuckle',
    keywords: /\b(laugh|laughs|laughed|laughing|laughter|chuckle|chuckles|chuckled|chuckling|giggle|giggles|giggled|cackle|cackled|sneer)\b|\[sfx:?\s*laugh\]|\(laughter\)/i,
  },
  {
    id: 'crying',
    label: 'Crying / sob',
    prompt: 'Soft emotional weeping and sorrowful sobbing',
    keywords: /\b(cry|cries|cried|crying|sob|sobs|sobbed|sobbing|weep|weeps|wept|weeping|tears|sorrow|tearful|mourning)\b|\[sfx:?\s*cry\]|\(crying\)/i,
  },
  {
    id: 'scream',
    label: 'Scream / shriek',
    prompt: 'A distant dramatic scream or frightened yell',
    keywords: /\b(scream|screams|screamed|screaming|shriek|shrieks|shrieked|shrieking|yell|yells|yelled|yelling|howl of horror)\b|\[sfx:?\s*scream\]|\(scream\)/i,
  },
  {
    id: 'sword_clash',
    label: 'Sword clash',
    prompt: 'Sharp metallic sword blades clashing and scraping in combat',
    keywords: /\b(sword|swords|blade|blades|steel|clash|clashing|clashed|shield|parry|metal clash|clang|strike of steel|duel|armor)\b|\[sfx:?\s*sword\]|\(sword\)/i,
  },
  {
    id: 'explosion',
    label: 'Explosion',
    prompt: 'A loud powerful explosion blast with low rumble debris',
    keywords: /\b(explosion|explosions|explode|exploded|exploding|blast|blasted|bomb|detonate|detonated|burst|kaboom|boom|erupt|erupted)\b|\[sfx:?\s*explosion\]|\(explosion\)/i,
  },
  {
    id: 'glass_shatter',
    label: 'Glass shatter',
    prompt: 'Glass window or bottle smashing and shattering into shards',
    keywords: /\b(glass|shatter|shattered|shattering|shards|window broke|broken glass|mirror shattered|glass broke|smash glass)\b|\[sfx:?\s*glass\]|\(glass\)/i,
  },
  {
    id: 'growl',
    label: 'Growl / roar',
    prompt: 'A deep menacing beast growl or predator snarl',
    keywords: /\b(growl|growls|growled|growling|roar|roars|roared|roaring|snarl|snarls|snarled|snarling|beast|predator|monster|wolf|hiss|hissing)\b|\[sfx:?\s*growl\]|\(growl\)/i,
  },
  {
    id: 'magic',
    label: 'Magic sparkle',
    prompt: 'Ethereal magical sparkling chime shimmer, enchanted celestial aura',
    keywords: /\b(magic|magical|spell|spells|enchanted|enchantment|sparkle|sparkles|shimmer|mystical|aura|celestial|glowed magically|wizard|sorcery)\b|\[sfx:?\s*magic\]|\(magic\)/i,
  },
  {
    id: 'page_turn',
    label: 'Page turn / book',
    prompt: 'Crisp paper parchment page turning in a book',
    keywords: /\b(page|pages|book|parchment|scroll|paper|turning page|turn the page|reading|wrote|writing|letter|journal)\b|\[sfx:?\s*page\]|\(page\)/i,
  },
  {
    id: 'horse_gallop',
    label: 'Horse galloping',
    prompt: 'Rhythmic horse hooves galloping on dirt path',
    keywords: /\b(horse|horses|gallop|galloping|galloped|hoof|hooves|trot|trotting|carriage|steed|mount|riding horseback)\b|\[sfx:?\s*horse\]|\(horse\)/i,
  },
  {
    id: 'chains',
    label: 'Chains rattling',
    prompt: 'Heavy metal iron chains rattling and clinking in a dungeon',
    keywords: /\b(chain|chains|rattle|rattling|clinking|shackles|irons|dungeon|padlock|locked away|clank|metal links)\b|\[sfx:?\s*chains\]|\(chains\)/i,
  },
];

export function getSoundEffectDefinition(cue: SoundEffectCue): SoundEffectDefinition {
  return SOUND_EFFECT_CATALOG.find((d) => d.id === cue) || SOUND_EFFECT_CATALOG[0];
}
