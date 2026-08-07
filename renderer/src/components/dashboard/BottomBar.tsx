import { useMemo, useState, useEffect } from 'react';
import { Timer, Zap, Bell, Settings, ChevronDown, GitBranch, AlertTriangle, X } from 'lucide-react';
import { useSessionContext } from '@/context/SessionContext';
import { useGitHub } from '@/context/GitHubContext';
import { useDashboardMode } from '@/hooks/useDashboardMode';
import { useBottomBarAlerts, BottomBarAlert } from '@/hooks/useBottomBarAlerts';
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

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}


type BottomBarProps = {
  rateLimitAlert?: { provider: string; percentUsed: number; resetsIn: number };
  agentError?: { agentId: string; message: string };
  githubAuthExpired?: boolean;
  planProgress?: { currentStep: number; totalSteps: number; stepName: string };
};

function formatResetTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function AlertContent({ alert, onDismiss }: { alert: BottomBarAlert; onDismiss: () => void }) {
  switch (alert.type) {
    case 'rate-limit':
      return (
        <div data-testid="rate-limit-alert" className="flex items-center gap-2 px-3 py-1 rounded" style={{ backgroundColor: '#f59e0b22' }}>
          <AlertTriangle size={14} style={{ color: 'var(--accent-amber)' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent-amber)' }}>
            {alert.provider}: {alert.percentUsed}% used — resets in {formatResetTime(alert.resetsIn)}
          </span>
          <button onClick={onDismiss} className="ml-2"><X size={12} style={{ color: 'var(--accent-amber)' }} /></button>
        </div>
      );
    case 'agent-error':
      return (
        <div data-testid="agent-error-alert" className="flex items-center gap-2 px-3 py-1 rounded" style={{ backgroundColor: '#f43f5e22' }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-rose)' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent-rose)' }}>
            {alert.agentId} {alert.message}
          </span>
          <button onClick={onDismiss} className="ml-2"><X size={12} style={{ color: 'var(--accent-rose)' }} /></button>
        </div>
      );
    case 'github-auth':
      return (
        <div data-testid="github-auth-alert" className="flex items-center gap-2 px-3 py-1 rounded" style={{ backgroundColor: '#f59e0b22' }}>
          <AlertTriangle size={14} style={{ color: 'var(--accent-amber)' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent-amber)' }}>
            GitHub session expired
          </span>
          <button onClick={onDismiss} className="ml-2"><X size={12} style={{ color: 'var(--accent-amber)' }} /></button>
        </div>
      );
    case 'plan-progress':
      return (
        <div data-testid="plan-progress-alert" className="flex items-center gap-2 px-3 py-1">
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Step {alert.currentStep}/{alert.totalSteps}: {alert.stepName}
          </span>
        </div>
      );
  }
}


export function BottomBar({ rateLimitAlert, agentError, githubAuthExpired, planProgress }: BottomBarProps = {}) {
  const { mode, setMode } = useDashboardMode('auto');
  const { getActiveSessions, sessions } = useSessionContext();
  const { activeRepo, branches } = useGitHub();
  const { alert, dismiss } = useBottomBarAlerts({ rateLimit: rateLimitAlert, agentError, githubAuthExpired, planProgress });
  const windowWidth = useWindowWidth();
  const showRepo = windowWidth >= 800;
  const showBranchLabel = windowWidth >= 700;
  
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
  
  const elapsed = useMemo(() => {
    const sessionArray = Array.from(sessions.values());
    if (sessionArray.length === 0) return 0;
    const earliest = Math.min(...sessionArray.map(s => s.createdAt));
    return Math.floor((Date.now() - earliest) / 1000);
  }, [sessions]);
  
  const totalCommands = useMemo(() => {
    return Array.from(sessions.values()).reduce((sum, s) => sum + s.commandHistory.length, 0);
  }, [sessions]);

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
                {showBranchLabel && (
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
                  </>
                )}
                {showRepo && (
                  <>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>·</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {activeRepo.name}
                    </span>
                  </>
                )}
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

      <div data-testid="bottom-bar-center" className="flex-1 flex justify-center items-center">
        {alert ? (
          <AlertContent alert={alert} onDismiss={dismiss} />
        ) : (
          <div data-testid="center-divider" className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />
        )}
      </div>

      {/* Right Zone */}
      <div data-testid="bottom-bar-right" className="flex items-center gap-4">
        {/* Mode Toggle */}
        <button
          data-testid="mode-toggle"
          className="flex items-center gap-1 px-2 py-1 rounded transition-colors"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--card) 50%, transparent)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {mode === 'auto' ? 'Auto' : mode === 'supervised' ? 'Supervised' : 'Manual'}
          </span>
          <ChevronDown size={12} style={{ color: 'var(--text-secondary)' }} />
        </button>

        {/* Separator */}
        <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />

        {/* Elapsed */}
        <div data-testid="elapsed-time" className="flex items-center gap-1">
          <Timer size={14} style={{ color: 'var(--text-secondary)' }} />
          <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
            {formatElapsed(elapsed)}
          </span>
        </div>

        {/* Agent Count */}
        <button
          data-testid="agent-count"
          className="flex items-center gap-1 px-1 rounded transition-colors"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--card) 50%, transparent)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
            {sessions.size}
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: getAgentStateColor(worstState) }}
          />
        </button>

        {/* Commands */}
        <div className="flex items-center gap-1">
          <Zap size={14} style={{ color: 'var(--text-secondary)' }} />
          <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
            {formatCount(totalCommands)}
          </span>
        </div>

        {/* Notifications */}
        <button
          data-testid="notifications-btn"
          className="flex items-center px-1 rounded transition-colors"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--card) 50%, transparent)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Bell size={14} style={{ color: 'var(--text-secondary)' }} />
        </button>

        {/* Settings */}
        <button
          data-testid="settings-btn"
          className="flex items-center px-1 rounded transition-colors"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--card) 50%, transparent)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Settings size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
    </footer>
  );
}
