import { useState, useEffect } from 'react';
import type { SessionInfo } from '@/context/SessionContext';

type RunningAgentCardProps = {
  session: SessionInfo;
  onFocus: (agentId: string) => void;
  onOpenAsOverlay: (agentId: string) => void;
};

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RunningAgentCard({ session, onFocus, onOpenAsOverlay }: RunningAgentCardProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => setElapsed(Date.now() - session.createdAt);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session.createdAt]);

  const isRunning = session.state === 'running';
  const statusColor = isRunning ? 'bg-blue-500' : 'bg-red-500';
  const commandCount = session.commandHistory.length;

  return (
    <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-2 h-2 rounded-full ${statusColor} ${isRunning ? 'animate-pulse' : ''}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[#e5e5e5] font-medium truncate">{session.agentId}</div>
          <div className="text-xs text-[#737373] font-mono">
            {formatElapsed(elapsed)} • {commandCount} cmd{commandCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onFocus(session.agentId)}
          className="flex-1 px-2 py-1.5 text-xs bg-[#2a2a2a] text-[#e5e5e5] rounded hover:bg-[#3a3a3a] transition-colors"
        >
          Focus
        </button>
        <button
          onClick={() => onOpenAsOverlay(session.agentId)}
          className="px-2 py-1.5 text-xs bg-[#2a2a2a] text-[#e5e5e5] rounded hover:bg-[#3a3a3a] transition-colors"
          title="Open as overlay"
        >
          PiP
        </button>
      </div>
    </div>
  );
}
