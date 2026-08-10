// Stub implementation - AgentDisconnected
interface AgentDisconnectedProps {
  agentName: string;
  onReconnect?: () => void;
}

export function AgentDisconnected({ agentName, onReconnect }: AgentDisconnectedProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded">
      <span>{agentName} is disconnected</span>
      {onReconnect && (
        <button onClick={onReconnect} className="text-sm underline">
          Reconnect
        </button>
      )}
    </div>
  );
}
