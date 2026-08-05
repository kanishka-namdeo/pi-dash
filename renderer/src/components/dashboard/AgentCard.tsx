import type { Agent } from '@/types/dashboard';

type AgentCardProps = {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
  onViewDetails: () => void;
  onLaunch: (agentId: string) => void;
};

export function AgentCard({ agent, isSelected, onClick, onViewDetails, onLaunch }: AgentCardProps) {
  const statusColor =
    agent.status === 'active'
      ? 'bg-emerald-500'
      : agent.status === 'idle'
        ? 'bg-amber-500'
        : 'bg-gray-500';

  const barColor = agent.status === 'active' ? agent.textColor : '#f59e0b';

  const displayPath = agent.path
    ? agent.path.length > 50 ? `...${agent.path.slice(-47)}` : agent.path
    : undefined;

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-[#2a2a2a] border border-[#3a3a3a]' : 'bg-[#1a1a1a] hover:bg-[#1f1f1f]'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
          style={{ background: agent.color, color: agent.textColor }}
        >
          {agent.short}
        </div>
        <div className="flex-1">
          <div className="text-sm text-[#e5e5e5] font-medium">{agent.name}</div>
        </div>
        <div className={`w-2 h-2 rounded-full ${statusColor} ${agent.status === 'active' ? 'animate-pulse' : ''}`} />
      </div>
      {displayPath && (
        <div className="text-xs font-mono text-[#737373] truncate mb-2" title={agent.path}>{displayPath}</div>
      )}

      {agent.progress > 0 && (
        <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${agent.progress}%`, background: barColor }}
          />
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <button
          onClick={(e) => { e.stopPropagation(); onLaunch(agent.id); }}
          className="launch-button flex-1"
        >
          Launch
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
          className="px-2 py-1 text-xs text-blue-500 hover:text-blue-400 transition-colors"
        >
          View Terminal →
        </button>
      </div>
    </div>
  );
}
