import type { Agent } from '@/types/dashboard';
import { AgentCard } from './AgentCard';

type FleetPanelProps = {
  agents: Agent[];
  selectedAgentId?: string;
  onSelectAgent: (id: string) => void;
};

export function FleetPanel({ agents, selectedAgentId, onSelectAgent }: FleetPanelProps) {
  return (
    <aside className="w-[280px] border-r border-[#2a2a2a] bg-[#0a0a0a] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm text-[#e5e5e5] font-medium">Fleet</span>
        <span className="text-xs font-mono text-[#737373] bg-[#1a1a1a] px-2 py-0.5 rounded">
          {agents.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={agent.id === selectedAgentId}
            onClick={() => onSelectAgent(agent.id)}
          />
        ))}
      </div>
    </aside>
  );
}
