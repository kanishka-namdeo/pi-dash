import { Focus, PictureInPicture2, Play, RotateCcw } from 'lucide-react';

type AgentCardProps = {
  variant: 'running' | 'available';
  name: string;
  avatar: { letter: string; color: string };
  cwd?: string;
  path?: string;
  status?: 'active' | 'idle' | 'exited';
  task?: string;
  progress?: number;
  files?: string[];
  onFocus?: () => void;
  onLaunch?: () => void;
  onRestart?: () => void;
  onPiP?: () => void;
};

export function AgentCard({
  variant,
  name,
  avatar,
  cwd,
  path,
  status,
  task,
  progress,
  files,
  onFocus,
  onLaunch,
  onRestart,
  onPiP,
}: AgentCardProps) {
  const isRunning = variant === 'running';

  return (
    <div
      className="p-3 rounded-xl flex flex-col gap-2"
      style={{
        backgroundColor: 'var(--card)',
        border: `1px solid var(--border)`,
      }}
    >
      {/* Top row: Avatar + Info */}
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
          style={{ backgroundColor: avatar.color }}
        >
          {avatar.letter}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {name}
          </div>
          {isRunning && cwd && (
            <div
              className="text-xs font-mono truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              {cwd}
            </div>
          )}
          {!isRunning && path && (
            <div
              className="text-xs font-mono truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              {path}
            </div>
          )}
          {/* Task/Progress/Files section */}
          {(task || progress !== undefined || (files && files.length > 0)) && (
            <div className="mt-1 space-y-1">
              {task && (
                <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {task}
                </div>
              )}
              {progress !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-0.5 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, backgroundColor: 'var(--accent-blue)' }}
                    />
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {progress}%
                  </span>
                </div>
              )}
              {files && files.length > 0 && (
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {files.length} {files.length === 1 ? 'file' : 'files'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status dot (running only) */}
        {isRunning && status && (
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor:
                status === 'active' ? 'var(--accent-emerald)' : 'var(--text-muted)',
            }}
          />
        )}
      </div>

      {/* Button row */}
      <div className="flex gap-2">
        {isRunning ? (
          <>
            <button
              onClick={onFocus}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
              style={{
                backgroundColor: 'var(--bg)',
                border: `1px solid var(--border)`,
                color: 'var(--text-secondary)',
              }}
            >
              <Focus size={13} />
              Focus
            </button>
            <button
              onClick={onPiP}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
              style={{
                backgroundColor: 'var(--bg)',
                border: `1px solid var(--border)`,
                color: 'var(--text-secondary)',
              }}
            >
              <PictureInPicture2 size={13} />
              PiP
            </button>
          </>
        ) : status === 'exited' ? (
          <>
            <button
              onClick={onRestart}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--launch-btn)' }}
            >
              <RotateCcw size={13} />
              Restart
            </button>
            <button
              onClick={onPiP}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
              style={{
                backgroundColor: 'var(--bg)',
                border: `1px solid var(--border)`,
                color: 'var(--text-secondary)',
              }}
            >
              <PictureInPicture2 size={13} />
              PiP
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onLaunch}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--launch-btn)' }}
            >
              <Play size={13} />
              Launch
            </button>
            <button
              onClick={onPiP}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
              style={{
                backgroundColor: 'var(--bg)',
                border: `1px solid var(--border)`,
                color: 'var(--text-secondary)',
              }}
            >
              <PictureInPicture2 size={13} />
              PiP
            </button>
          </>
        )}
      </div>
    </div>
  );
}
