import { TerminalView } from '../terminal/TerminalView';

type TerminalPanelProps = {
  agentId: string | null;
};

export function TerminalPanel({ agentId }: TerminalPanelProps) {
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
      <TerminalView agentId={agentId} />
    </div>
  );
}
