import { resolveAgentPath } from '../../utils/agentPathResolver';

interface AgentChipProps {
  name: string;
  agentId: string;
  onClick: (path: string) => void;
  selected?: boolean;
}

export function AgentChip({ name, agentId, onClick, selected = false }: AgentChipProps) {
  const borderColor = selected ? '#4f46e5' : '#475569';
  const bgColor = selected ? '#4f46e522' : 'transparent';

  const handleClick = async () => {
    const path = await resolveAgentPath(agentId);
    onClick(path);
  };

  return (
    <button
      role="button"
      aria-pressed={selected}
      onClick={handleClick}
      className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        color: selected ? '#a5b4fc' : '#94a3b8',
      }}
    >
      {name}
    </button>
  );
}
