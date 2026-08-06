import { useNavigate } from 'react-router-dom';
import { Pause, Play, GitBranch, LayoutDashboard, Monitor } from 'lucide-react';
import type { Mode } from '@/types/dashboard';
import type { ViewMode } from '@/types/pip';

type TopbarProps = {
  mode: Mode;
  viewMode: ViewMode;
  isFeedPaused: boolean;
  hasMainAgent: boolean;
  onModeChange: (mode: Mode) => void;
  onToggleViewMode: () => void;
  onToggleFeedPause: () => void;
  onClearFeed: () => void;
};

export function Topbar({
  mode,
  viewMode,
  isFeedPaused,
  hasMainAgent,
  onModeChange,
  onToggleViewMode,
  onToggleFeedPause,
  onClearFeed,
}: TopbarProps) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] bg-[#0a0a0a]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-base font-semibold text-[#e5e5e5]">Pi Orchestrator</span>
        </div>
        <span className="font-mono text-sm font-medium text-[#a3a3a3]">pi-dash</span>
      </div>

      {/* View Toggle */}
      <nav aria-label="View mode" className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
        <button
          onClick={onToggleViewMode}
          disabled={!hasMainAgent}
          className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors ${
            viewMode === 'dashboard'
              ? 'bg-[#2a2a2a] text-[#e5e5e5]'
              : 'text-[#737373] hover:text-[#a3a3a3]'
          } ${!hasMainAgent ? 'opacity-40 cursor-not-allowed' : ''}`}
          title="Dashboard view"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Dashboard
        </button>
        <button
          onClick={onToggleViewMode}
          disabled={!hasMainAgent}
          className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors ${
            viewMode === 'terminal'
              ? 'bg-[#2a2a2a] text-[#e5e5e5]'
              : 'text-[#737373] hover:text-[#a3a3a3]'
          } ${!hasMainAgent ? 'opacity-40 cursor-not-allowed' : ''}`}
          title="Terminal view"
        >
          <Monitor className="w-3.5 h-3.5" />
          Terminal
        </button>
      </nav>

      <button
        onClick={() => navigate('/worktrees')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#737373] hover:text-[#e5e5e5] rounded-lg hover:bg-[#1a1a1a] transition-colors"
        >
        <GitBranch className="w-3.5 h-3.5" />
        Worktrees
      </button>

      <nav aria-label="Dashboard mode" className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
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
      </nav>

      <nav aria-label="Dashboard actions" className="flex items-center gap-2">
        <button
          onClick={onToggleFeedPause}
          className="p-2 rounded-lg bg-[#1a1a1a] text-[#a3a3a3] hover:bg-[#2a2a2a] transition-colors"
          title={isFeedPaused ? 'Resume feed' : 'Pause feed'}
        >
          {isFeedPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
        <button
          onClick={onClearFeed}
          className="p-2 rounded-lg bg-[#1a1a1a] text-[#a3a3a3] hover:bg-[#2a2a2a] transition-colors"
          title="Clear feed"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <line x1="10" x2="10" y1="11" y2="17"/>
            <line x1="14" x2="14" y1="11" y2="17"/>
          </svg>
        </button>
      </nav>
    </header>
  );
}
