import { UserPlus, Plus, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { SessionInfo } from '@/context/SessionContext';
import type { AgentConfig } from '@/types/session';
import { AgentCard } from './AgentCard';
import { EmptyStatePanel } from '../ui/EmptyStatePanel';

type FleetPanelProps = {
  runningSessions: SessionInfo[];
  availableAgents: AgentConfig[];
  onFocus: (agentId: string) => void;
  onLaunch: (agentId: string) => void;
  onRestart: (agentId: string) => void;
  onOpenAsOverlay: (agentId: string) => void;
  onAddAgent: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function FleetPanel({
  runningSessions,
  availableAgents,
  onFocus,
  onLaunch,
  onRestart,
  onOpenAsOverlay,
  onAddAgent,
  isCollapsed = false,
  onToggleCollapse,
}: FleetPanelProps) {
  if (isCollapsed) {
    return (
      <aside
        className="w-12 flex flex-col items-center"
        style={{
          backgroundColor: 'var(--bg)',
          borderRight: `1px solid var(--border)`,
        }}
      >
        {/* Running avatars */}
        <div className="flex flex-col items-center gap-2 py-3">
          {runningSessions.map((session) => (
            <button
              key={session.agentId}
              onClick={() => onFocus(session.agentId)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: 'var(--accent-indigo)',
                color: '#ffffff',
              }}
              title={session.agentId}
            >
              {session.agentId[0].toUpperCase()}
            </button>
          ))}
        </div>

        {/* Available avatars */}
        {availableAgents.length > 0 && (
          <div className="flex flex-col items-center gap-2 py-3">
            {availableAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onLaunch(agent.id)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: agent.color || 'var(--accent-emerald)',
                  color: agent.textColor || '#ffffff',
                }}
                title={agent.name}
              >
                {agent.name[0].toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Add agent button */}
        <button
          onClick={onAddAgent}
          className="w-8 h-8 rounded-full flex items-center justify-center mb-2 cursor-pointer hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: 'var(--card)',
            color: 'var(--text-muted)',
            border: `1px dashed var(--border)`,
          }}
          title="Add Agent"
        >
          <Plus size={14} />
        </button>

        {/* Toggle expand button */}
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded flex items-center justify-center mb-3 cursor-pointer hover:opacity-80 transition-opacity"
          style={{
            color: 'var(--text-muted)',
          }}
          title="Expand panel"
        >
          <PanelLeftOpen size={16} />
        </button>
      </aside>
    );
  }

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
          <EmptyStatePanel
            icon={UserPlus}
            iconColor="var(--accent-indigo)"
            title="No Running Agents"
            description="Launch an agent to start working."
          />
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
            status={session.state === 'running' ? 'active' : 'exited'}
            onRestart={() => onRestart(session.agentId)}
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
          <div className="flex items-center justify-center h-full">
            <EmptyStatePanel
              icon={UserPlus}
              iconColor="var(--accent-indigo)"
              title="No Agents"
              description="Add an agent to start monitoring and managing AI coding tasks."
              ctaLabel="Add Agent"
              ctaIcon={Plus}
              onCta={onAddAgent}
            />
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
      {/* Toggle collapse button */}
      <div
        className="flex items-center justify-end px-3 py-2"
        style={{ borderTop: `1px solid var(--border)` }}
      >
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
          title="Collapse panel"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>
    </aside>
  );
}
