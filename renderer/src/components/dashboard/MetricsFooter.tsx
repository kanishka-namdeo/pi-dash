type MetricsFooterProps = {
  progress: number;
  elapsed: number;
  activeAgents: number;
  tokens: number;
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MetricsFooter({ progress, elapsed, activeAgents, tokens }: MetricsFooterProps) {
  return (
    <footer className="flex items-center px-6 py-3 border-t border-[#2a2a2a] bg-[#0a0a0a]">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#737373]">Progress</span>
          <span className="text-xs font-mono text-[#e5e5e5]">{progress}%</span>
        </div>

        <div className="w-px h-4 bg-[#2a2a2a]" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#737373]">Elapsed</span>
          <span className="text-xs font-mono text-[#e5e5e5]">{formatElapsed(elapsed)}</span>
        </div>

        <div className="w-px h-4 bg-[#2a2a2a]" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#737373]">Agents</span>
          <span className="text-xs font-mono text-[#e5e5e5]">{activeAgents}</span>
        </div>

        <div className="w-px h-4 bg-[#2a2a2a]" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#737373]">Tokens</span>
          <span className="text-xs font-mono text-amber-500">{tokens.toLocaleString()}</span>
        </div>
      </div>
    </footer>
  );
}
