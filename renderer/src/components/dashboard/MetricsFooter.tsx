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
    <footer className="flex items-center px-6 py-3 border-t border-[#2a2a2a] bg-[#0a0a0a]">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#737373]">Elapsed</span>
          <span className="text-xs font-mono tabular-nums text-[#e5e5e5]">{formatElapsed(elapsed)}</span>
        </div>

        <div className="w-px h-4 bg-[#2a2a2a]" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#737373]">Agents</span>
          <span className="text-xs font-mono tabular-nums text-[#e5e5e5]">{activeAgents}</span>
        </div>

        <div className="w-px h-4 bg-[#2a2a2a]" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#737373]">Commands</span>
          <span className="text-xs font-mono tabular-nums text-[#e5e5e5]">{totalCommands.toLocaleString()}</span>
        </div>
      </div>
    </footer>
  );
}
