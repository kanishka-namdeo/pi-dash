import { useNavigate } from 'react-router-dom';
import {
  Pause,
  Play,
  GitBranch,
  LayoutDashboard,
  Monitor,
  Trash2,
  Link,
  Bell,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Mode } from '@/types/dashboard';
import type { ViewMode } from '@/types/pip';

type TopBarProps = {
  mode: Mode;
  viewMode: ViewMode;
  isFeedPaused: boolean;
  hasMainAgent: boolean;
  onModeChange: (mode: Mode) => void;
  onSetViewMode: (mode: ViewMode) => void;
  onToggleFeedPause: () => void;
  onClearFeed: () => void;
};

export function TopBar({
  mode,
  viewMode,
  isFeedPaused,
  onModeChange,
  onSetViewMode,
  onToggleFeedPause,
  onClearFeed,
}: TopBarProps) {
  const navigate = useNavigate();

  return (
    <header
      className="flex items-center justify-between px-6 h-14"
      style={{
        backgroundColor: 'var(--bg)',
        borderBottom: `1px solid var(--border)`,
      }}
    >
      {/* Left: Status + Title */}
      <div className="flex items-center gap-4">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: 'var(--accent-emerald)' }}
        />
        <span
          className="text-base font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Pi Orchestrator
        </span>
        <span
          className="text-sm font-mono font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          pi-dash
        </span>
      </div>

      {/* Center-left: View Toggle */}
      <nav
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{ backgroundColor: 'var(--card)' }}
      >
        <button
          onClick={() => onSetViewMode('dashboard')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-sm transition-colors"
          style={{
            backgroundColor: viewMode === 'dashboard' ? 'var(--border)' : 'transparent',
            color: viewMode === 'dashboard' ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          <LayoutDashboard size={14} />
          Dashboard
        </button>
        <button
          onClick={() => onSetViewMode('terminal')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-sm transition-colors"
          style={{
            backgroundColor: viewMode === 'terminal' ? 'var(--border)' : 'transparent',
            color: viewMode === 'terminal' ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
        >
          <Monitor size={14} />
          Terminal
        </button>
      </nav>

      {/* Center: Worktrees */}
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <GitBranch size={14} />
        Worktrees
      </button>

      {/* Center-right: Mode Toggle */}
      <nav
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{ backgroundColor: 'var(--card)' }}
      >
        {(['auto', 'supervised', 'manual'] as const).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className="px-3 py-1 rounded-md text-sm transition-colors"
            style={{
              backgroundColor: mode === m ? 'var(--border)' : 'transparent',
              color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {m}
          </button>
        ))}
      </nav>

      {/* Right: Nav + Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/settings/github')}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <Link size={16} />
        </button>
        <button
          onClick={() => toast('Notifications coming soon')}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <Bell size={16} />
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <Settings size={16} />
        </button>
        <button
          onClick={() => toast('Help docs coming soon')}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <HelpCircle size={16} />
        </button>

        <div className="w-px h-6 mx-2" style={{ backgroundColor: 'var(--border)' }} />

        <button
          onClick={onToggleFeedPause}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          {isFeedPaused ? <Play size={16} /> : <Pause size={16} />}
        </button>
        <button
          onClick={onClearFeed}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--card)', color: 'var(--text-secondary)' }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </header>
  );
}
