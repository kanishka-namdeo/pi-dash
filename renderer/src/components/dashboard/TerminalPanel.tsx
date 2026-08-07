import { X } from 'lucide-react';
import { TerminalView } from '../terminal/TerminalView';

type TerminalPanelProps = {
  agentId: string | null;
  agentName?: string;
  onClose?: () => void;
};

export function TerminalPanel({ agentId, agentName, onClose }: TerminalPanelProps) {
  if (!agentId) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg)', border: `1px solid var(--border)` }}
      >
        <div className="text-center">
          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            No agent selected
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Click an agent to view terminal
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <div
        className="flex items-center justify-between px-4 h-10"
        style={{ backgroundColor: 'var(--card)', borderBottom: `1px solid var(--border)` }}
      >
        <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
          {agentName || agentId}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--accent-emerald)' }}>● Running</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10">
            <X size={14} />
          </button>
        </div>
      </div>
      <TerminalView agentId={agentId} />
    </div>
  );
}
