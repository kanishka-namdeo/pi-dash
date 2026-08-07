import { useAgents } from '@/hooks/useAgents';
import { useSessionContext } from '@/context/SessionContext';
import { Activity as ActivityIcon, Zap, PanelRightClose, PanelRightOpen } from 'lucide-react';
import type { FeedEvent } from '@/types/dashboard';
import { EmptyStatePanel } from '../ui/EmptyStatePanel';

type ActivityFeedProps = {
  events: FeedEvent[];
  isPaused: boolean;
  hasAgents: boolean;
  onAddAgent: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

const eventTypeStyles: Record<FeedEvent['type'], { bg: string; label: string }> = {
  'session:started': { bg: 'rgba(16, 185, 129, 0.2)', label: 'Started' },
  'session:exited': { bg: 'rgba(244, 63, 94, 0.2)', label: 'Exited' },
  'command': { bg: 'rgba(59, 130, 246, 0.2)', label: 'Command' },
  'github:issue': { bg: 'rgba(99, 102, 241, 0.2)', label: 'Issue' },
  'github:pr': { bg: 'rgba(168, 85, 247, 0.2)', label: 'PR' },
  'github:worktree': { bg: 'rgba(34, 197, 94, 0.2)', label: 'Worktree' },
};

const eventTypeColors: Record<FeedEvent['type'], string> = {
  'session:started': 'var(--accent-emerald)',
  'session:exited': 'var(--accent-rose)',
  'command': 'var(--accent-blue)',
  'github:issue': '#6366f1',
  'github:pr': '#a855f7',
  'github:worktree': '#22c55e',
};

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}


export function ActivityFeed({ events, isPaused, hasAgents, onAddAgent, isCollapsed = false, onToggleCollapse }: ActivityFeedProps) {
  const { agents } = useAgents();
  const { getSession } = useSessionContext();

  const getAgentName = (agentId: string) =>
    agents.find((a) => a.id === agentId)?.name ?? agentId;

  const reversedEvents = [...events].reverse();

  if (isCollapsed) {
    return (
      <aside
        className="w-9 flex flex-col items-center py-3 gap-3"
        style={{
          backgroundColor: 'var(--bg)',
          borderLeft: `1px solid var(--border)`,
        }}
      >
        {/* Live dot */}
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: 'var(--accent-emerald)' }}
        />

        {/* Event count badge */}
        <span
          className="text-xs font-mono px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            color: 'var(--accent-emerald)',
          }}
        >
          {events.length}
        </span>

        {/* Expand button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
            title="Expand activity feed"
          >
            <PanelRightOpen size={16} />
          </button>
        )}
      </aside>
    );
  }

  return (
    <aside
      className={`w-full lg:w-[320px] flex flex-col ${isPaused ? 'opacity-60' : ''}`}
      style={{
        backgroundColor: 'var(--bg)',
        borderLeft: `1px solid var(--border)`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid var(--border)` }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Activity
        </span>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--accent-emerald)' }}
            />
            <span
              className="text-xs"
              style={{ color: 'var(--accent-emerald)' }}
            >
              Live
            </span>
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
              title="Collapse activity feed"
            >
              <PanelRightClose size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {reversedEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <EmptyStatePanel
              icon={ActivityIcon}
              iconColor="var(--accent-blue)"
              title="No Activity Yet"
              description="Agent actions and commands will appear here in real-time."
              ctaLabel={hasAgents ? 'Launch an Agent' : 'Add Agent'}
              ctaIcon={Zap}
              ctaColor="var(--accent-blue)"
              onCta={onAddAgent}
            />
          </div>
        ) : (
          reversedEvents.map((event) => {
            const style = eventTypeStyles[event.type];
            const color = eventTypeColors[event.type];
            const agentName = getAgentName(event.agentId);

            return (
              <div
                key={event.id}
                className="flex gap-2.5 px-4 py-2.5"
                style={{ borderBottom: `1px solid var(--border)` }}
              >
                {/* Badge */}
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 h-fit"
                  style={{ backgroundColor: style.bg, color }}
                >
                  {style.label}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-mono truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {event.command || event.type}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="text-xs font-mono"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {agentName}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>·</span>
                    <span
                      className="text-xs font-mono"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
