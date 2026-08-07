# Bottom Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing MetricsFooter with a comprehensive BottomBar that provides agent monitoring, workspace context, and key metrics in a three-zone layout.

**Architecture:** The BottomBar is a persistent footer component with Left/Center/Right zones. Left shows agent pill + branch + repo. Center shows alerts or a hairline divider when empty. Right shows mode toggle, elapsed time, agent count, command count, notifications, and settings. A new `useBottomBarAlerts` hook manages the alert queue with priority-based display.

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react icons

## Global Constraints

- Height: 36px
- Background: `var(--bg)`
- Top border: 1px `var(--border)`
- Font: Geist for labels, Geist Mono for numeric values
- All clickable items must have hover state: `var(--card)` at 50% opacity, 4px radius
- Minimum click target: 28px height

---

### Task 1: Create BottomBar Component Shell

**Files:**
- Create: `renderer/src/components/dashboard/BottomBar.tsx`
- Test: `renderer/src/components/dashboard/__tests__/BottomBar.test.tsx`

**Interfaces:**
- Consumes: Nothing (shell component)
- Produces: `BottomBar` component with three zone containers

- [ ] **Step 1: Write the failing test**

```tsx
// renderer/src/components/dashboard/__tests__/BottomBar.test.tsx
import { render, screen } from '@testing-library/react';
import { BottomBar } from '../BottomBar';

describe('BottomBar', () => {
  it('renders three zones', () => {
    render(<BottomBar />);
    expect(screen.getByTestId('bottom-bar-left')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-bar-center')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-bar-right')).toBeInTheDocument();
  });

  it('has correct height and border', () => {
    render(<BottomBar />);
    const bar = screen.getByTestId('bottom-bar');
    expect(bar).toHaveStyle({ height: '36px' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/components/dashboard/__tests__/BottomBar.test.tsx`
Expected: FAIL — BottomBar not defined

- [ ] **Step 3: Write minimal implementation**

```tsx
// renderer/src/components/dashboard/BottomBar.tsx
export function BottomBar() {
  return (
    <footer
      data-testid="bottom-bar"
      className="flex items-center justify-between px-4 h-9"
      style={{
        backgroundColor: 'var(--bg)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div data-testid="bottom-bar-left" className="flex items-center gap-3" />
      <div data-testid="bottom-bar-center" className="flex-1 flex justify-center items-center" />
      <div data-testid="bottom-bar-right" className="flex items-center gap-4" />
    </footer>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/components/dashboard/__tests__/BottomBar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/dashboard/BottomBar.tsx renderer/src/components/dashboard/__tests__/BottomBar.test.tsx
git commit -m "feat: add BottomBar component shell with three zones"
```

---

### Task 2: Implement Left Zone — Agent Pill

**Files:**
- Modify: `renderer/src/components/dashboard/BottomBar.tsx`
- Test: `renderer/src/components/dashboard/__tests__/BottomBar.test.tsx`

**Interfaces:**
- Consumes: `SessionContext` for active agent, `GitHubContext` for branch/repo
- Produces: Left zone with agent pill, branch, repo

- [ ] **Step 1: Write the failing test**

```tsx
// Add to BottomBar.test.tsx
import { SessionProvider } from '@/context/SessionContext';
import { GitHubProvider } from '@/context/GitHubContext';

describe('BottomBar Left Zone', () => {
  it('renders agent pill with status dot', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId('agent-pill')).toBeInTheDocument();
    expect(screen.getByTestId('agent-status-dot')).toBeInTheDocument();
  });

  it('shows app name when no agents', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByText('PiDash')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/components/dashboard/__tests__/BottomBar.test.tsx`
Expected: FAIL — agent-pill not found

- [ ] **Step 3: Write implementation**

```tsx
// renderer/src/components/dashboard/BottomBar.tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/components/dashboard/__tests__/BottomBar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/dashboard/BottomBar.tsx renderer/src/components/dashboard/__tests__/BottomBar.test.tsx
git commit -m "feat: implement BottomBar left zone with agent pill, branch, repo"
```

---

### Task 3: Implement Right Zone — Metrics & Actions

**Files:**
- Modify: `renderer/src/components/dashboard/BottomBar.tsx`
- Test: `renderer/src/components/dashboard/__tests__/BottomBar.test.tsx`

**Interfaces:**
- Consumes: `useDashboardMode`, session data for elapsed/commands
- Produces: Right zone with mode toggle, elapsed, agent count, commands, notifications, settings

- [ ] **Step 1: Write the failing test**

```tsx
// Add to BottomBar.test.tsx
describe('BottomBar Right Zone', () => {
  it('renders mode toggle', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId('mode-toggle')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('renders elapsed time', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId('elapsed-time')).toBeInTheDocument();
  });

  it('renders agent count with status dot', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId('agent-count')).toBeInTheDocument();
  });

  it('renders settings button', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId('settings-btn')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/components/dashboard/__tests__/BottomBar.test.tsx`
Expected: FAIL — mode-toggle not found

- [ ] **Step 3: Write implementation**

Add to BottomBar.tsx:

```tsx
import { Timer, Zap, Bell, Settings, ChevronDown } from 'lucide-react';
import { useDashboardMode } from '@/hooks/useDashboardMode';

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

export function BottomBar() {
  const { mode, setMode } = useDashboardMode();
  const { getActiveSessions, sessions } = useSessionContext();
  const { activeRepo, branches } = useGitHub();
  
  const activeSessions = getActiveSessions();
  const hasAgents = activeSessions.length > 0;
  const primaryAgent = activeSessions.sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];
  const agentState: AgentState = primaryAgent?.state === 'running' ? 'running' : 'idle';
  
  const allStates: AgentState[] = Array.from(sessions.values()).map(s => 
    s.state === 'running' ? 'running' : s.state === 'exited' ? 'exited' : 'idle'
  );
  const worstState = getWorstState(allStates);
  
  // Calculate elapsed time from earliest session
  const elapsed = useMemo(() => {
    const sessionArray = Array.from(sessions.values());
    if (sessionArray.length === 0) return 0;
    const earliest = Math.min(...sessionArray.map(s => s.createdAt));
    return Math.floor((Date.now() - earliest) / 1000);
  }, [sessions]);
  
  // Calculate total commands
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
      }}
    >
      {/* Left Zone - unchanged */}
      <div data-testid="bottom-bar-left" className="flex items-center gap-3">
        {/* ... existing left zone code ... */}
      </div>

      {/* Center Zone */}
      <div data-testid="bottom-bar-center" className="flex-1 flex justify-center items-center">
        <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/components/dashboard/__tests__/BottomBar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/dashboard/BottomBar.tsx renderer/src/components/dashboard/__tests__/BottomBar.test.tsx
git commit -m "feat: implement BottomBar right zone with metrics and actions"
```

---

### Task 4: Create useBottomBarAlerts Hook

**Files:**
- Create: `renderer/src/hooks/useBottomBarAlerts.ts`
- Test: `renderer/src/hooks/__tests__/useBottomBarAlerts.test.ts`

**Interfaces:**
- Consumes: GitHub auth state, rate limit data, agent errors
- Produces: `useBottomBarAlerts()` hook returning current alert or null

- [ ] **Step 1: Write the failing test**

```tsx
// renderer/src/hooks/__tests__/useBottomBarAlerts.test.ts
import { renderHook } from '@testing-library/react';
import { useBottomBarAlerts, AlertType } from '../useBottomBarAlerts';

describe('useBottomBarAlerts', () => {
  it('returns null when no alerts', () => {
    const { result } = renderHook(() => useBottomBarAlerts());
    expect(result.current.alert).toBeNull();
  });

  it('prioritizes error over rate limit', () => {
    const { result } = renderHook(() => useBottomBarAlerts({
      agentError: { agentId: 'omp', message: 'Exited unexpectedly' },
      rateLimit: { provider: 'claude', percentUsed: 85, resetsIn: 9000 },
    }));
    expect(result.current.alert?.type).toBe('agent-error');
  });

  it('can dismiss alerts', () => {
    const { result } = renderHook(() => useBottomBarAlerts({
      rateLimit: { provider: 'claude', percentUsed: 85, resetsIn: 9000 },
    }));
    expect(result.current.alert).not.toBeNull();
    result.current.dismiss();
    expect(result.current.alert).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/hooks/__tests__/useBottomBarAlerts.test.ts`
Expected: FAIL — useBottomBarAlerts not defined

- [ ] **Step 3: Write implementation**

```tsx
// renderer/src/hooks/useBottomBarAlerts.ts
import { useState, useMemo } from 'react';

export type AlertType = 'agent-error' | 'rate-limit' | 'github-auth' | 'plan-progress';

export interface AgentErrorAlert {
  type: 'agent-error';
  agentId: string;
  message: string;
}

export interface RateLimitAlert {
  type: 'rate-limit';
  provider: string;
  percentUsed: number;
  resetsIn: number; // seconds
}

export interface GitHubAuthAlert {
  type: 'github-auth';
}

export interface PlanProgressAlert {
  type: 'plan-progress';
  currentStep: number;
  totalSteps: number;
  stepName: string;
}

export type BottomBarAlert = AgentErrorAlert | RateLimitAlert | GitHubAuthAlert | PlanProgressAlert;

interface UseBottomBarAlertsOptions {
  agentError?: { agentId: string; message: string };
  rateLimit?: { provider: string; percentUsed: number; resetsIn: number };
  githubAuthExpired?: boolean;
  planProgress?: { currentStep: number; totalSteps: number; stepName: string };
}

function formatResetTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function useBottomBarAlerts(options: UseBottomBarAlertsOptions = {}) {
  const [dismissed, setDismissed] = useState<Set<AlertType>>(new Set());

  const alert = useMemo<BottomBarAlert | null>(() => {
    // Priority: error > rate-limit > github-auth > plan-progress
    if (options.agentError && !dismissed.has('agent-error')) {
      return { type: 'agent-error', ...options.agentError };
    }
    if (options.rateLimit && !dismissed.has('rate-limit')) {
      return { type: 'rate-limit', ...options.rateLimit };
    }
    if (options.githubAuthExpired && !dismissed.has('github-auth')) {
      return { type: 'github-auth' };
    }
    if (options.planProgress && !dismissed.has('plan-progress')) {
      return { type: 'plan-progress', ...options.planProgress };
    }
    return null;
  }, [options, dismissed]);

  const dismiss = () => {
    if (alert) {
      setDismissed(prev => new Set(prev).add(alert.type));
    }
  };

  return { alert, dismiss };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/hooks/__tests__/useBottomBarAlerts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/hooks/useBottomBarAlerts.ts renderer/src/hooks/__tests__/useBottomBarAlerts.test.ts
git commit -m "feat: add useBottomBarAlerts hook for alert queue management"
```

---

### Task 5: Implement Center Zone — Alert Rendering

**Files:**
- Modify: `renderer/src/components/dashboard/BottomBar.tsx`
- Test: `renderer/src/components/dashboard/__tests__/BottomBar.test.tsx`

**Interfaces:**
- Consumes: `useBottomBarAlerts` hook
- Produces: Center zone with alert rendering or divider

- [ ] **Step 1: Write the failing test**

```tsx
// Add to BottomBar.test.tsx
describe('BottomBar Center Zone', () => {
  it('shows divider when no alerts', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId('center-divider')).toBeInTheDocument();
  });

  it('shows rate limit alert when active', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar rateLimitAlert={{ provider: 'claude', percentUsed: 85, resetsIn: 9000 }} />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId('rate-limit-alert')).toBeInTheDocument();
    expect(screen.getByText(/80% used/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/components/dashboard/__tests__/BottomBar.test.tsx`
Expected: FAIL — center-divider not found

- [ ] **Step 3: Write implementation**

Update BottomBar.tsx center zone:

```tsx
import { AlertTriangle, X } from 'lucide-react';
import { useBottomBarAlerts, BottomBarAlert } from '@/hooks/useBottomBarAlerts';

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
        <div
          data-testid="rate-limit-alert"
          className="flex items-center gap-2 px-3 py-1 rounded"
          style={{ backgroundColor: '#f59e0b22' }}
        >
          <AlertTriangle size={14} style={{ color: 'var(--accent-amber)' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent-amber)' }}>
            {alert.provider}: {alert.percentUsed}% used — resets in {formatResetTime(alert.resetsIn)}
          </span>
          <button onClick={onDismiss} className="ml-2">
            <X size={12} style={{ color: 'var(--accent-amber)' }} />
          </button>
        </div>
      );
    case 'agent-error':
      return (
        <div
          data-testid="agent-error-alert"
          className="flex items-center gap-2 px-3 py-1 rounded"
          style={{ backgroundColor: '#f43f5e22' }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-rose)' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent-rose)' }}>
            {alert.agentId} {alert.message}
          </span>
          <button onClick={onDismiss} className="ml-2">
            <X size={12} style={{ color: 'var(--accent-rose)' }} />
          </button>
        </div>
      );
    case 'github-auth':
      return (
        <div
          data-testid="github-auth-alert"
          className="flex items-center gap-2 px-3 py-1 rounded"
          style={{ backgroundColor: '#f59e0b22' }}
        >
          <AlertTriangle size={14} style={{ color: 'var(--accent-amber)' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent-amber)' }}>
            GitHub session expired —