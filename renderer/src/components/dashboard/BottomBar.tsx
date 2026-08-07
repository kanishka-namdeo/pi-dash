import { useSessionContext } from '@/context/SessionContext';
import { useGitHub } from '@/context/GitHubContext';
import { GitBranch } from 'lucide-react';

type AgentState = 'running' | 'idle' | 'error' | 'exited';

function getAgentStateColor(state: AgentState): string {
  switch (state) {
    case 'running': return 'var(--accent-emerald)';
    case 'idle': return 'var(--accent-amber)';
    case 'error': return 'var(--accent-rose)';
    case 'exited': return 'var(--text-muted)';
  }
}

function getWorstState(states: AgentState[]): AgentState {
  const priority: AgentState[] = ['error', 'idle', 'running', 'exited'];
  for (const state of priority) {
    if (states.includes(state)) return state;
  }
  return 'exited';
}

export function BottomBar() {
  const { getActiveSessions, sessions } = useSessionContext();
  const { activeRepo, branches } = useGitHub();
  
  const activeSessions = getActiveSessions();
  const hasAgents = activeSessions.length > 0;
  
  // Get primary agent (most recently active)
  const primaryAgent = activeSessions.sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];
  const agentState: AgentState = primaryAgent?.state === 'running' ? 'running' : 'idle';
  
  // Get all agent states for worst-state calculation
  const allStates: AgentState[] = Array.from(sessions.values()).map(s => 
    s.state === 'running' ? 'running' : s.state === 'exited' ? 'exited' : 'idle'
  );
  const worstState = getWorstState(allStates);

  return (
    <footer
      data-testid="bottom-bar"
      className="flex items-center justify-between px-4 h-9"
      style={{
        backgroundColor: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        height: '36px',
      }}
    >
      {/* Left Zone */}
      <div data-testid="bottom-bar-left" className="flex items-center gap-3">
        {hasAgents && primaryAgent ? (
          <>
            <button
              data-testid="agent-pill"
              className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors"
              style={{ fontSize: '13px' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--card) 50%, transparent)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span
                data-testid="agent-status-dot"
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getAgentStateColor(agentState) }}
              />
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {primaryAgent.agentId}
              </span>
            </button>
            {activeRepo && (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>·</span>
                <button
                  className="flex items-center gap-1 px-1 rounded transition-colors"
                  style={{ fontSize: '13px' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--card) 50%, transparent)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <GitBranch size={14} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{branches[0] || 'main'}</span>
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>·</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {activeRepo.name}
                </span>
              </>
            )}
          </>
        ) : (
          <>
            <span style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: 700 }}>π</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>PiDash</span>
          </>
        )}
      </div>

      {/* Center Zone */}
      <div data-testid="bottom-bar-center" className="flex-1 flex justify-center items-center" />

      {/* Right Zone */}
      <div data-testid="bottom-bar-right" className="flex items-center gap-4" />
    </footer>
  );
}
