import { AlertCircle, Bot, Download, FileJson, Loader2, Sparkles, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { SAMPLE_STORY_TWO_MONKEYS_JSON } from '../data/sampleStoryTwoMonkeys';
import { ASPECT_RATIOS } from '../data/presets';
import { AspectRatio, Story } from '../types';
import { downloadSampleStoryTemplate } from '../utils/storyStorage';

export function StoryUpload({
  isSubmitting,
  onSubmitStoryJson,
  onResumeStory,
}: {
  isSubmitting: boolean;
  onSubmitStoryJson: (json: any, aspectRatio: AspectRatio) => void;
  onResumeStory: (story: Story) => void;
}) {
  const [text, setText] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    setParseError(null);
    if (!text.trim()) {
      setParseError('Paste a story JSON, or load the example first.');
      return;
    }
    try {
      const parsed = JSON.parse(text);
      onSubmitStoryJson(parsed, aspectRatio);
    } catch (err: any) {
      setParseError(`That isn't valid JSON: ${err.message}`);
    }
  };

  const handleFilePicked = async (file: File | undefined) => {
    if (!file) return;
    const raw = await file.text();
    setText(raw);
    setParseError(null);
  };

  const handleResumePicked = async (file: File | undefined) => {
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      if (!parsed.scenes || !Array.isArray(parsed.scenes)) throw new Error('This file has no scenes[] array -- is it a Storyframe export?');
      onResumeStory(parsed as Story);
    } catch (err: any) {
      setParseError(`Couldn't resume that file: ${err.message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#d9a042] bg-[#2a2015] border border-[#5c431f] rounded-full px-2.5 py-1 mb-4">
          <Sparkles className="w-3 h-3" />
          10 free credits to start
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#ece8de]">Turn a story into an illustrated slideshow</h1>
        <p className="text-[#9d97ab] mt-2 leading-relaxed">
          Paste a story JSON below (title, characters, and scenes), or just a synopsis and cast and Storyframe will break it into scenes for you.
          Every image and narration line gets your review before anything is final. Supports multi-language narration (Tamil, English, Malayalam, Telugu, Hindi, Kannada).
        </p>

        {/* ChatGPT Template helper banner */}
        <div className="mt-4 p-3.5 bg-[#171320] border border-[#3e3454] rounded-xl flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2.5 text-xs text-[#c9c2e0] max-w-md">
            <Bot className="w-4 h-4 text-[#d9a042] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">ChatGPT / LLM Story Template:</span>
              <p className="text-[#9d97ab] text-[11px] mt-0.5">
                Download the sample story JSON, upload it to ChatGPT and ask it to write a new story in this exact schema, then upload or paste the result back here.
              </p>
            </div>
          </div>
          <button
            onClick={() => downloadSampleStoryTemplate(text.trim() || SAMPLE_STORY_TWO_MONKEYS_JSON)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2a2238] border border-[#584873] text-[#e0b368] hover:bg-[#382b4a] hover:text-white transition-colors shrink-0"
            title="Download the exact sample story JSON template (The Two Monkeys)"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample JSON
          </button>
        </div>
      </div>

      <div className="bg-[#1b1822] border border-[#2f2a3a] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2f2a3a] bg-[#181521]">
          <span className="text-xs font-mono text-[#6b6579]">story.json</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setText(JSON.stringify(SAMPLE_STORY_TWO_MONKEYS_JSON, null, 2));
                setParseError(null);
              }}
              className="text-xs font-medium text-[#d9a042] hover:text-[#eab766] px-2 py-1 rounded transition-colors"
              title="Load the Two Monkeys multi-language example into editor"
            >
              Load example
            </button>
            <button
              onClick={() => downloadSampleStoryTemplate(text.trim() || SAMPLE_STORY_TWO_MONKEYS_JSON)}
              className="text-xs font-medium text-[#c9c2e0] hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1"
              title="Download this JSON file"
            >
              <Download className="w-3 h-3" />
              Download JSON
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="text-xs font-medium text-[#c9c2e0] hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
              <FileJson className="w-3 h-3" />
              Upload .json
            </button>
            <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => handleFilePicked(e.target.files?.[0])} />
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            '{\n  "storyTitle": "...",\n  "overallSummary": "...",\n  "visualStyle": {...},\n  "cast": [...],\n  "scenes": [...]\n}'
          }
          spellCheck={false}
          className="w-full h-64 bg-transparent text-[#dcd7e8] font-mono text-[13px] leading-relaxed p-4 outline-none resize-none placeholder:text-[#4a4458]"
        />
      </div>

      {parseError && (
        <div className="mt-3 flex items-start gap-2 text-sm text-red-300 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {parseError}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-1.5">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r.id}
              onClick={() => setAspectRatio(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                aspectRatio === r.id ? 'bg-[#d9a042] border-[#d9a042] text-[#1b1408]' : 'border-[#2f2a3a] text-[#9d97ab] hover:border-[#4a4458]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-[#d9a042] text-[#1b1408] hover:bg-[#eab766] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isSubmitting ? 'Building storyboard…' : 'Build storyboard'}
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-[#2f2a3a] flex items-center justify-between text-sm">
        <span className="text-[#6b6579]">Already have a Storyframe export?</span>
        <button onClick={() => resumeInputRef.current?.click()} className="flex items-center gap-1.5 text-[#c9c2e0] hover:text-white font-medium">
          <Upload className="w-3.5 h-3.5" />
          Resume a story
        </button>
        <input ref={resumeInputRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => handleResumePicked(e.target.files?.[0])} />
      </div>
    </div>
  );
}
