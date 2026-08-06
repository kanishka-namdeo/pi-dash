import { useRealActivityFeed } from '@/hooks/useRealActivityFeed';
import { useAgents } from '@/hooks/useAgents';
import { useSessionContext } from '@/context/SessionContext';
import type { FeedEvent } from '@/types/dashboard';

const eventTypeStyles: Record<FeedEvent['type'], string> = {
  'session:started': 'bg-emerald-500/20 text-emerald-500',
  'session:exited': 'bg-red-500/20 text-red-500',
  'command': 'bg-blue-500/20 text-blue-500',
};

const eventTypeLabels: Record<FeedEvent['type'], string> = {
  'session:started': 'Started',
  'session:exited': 'Exited',
  'command': 'Command',
};

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function ActivityFeed() {
  const { events, isPaused } = useRealActivityFeed();
  const { agents } = useAgents();
  const { getSession } = useSessionContext();

  const getAgentName = (agentId: string) =>
    agents.find((a) => a.id === agentId)?.name ?? agentId;

  const getCommandOutputLines = (agentId: string, command: string, timestamp: number): string[] => {
    const session = getSession(agentId);
    if (!session) return [];
    const cmd = session.commandHistory.find((c) => c.command === command && c.timestamp === timestamp);
    if (!cmd?.output) return [];
    return cmd.output.split('\n').filter((l) => l.trim()).slice(0, 3);
  };

  const reversedEvents = [...events].reverse();

  return (
    <aside className={`w-full lg:w-[320px] bg-[#0a0a0a] flex flex-col ${isPaused ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm font-semibold text-[#e5e5e5]">Activity</span>
        <div className="flex items-center gap-2">
          {isPaused && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/20 text-amber-500">
              PAUSED
            </span>
          )}
          <div
            className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {reversedEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#737373]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <p className="text-sm text-[#a3a3a3] mb-1">No activity yet</p>
            <p className="text-xs text-[#737373]">Activity will appear here as agents work</p>
          </div>
        )}

        {reversedEvents.map((event) => {
          const agentName = getAgentName(event.agentId);
          const outputLines =
            event.type === 'command' && event.command
              ? getCommandOutputLines(event.agentId, event.command, event.timestamp)
              : [];

          return (
            <div
              key={event.id}
              className="px-4 py-3 border-b border-[#1a1a1a] animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-3">
                <span className="text-xs font-mono text-[#737373] pt-0.5">
                  {formatTimestamp(event.timestamp)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${eventTypeStyles[event.type]}`}
                    >
                      {eventTypeLabels[event.type]}
                    </span>
                    <span className="text-[10px] text-[#737373]">{agentName}</span>
                  </div>
                  {event.type === 'command' && event.command && (
                    <div className="text-xs text-[#a3a3a3] font-mono mb-1 truncate">{event.command}</div>
                  )}
                  {event.type === 'session:started' && (
                    <div className="text-xs text-[#a3a3a3]">Session started</div>
                  )}
                  {event.type === 'session:exited' && (
                    <div className="text-xs text-[#a3a3a3]">Session exited</div>
                  )}
                  {outputLines.length > 0 && (
                    <div className="mt-1 p-2 bg-[#1a1a1a] rounded text-[10px] font-mono text-[#737373] border border-[#2a2a2a]">
                      {outputLines.map((line, i) => (
                        <div key={i} className="truncate">
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
