import { CheckCircle2, Circle, Image as ImageIcon, Mic, Play, Users } from 'lucide-react';
import { Story } from '../types';

export type StageId = 'cast' | 'scenes' | 'narration' | 'thumbnail' | 'play';

export function PipelineTracker({ story, activeStage, onSelect }: { story: Story; activeStage: StageId; onSelect: (s: StageId) => void }) {
  const castReady = story.characters.length === 0 || story.characters.every((c) => c.status === 'ready');
  const approvedScenes = story.scenes.filter((s) => s.status === 'approved').length;
  const scenesReady = story.scenes.length > 0 && approvedScenes === story.scenes.length;
  const narrationReady = story.scenes.every((s) => !!s.narration_audio_url) && story.scenes.length > 0;

  const stages: { id: StageId; label: string; detail: string; icon: React.ReactNode; done: boolean }[] = [
    { id: 'cast', label: 'Cast', detail: `${story.characters.filter((c) => c.status === 'ready').length}/${story.characters.length} sheets`, icon: <Users className="w-3.5 h-3.5" />, done: castReady },
    { id: 'scenes', label: 'Scenes', detail: `${approvedScenes}/${story.scenes.length} approved`, icon: <ImageIcon className="w-3.5 h-3.5" />, done: scenesReady },
    { id: 'narration', label: 'Narration', detail: narrationReady ? 'Ready' : 'Voice each scene', icon: <Mic className="w-3.5 h-3.5" />, done: narrationReady },
    { id: 'thumbnail', label: 'Thumbnail', detail: story.thumbnail.generated_image_url ? 'Ready' : 'Optional', icon: <ImageIcon className="w-3.5 h-3.5" />, done: !!story.thumbnail.generated_image_url },
    { id: 'play', label: 'Playback', detail: 'Slideshow', icon: <Play className="w-3.5 h-3.5" />, done: false },
  ];

  return (
    <div className="border-b border-[#2f2a3a] bg-[#161320]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-1.5 overflow-x-auto">
        {stages.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-1.5 shrink-0">
            {idx > 0 && <div className="w-4 h-px bg-[#2f2a3a]" />}
            <button
              onClick={() => onSelect(s.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-colors ${
                activeStage === s.id
                  ? 'bg-[#2a2437] border-[#4a4458] text-[#ece8de]'
                  : 'border-transparent text-[#8a8399] hover:bg-[#1f1b29] hover:text-[#c9c2e0]'
              }`}
            >
              {s.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Circle className="w-3.5 h-3.5 text-[#4a4458]" />}
              <span className="flex items-center gap-1.5 text-xs font-medium">
                {s.icon}
                {s.label}
              </span>
              <span className="text-[10px] text-[#6b6579] font-mono hidden sm:inline">{s.detail}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
