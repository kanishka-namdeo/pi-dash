import { Pause, Play, Square, Plus } from 'lucide-react';
import type { Mode } from '@/types/dashboard';

type TopbarProps = {
  mode: Mode;
  isPaused: boolean;
  onModeChange: (mode: Mode) => void;
  onPause: () => void;
  onStop: () => void;
};

export function Topbar({ mode, isPaused, onModeChange, onPause, onStop }: TopbarProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] bg-[#0a0a0a]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[#e5e5e5] font-medium">Pi Orchestrator</span>
        </div>
        <span className="font-mono text-sm text-[#a3a3a3]">pi-dash</span>
      </div>

      <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
        {(['auto', 'supervised', 'manual'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              mode === m
                ? 'bg-[#2a2a2a] text-[#e5e5e5]'
                : 'text-[#737373] hover:text-[#a3a3a3]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPause}
          className="p-2 rounded-lg bg-[#1a1a1a] text-[#a3a3a3] hover:bg-[#2a2a2a] transition-colors"
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
        <button
          onClick={onStop}
          className="p-2 rounded-lg bg-[#1a1a1a] text-red-500 hover:bg-[#2a2a2a] transition-colors"
          title="Stop"
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          className="p-2 rounded-lg bg-[#1a1a1a] text-[#a3a3a3] hover:bg-[#2a2a2a] transition-colors"
          title="New Task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
