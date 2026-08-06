const AGENT_GRADIENTS: Record<string, { gradient: string; symbol: string }> = {
  omp: { gradient: 'from-blue-500 to-cyan-500', symbol: 'π' },
  cursor: { gradient: 'from-cyan-500 to-blue-600', symbol: '⌘' },
  aider: { gradient: 'from-emerald-500 to-teal-600', symbol: 'A' },
  codex: { gradient: 'from-orange-500 to-red-600', symbol: 'C' },
  continue: { gradient: 'from-violet-500 to-fuchsia-600', symbol: '▶' },
};

export function AgentIcon({ iconKey, size = 'md' }: { iconKey: string; size?: 'sm' | 'md' | 'lg' }) {
  const entry = AGENT_GRADIENTS[iconKey];
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-lg',
    lg: 'w-12 h-12 text-xl',
  };

  if (!entry) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg bg-slate-700 flex items-center justify-center shrink-0`}>
        <span className="text-slate-400">?</span>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br ${entry.gradient} flex items-center justify-center shrink-0`}
    >
      <span className="text-white font-bold">{entry.symbol}</span>
    </div>
  );
}
