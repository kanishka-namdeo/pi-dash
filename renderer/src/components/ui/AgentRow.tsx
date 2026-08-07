import { Checkbox } from './Checkbox';

// Agent gradient registry
const AGENT_GRADIENTS: Record<string, { gradient: string; symbol: string }> = {
  omp: { gradient: 'from-indigo-500 to-purple-600', symbol: 'π' },
  cursor: { gradient: 'from-cyan-500 to-blue-600', symbol: '⌘' },
  aider: { gradient: 'from-emerald-500 to-teal-600', symbol: 'A' },
  claude: { gradient: 'from-orange-500 to-red-600', symbol: 'C' },
  codex: { gradient: 'from-orange-500 to-red-600', symbol: 'C' },
  continue: { gradient: 'from-violet-500 to-fuchsia-600', symbol: '▶' },
  copilot: { gradient: 'from-gray-500 to-gray-600', symbol: 'G' },
};

interface AgentRowProps {
  name: string;
  path: string;
  icon: string;
  gradient: string;
  selected?: boolean;
  onToggle?: () => void;
  showCheckbox?: boolean;
  badge?: string;
}

function AgentAvatar({ iconKey }: { iconKey: string }) {
  const entry = AGENT_GRADIENTS[iconKey];
  if (!entry) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
        <span className="text-slate-400 text-sm">?</span>
      </div>
    );
  }
  return (
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${entry.gradient} flex items-center justify-center shrink-0`}>
      <span className="text-white text-sm font-bold">{entry.symbol}</span>
    </div>
  );
}

export function AgentRow({
  name,
  path,
  icon,
  gradient,
  selected = false,
  onToggle,
  showCheckbox = false,
  badge,
}: AgentRowProps) {
  const borderColor = selected ? '#4f46e5' : '#334155';
  const bgColor = selected ? '#4f46e522' : '#1a1a1a';

  return (
    <div
      className="rounded-lg flex items-center gap-3 p-3 transition-colors"
      style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
    >
      {showCheckbox && (
        <Checkbox checked={selected} onChange={() => onToggle?.()} />
      )}
      <AgentAvatar iconKey={icon} />
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-semibold truncate">{name}</div>
        <div className="text-slate-400 text-xs truncate">{path}</div>
      </div>
      {badge && (
        <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 shrink-0">
          {badge}
        </span>
      )}
    </div>
  );
}
