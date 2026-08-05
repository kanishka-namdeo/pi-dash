import { useAgentSession } from '../../hooks/useAgentSession';
import { TerminalPane } from './TerminalPane';

export function TerminalView({ agentId }: { agentId: string }) {
  const { state, pause, resume, kill, restart, clearHistory } = useAgentSession(agentId);
  
  return (
    <div className="terminal-view">
      <div className="terminal-controls">
        {state === 'working' || state === 'waiting' ? (
          <button onClick={pause}>Pause</button>
        ) : state === 'paused' ? (
          <button onClick={resume}>Resume</button>
        ) : null}
        
        {state !== 'killed' && (
          <button onClick={kill}>Kill</button>
        )}
        
        {state === 'killed' && (
          <button onClick={restart}>Restart</button>
        )}
        
        <button onClick={clearHistory}>Clear History</button>
      </div>
      
      <TerminalPane agentId={agentId} />
    </div>
  );
}