import type { SessionInfo } from '@/context/SessionContext';
import type { AgentConfig } from '@/types/session';
import { RunningAgentCard } from './RunningAgentCard';
import { AvailableAgentCard } from './AvailableAgentCard';

type FleetPanelProps = {
  runningSessions: SessionInfo[];
  availableAgents: AgentConfig[];
  onFocus: (agentId: string) => void;
  onLaunch: (agentId: string) => void;
  onOpenAsOverlay: (agentId: string) => void;
};

export function FleetPanel({ runningSessions, availableAgents, onFocus, onLaunch, onOpenAsOverlay }: FleetPanelProps) {
  return (
    <aside className="w-full md:w-[240px] lg:w-[280px] md:border-r border-[#2a2a2a] bg-[#0a0a0a] flex flex-col">
      {/* Running section */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm font-semibold text-[#e5e5e5]">Running</span>
        <span className="text-xs font-mono text-[#737373] bg-[#1a1a1a] px-2 py-0.5 rounded">
          {runningSessions.length}
        </span>
      </div>
      <div className="px-3 py-2 space-y-2 border-b border-[#2a2a2a]">
        {runningSessions.length === 0 && (
          <div className="text-xs text-[#737373] text-center py-4">No running agents</div>
        )}
        {runningSessions.map((session) => (
          <RunningAgentCard
            key={session.agentId}
            session={session}
            onFocus={onFocus}
            onOpenAsOverlay={onOpenAsOverlay}
          />
        ))}
      </div>

      {/* Available section */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm font-semibold text-[#e5e5e5]">Available</span>
        <span className="text-xs font-mono text-[#737373] bg-[#1a1a1a] px-2 py-0.5 rounded">
          {availableAgents.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {availableAgents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#737373]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-sm text-[#a3a3a3] mb-1">No agents</p>
            <p className="text-xs text-[#737373]">Add agents to get started</p>
          </div>
        )}
        {availableAgents.map((agent) => (
          <AvailableAgentCard
            key={agent.id}
            agent={agent}
            onLaunch={onLaunch}
            onOpenAsOverlay={onOpenAsOverlay}
          />
        ))}
      </div>
    </aside>
  );
}