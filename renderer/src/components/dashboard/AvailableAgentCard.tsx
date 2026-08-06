import type { AgentConfig } from '@/types/session';

type AvailableAgentCardProps = {
  agent: AgentConfig;
  onLaunch: (agentId: string) => void;
  onOpenAsOverlay: (agentId: string) => void;
};

export function AvailableAgentCard({ agent, onLaunch, onOpenAsOverlay }: AvailableAgentCardProps) {
  const displayPath = agent.path.length > 50 ? `...${agent.path.slice(-47)}` : agent.path;

  return (
    <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] opacity-70 hover:opacity-100 transition-opacity">
      <div className="mb-2">
        <div className="text-sm text-[#e5e5e5] font-medium">{agent.name}</div>
        <div className="text-xs text-[#737373] font-mono truncate" title={agent.path}>
          {displayPath}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onLaunch(agent.id)}
          className="launch-button flex-1"
        >
          Launch
        </button>
        <button
          onClick={() => onOpenAsOverlay(agent.id)}
          className="px-2 py-1.5 text-xs bg-[#2a2a2a] text-[#e5e5e5] rounded hover:bg-[#3a3a3a] transition-colors"
          title="Open as overlay"
        >
          PiP
        </button>
      </div>
    </div>
  );
}
