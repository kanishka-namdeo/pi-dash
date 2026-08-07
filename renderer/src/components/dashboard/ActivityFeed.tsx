import { useAgents } from '@/hooks/useAgents';
import { useSessionContext } from '@/context/SessionContext';
import type { FeedEvent } from '@/types/dashboard';

const eventTypeStyles: Record<FeedEvent['type'], { bg: string; label: string }> = {
  'session:started': { bg: 'rgba(16, 185, 129, 0.2)', label: 'Started' },
  'session:exited': { bg: 'rgba(244, 63, 94, 0.2)', label: 'Exited' },
  'command': { bg: 'rgba(59, 130, 246, 0.2)', label: 'Command' },
};

const eventTypeColors: Record<FeedEvent['type'], string> = {
  'session:started': 'var(--accent-emerald)',
  'session:exited': 'var(--accent-rose)',
  'command': 'var(--accent-blue)',
};

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

type ActivityFeedProps = {
  events: FeedEvent[];
  isPaused: boolean;
};

export function ActivityFeed({ events, isPaused }: ActivityFeedProps) {
  const { agents } = useAgents();
  const { getSession } = useSessionContext();

  const getAgentName = (agentId: string) =>
    agents.find((a) => a.id === agentId)?.name ?? agentId;

  const reversedEvents = [...events].reverse();

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
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {reversedEvents.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            No activity yet
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
