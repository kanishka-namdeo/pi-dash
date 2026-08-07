type MetricsFooterProps = {
  elapsed: number;
  activeAgents: number;
  totalCommands: number;
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MetricsFooter({ elapsed, activeAgents, totalCommands }: MetricsFooterProps) {
  return (
    <footer
      className="flex items-center gap-6 px-6 h-10"
      style={{
        backgroundColor: 'var(--bg)',
        borderTop: `1px solid var(--border)`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Elapsed
        </span>
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: 'var(--text-primary)' }}
        >
          {formatElapsed(elapsed)}
        </span>
      </div>

      <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />

      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Agents
        </span>
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: 'var(--text-primary)' }}
        >
          {activeAgents}
        </span>
      </div>

      <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />

      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Commands
        </span>
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: 'var(--text-primary)' }}
        >
          {totalCommands.toLocaleString()}
        </span>
      </div>
    </footer>
  );
}
