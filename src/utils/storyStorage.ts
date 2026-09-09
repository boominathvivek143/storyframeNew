import { Story } from '../types';
import { SAMPLE_STORY_TWO_MONKEYS_JSON } from '../data/sampleStoryTwoMonkeys';

const STORAGE_KEY = 'storyframe_story';

// Storyframe has no server-side job storage -- the story (including every
// generated image and narration clip, as data: URLs) lives entirely in the
// browser. This is the only "database" it has: a debounced mirror of
// React state into localStorage, so a refresh or accidental tab close
// doesn't lose review progress.
export function saveStoryToLocalStorage(story: Story) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(story));
  } catch {
    // Quota exceeded (a long story's inline images can be large) -- the
    // in-memory React state is still the source of truth for this tab, so
    // losing the autosave mirror is a soft failure, not a data-loss one.
  }
}

export function loadStoryFromLocalStorage(): Story | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Story) : null;
  } catch {
    return null;
  }
}

export function clearStoredStory() {
  localStorage.removeItem(STORAGE_KEY);
}

// Exports the full story -- including every inline image/audio data URL --
// as one self-contained JSON file. Re-importing it (StoryUploadModal's
// "Resume a story" path) restores the exact review state, no server round
// trip required.
export function downloadStoryAsJson(story: Story) {
  const blob = new Blob([JSON.stringify(story, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(story.story_title)}.storyframe.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Downloads the exact standardized multi-language story JSON template (The Two Monkeys — The Trap of Comparison)
// identical to the "Load example" JSON, ready to be uploaded to ChatGPT or LLMs.
export function downloadSampleStoryTemplate(customJson?: string | object, filename = 'sample-story-template.json') {
  const content = customJson
    ? typeof customJson === 'string'
      ? customJson
      : JSON.stringify(customJson, null, 2)
    : JSON.stringify(SAMPLE_STORY_TWO_MONKEYS_JSON, null, 2);

  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'story';
}
