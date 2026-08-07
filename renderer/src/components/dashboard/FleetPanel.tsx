import type { SessionInfo } from '@/context/SessionContext';
import type { AgentConfig } from '@/types/session';
import { AgentCard } from './AgentCard';

type FleetPanelProps = {
  runningSessions: SessionInfo[];
  availableAgents: AgentConfig[];
  onFocus: (agentId: string) => void;
  onLaunch: (agentId: string) => void;
  onOpenAsOverlay: (agentId: string) => void;
};

export function FleetPanel({
  runningSessions,
  availableAgents,
  onFocus,
  onLaunch,
  onOpenAsOverlay,
}: FleetPanelProps) {
  return (
    <aside
      className="w-full md:w-[240px] lg:w-[280px] flex flex-col"
      style={{
        backgroundColor: 'var(--bg)',
        borderRight: `1px solid var(--border)`,
      }}
    >
      {/* Running section */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid var(--border)` }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Running
        </span>
        <span
          className="text-xs font-mono px-2 py-0.5 rounded"
          style={{
            backgroundColor: 'var(--card)',
            color: 'var(--text-muted)',
          }}
        >
          {runningSessions.length}
        </span>
      </div>
      <div
        className="max-h-[40%] overflow-y-auto px-3 py-2 space-y-2"
        style={{ borderBottom: `1px solid var(--border)` }}
      >
        {runningSessions.length === 0 && (
          <div
            className="text-xs text-center py-4"
            style={{ color: 'var(--text-muted)' }}
          >
            No running agents
          </div>
        )}
        {runningSessions.map((session) => (
          <AgentCard
            key={session.agentId}
            variant="running"
            name={session.agentId}
            avatar={{
              letter: session.agentId[0].toUpperCase(),
              color: 'var(--accent-indigo)',
            }}
            cwd={session.cwd || undefined}
            status={session.state === 'running' ? 'active' : 'idle'}
            onFocus={() => onFocus(session.agentId)}
            onPiP={() => onOpenAsOverlay(session.agentId)}
          />
        ))}
      </div>

      {/* Available section */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid var(--border)` }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Available
        </span>
        <span
          className="text-xs font-mono px-2 py-0.5 rounded"
          style={{
            backgroundColor: 'var(--card)',
            color: 'var(--text-muted)',
          }}
        >
          {availableAgents.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {availableAgents.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-full p-8 text-center"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--card)' }}
            >
              <svg
                className="w-6 h-6"
                style={{ color: 'var(--text-muted)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              No agents
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Add agents to get started
            </p>
          </div>
        )}
        {availableAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            variant="available"
            name={agent.name}
            avatar={{
              letter: agent.name[0].toUpperCase(),
              color: agent.color || 'var(--accent-emerald)',
            }}
            path={agent.path}
            onLaunch={() => onLaunch(agent.id)}
            onPiP={() => onOpenAsOverlay(agent.id)}
          />
        ))}
      </div>
    </aside>
  );
}
