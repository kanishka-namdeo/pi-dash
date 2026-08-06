# Dashboard Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire real PTY session data into the dashboard and fix the navigation model so users can seamlessly move between fleet overview and focused agent terminals.

**Architecture:** Create a global `SessionContext` that tracks all active PTY sessions as a single source of truth. The Dashboard subscribes to this context for real-time session data. A toggle button in the topbar switches between Dashboard and Terminal views within the PiP layout. The fleet panel splits into Running (active sessions) and Available (detected agents) sections. The activity feed shows commands and lifecycle events parsed from PTY output.

**Tech Stack:** React 19, TypeScript, Electron IPC, node-pty, xterm.js, vitest, React Context API

## Global Constraints

- Package manager: **pnpm**
- Test runner: **vitest** with two projects: `main` (node) and `renderer` (jsdom)
- All renderer code lives under `renderer/src/`
- All main process code lives under `src/`
- Shared types live under `src/shared/types.ts`
- Follow existing patterns: React Context for global state, hooks for data fetching, IPC bridge via `window.api`
- No new dependencies unless absolutely necessary (prefer existing React patterns)
- All components must be accessible (keyboard navigation, ARIA labels, contrast)
- All new code must have unit tests

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `renderer/src/context/SessionContext.tsx` | Global session state tracker â€” registers/unregisters sessions, stores command history, provides queries |
| `renderer/src/hooks/useRealActivityFeed.ts` | Activity feed hook that subscribes to SessionContext for real events |
| `renderer/src/components/dashboard/RunningAgentCard.tsx` | Agent card for active sessions â€” shows live elapsed time, command count, status |
| `renderer/src/components/dashboard/AvailableAgentCard.tsx` | Agent card for detected but not started agents â€” shows path, launch/overlay actions |

### Modified Files

| File | Changes |
|------|---------|
| `renderer/src/App.tsx` | Wrap with `SessionProvider` |
| `renderer/src/hooks/useSession.ts` | Register/unregister with SessionContext, append commands |
| `renderer/src/context/PiPContext.tsx` | Add `viewMode` state and toggle action |
| `renderer/src/types/pip.ts` | Add `ViewMode` type |
| `renderer/src/components/pip/MainTerminal.tsx` | Respect `viewMode` toggle |
| `renderer/src/components/dashboard/Dashboard.tsx` | Use real data from SessionContext, two-section fleet panel, remove simulation |
| `renderer/src/components/dashboard/FleetPanel.tsx` | Split into Running and Available sections |
| `renderer/src/components/dashboard/ActivityFeed.tsx` | Render real events from `useRealActivityFeed` |
| `renderer/src/components/dashboard/Topbar.tsx` | Add view toggle button, feed pause/clear controls |
| `renderer/src/components/dashboard/MetricsFooter.tsx` | Use real data from SessionContext |

### Deprecated Files (delete after migration)

| File | Reason |
|------|--------|
| `renderer/src/hooks/useAgentSimulation.ts` | Replaced by real session data |
| `renderer/src/hooks/useActivityFeed.ts` | Replaced by `useRealActivityFeed` |
| `renderer/src/data/mockData.ts` | No longer needed (verify no other usages first) |

---

## Task 1: SessionContext Foundation

**Files:**
- Create: `renderer/src/context/SessionContext.tsx`
- Test: `renderer/src/context/SessionContext.test.tsx`

**Interfaces:**
- Produces: `SessionProvider` component, `useSessionContext()` hook
- Types: `SessionInfo`, `SessionContextType`

- [ ] **Step 1: Write the failing test for SessionContext basic operations**

```tsx
// renderer/src/context/SessionContext.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SessionProvider, useSessionContext } from './SessionContext';

function TestConsumer() {
  const ctx = useSessionContext();
  return (
    <div>
      <span data-testid="count">{ctx.getActiveSessions().length}</span>
      <button data-testid="register" onClick={() => ctx.registerSession('pi', 1234, '/home/user')}>
        Register
      </button>
    </div>
  );
}

describe('SessionContext', () => {
  it('starts with no sessions', () => {
    render(
      <SessionProvider>
        <TestConsumer />
      </SessionProvider>
    );
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('registers a session', () => {
    render(
      <SessionProvider>
        <TestConsumer />
      </SessionProvider>
    );
    act(() => {
      screen.getByTestId('register').click();
    });
    expect(screen.getByTestId('count').textContent).toBe('1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/context/SessionContext.test.tsx`
Expected: FAIL with "Cannot find module './SessionContext'"

- [ ] **Step 3: Create SessionContext with types and provider**

```tsx
// renderer/src/context/SessionContext.tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { CommandBlock } from '../types/session';

export type SessionInfo = {
  agentId: string;
  state: 'idle' | 'running' | 'exited';
  pid: number | null;
  cwd: string;
  createdAt: number;
  lastActiveAt: number;
  commandHistory: CommandBlock[];
};

export type SessionContextType = {
  sessions: Map<string, SessionInfo>;
  registerSession: (agentId: string, pid: number, cwd: string) => void;
  unregisterSession: (agentId: string) => void;
  updateSessionState: (agentId: string, state: 'running' | 'exited') => void;
  appendCommand: (agentId: string, command: CommandBlock) => void;
  getSession: (agentId: string) => SessionInfo | undefined;
  getActiveSessions: () => SessionInfo[];
};

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Map<string, SessionInfo>>(new Map());

  const registerSession = useCallback((agentId: string, pid: number, cwd: string) => {
    setSessions(prev => {
      const next = new Map(prev);
      next.set(agentId, {
        agentId,
        state: 'running',
        pid,
        cwd,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        commandHistory: [],
      });
      return next;
    });
  }, []);

  const unregisterSession = useCallback((agentId: string) => {
    setSessions(prev => {
      const next = new Map(prev);
      next.delete(agentId);
      return next;
    });
  }, []);

  const updateSessionState = useCallback((agentId: string, state: 'running' | 'exited') => {
    setSessions(prev => {
      const next = new Map(prev);
      const session = next.get(agentId);
      if (session) {
        next.set(agentId, { ...session, state, lastActiveAt: Date.now() });
      }
      return next;
    });
  }, []);

  const appendCommand = useCallback((agentId: string, command: CommandBlock) => {
    setSessions(prev => {
      const next = new Map(prev);
      const session = next.get(agentId);
      if (session) {
        next.set(agentId, {
          ...session,
          commandHistory: [...session.commandHistory, command],
          lastActiveAt: Date.now(),
        });
      }
      return next;
    });
  }, []);

  const getSession = useCallback(
    (agentId: string) => sessions.get(agentId),
    [sessions]
  );

  const getActiveSessions = useCallback(
    () => Array.from(sessions.values()).filter(s => s.state === 'running'),
    [sessions]
  );

  const value: SessionContextType = {
    sessions,
    registerSession,
    unregisterSession,
    updateSessionState,
    appendCommand,
    getSession,
    getActiveSessions,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): SessionContextType {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return context;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/context/SessionContext.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/context/SessionContext.tsx renderer/src/context/SessionContext.test.tsx
git commit -m "feat: create SessionContext for global PTY session tracking"
```

---

## Task 2: Integrate useSession with SessionContext

**Files:**
- Modify: `renderer/src/hooks/useSession.ts`
- Test: `renderer/src/hooks/useSession.test.ts` (update existing or create)

**Interfaces:**
- Consumes: `useSessionContext()` from `SessionContext`
- Produces: Updated `useSession` hook that registers/unregisters with context

- [ ] **Step 1: Write the failing test for useSession integration**

```ts
// renderer/src/hooks/useSession.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSession } from './useSession';
import { SessionProvider } from '../context/SessionContext';

// Mock window.api
beforeEach(() => {
  vi.stubGlobal('window', {
    api: {
      session: {
        create: vi.fn().mockResolvedValue({ pid: 1234, state: 'running' }),
        write: vi.fn(),
        resize: vi.fn(),
        destroy: vi.fn(),
        onData: vi.fn().mockReturnValue(() => {}),
        onExit: vi.fn().mockReturnValue(() => {}),
      },
    },
  });
});

describe('useSession with SessionContext', () => {
  it('registers session with context after spawn', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionProvider>{children}</SessionProvider>
    );
    const { result } = renderHook(() => useSession('pi'), { wrapper });

    await act(async () => {
      await result.current.spawn('/home/user');
    });

    expect(result.current.state).toBe('running');
    expect(result.current.pid).toBe(1234);
    // Context should now have the session registered
    // (This test verifies the hook calls registerSession)
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/hooks/useSession.test.ts`
Expected: FAIL (hook doesn't integrate with context yet)

- [ ] **Step 3: Update useSession to integrate with SessionContext**

```ts
// renderer/src/hooks/useSession.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import type { SessionState } from '../../../src/shared/types';
import { useSessionContext } from '../context/SessionContext';

export function useSession(agentId: string): {
  state: SessionState;
  pid: number | null;
  spawn: (cwd: string) => Promise<void>;
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  destroy: () => void;
} {
  const [state, setState] = useState<SessionState>('idle');
  const [pid, setPid] = useState<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const sessionContext = useSessionContext();

  const spawn = useCallback(async (cwd: string) => {
    const result = await window.api.session.create(agentId, cwd);
    if ('error' in result) {
      throw new Error(result.error);
    }
    setState('running');
    setPid(result.pid);
    // Register with global context
    sessionContext.registerSession(agentId, result.pid, cwd);
  }, [agentId, sessionContext]);

  const write = useCallback((data: string) => {
    if (stateRef.current !== 'running') return;
    window.api.session.write(agentId, data);
  }, [agentId]);

  const resize = useCallback((cols: number, rows: number) => {
    if (stateRef.current !== 'running') return;
    window.api.session.resize(agentId, cols, rows);
  }, [agentId]);

  const destroy = useCallback(() => {
    window.api.session.destroy(agentId);
    setState('exited');
    setPid(null);
    // Unregister from global context
    sessionContext.unregisterSession(agentId);
  }, [agentId, sessionContext]);

  useEffect(() => {
    const unsubData = window.api.session.onData((evtAgentId, data) => {
      if (evtAgentId === agentId) {
        // Data events just flow through; TerminalView handles display
      }
    });

    const unsubExit = window.api.session.onExit((evtAgentId, exitCode) => {
      if (evtAgentId === agentId) {
        setState('exited');
        setPid(null);
        // Update context state
        sessionContext.updateSessionState(agentId, 'exited');
      }
    });

    return () => {
      unsubData();
      unsubExit();
    };
  }, [agentId, sessionContext]);

  return { state, pid, spawn, write, resize, destroy };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/hooks/useSession.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/hooks/useSession.ts renderer/src/hooks/useSession.test.ts
git commit -m "feat: integrate useSession with SessionContext for global tracking"
```

---

## Task 3: Wrap App with SessionProvider

**Files:**
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: `SessionProvider` from `SessionContext`

- [ ] **Step 1: Update App.tsx to wrap with SessionProvider**

```tsx
// renderer/src/App.tsx
import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/dashboard/Dashboard';
import { TerminalView } from './components/terminal/TerminalView';
import { AgentDetailView } from './components/views/AgentDetailView';
import { WorktreeView } from './components/views/WorktreeView';
import { CompletedWorkView } from './components/views/CompletedWorkView';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { PiPProvider } from './context/PiPContext';
import { SessionProvider } from './context/SessionContext';
import { PiPContainer } from './components/pip/PiPContainer';
import { MainTerminal } from './components/pip/MainTerminal';
import { OverlayManager } from './components/pip/OverlayManager';

function App() {
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (window.api) {
      window.api.getOnboardingStatus().then(setOnboardingCompleted);
    } else {
      setOnboardingCompleted(true);
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingCompleted(true);
  }, []);

  if (onboardingCompleted === null) {
    return null; // Loading
  }

  if (!onboardingCompleted) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <SessionProvider>
      <PiPProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <PiPContainer>
                  <MainTerminal />
                  <OverlayManager />
                </PiPContainer>
              }
            />
            <Route path="/agent/:agentId" element={<AgentDetailView />} />
            <Route path="/worktrees" element={<WorktreeView />} />
            <Route path="/completed/:agentId" element={<CompletedWorkView />} />
          </Routes>
        </BrowserRouter>
      </PiPProvider>
    </SessionProvider>
  );
}
export default App;
```

- [ ] **Step 2: Run full test suite to verify nothing broke**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add renderer/src/App.tsx
git commit -m "feat: wrap app with SessionProvider for global session tracking"
```

---

## Task 4: Add viewMode to PiPContext

**Files:**
- Modify: `renderer/src/types/pip.ts`
- Modify: `renderer/src/context/PiPContext.tsx`
- Modify: `renderer/src/hooks/usePiP.ts`
- Test: `renderer/src/hooks/usePiP.test.ts` (update)

**Interfaces:**
- Produces: `ViewMode` type, `viewMode` state in PiPContext

- [ ] **Step 1: Add ViewMode type to pip.ts**

```ts
// renderer/src/types/pip.ts (add at top)
export type ViewMode = 'dashboard' | 'terminal';
```

- [ ] **Step 2: Update usePiP hook to include viewMode**

```ts
// renderer/src/hooks/usePiP.ts (add to PiPState type)
export type PiPState = {
  mainAgentId: string | null;
  overlays: Overlay[];
  nextZIndex: number;
  viewMode: ViewMode;  // ADD THIS
};

// Initialize with 'dashboard'
const [state, setState] = useState<PiPState>({
  mainAgentId: null,
  overlays: [],
  nextZIndex: 10,
  viewMode: 'dashboard',  // ADD THIS
});

// Add toggleViewMode action
const toggleViewMode = useCallback(() => {
  setState(prev => ({
    ...prev,
    viewMode: prev.viewMode === 'dashboard' ? 'terminal' : 'dashboard',
  }));
}, []);

const setViewMode = useCallback((mode: ViewMode) => {
  setState(prev => ({ ...prev, viewMode: mode }));
}, []);

// Add to actions
const actions: PiPActions = {
  // ... existing actions
  toggleViewMode,  // ADD THIS
  setViewMode,     // ADD THIS
};
```

- [ ] **Step 3: Update PiPActions type**

```ts
// renderer/src/types/pip.ts (add to PiPActions)
export type PiPActions = {
  // ... existing actions
  toggleViewMode: () => void;
  setViewMode: (mode: ViewMode) => void;
};
```

- [ ] **Step 4: Update usePiP tests**

Add tests for `toggleViewMode` and `setViewMode` in `renderer/src/hooks/usePiP.test.ts`.

- [ ] **Step 5: Run tests**

Run: `pnpm test renderer/src/hooks/usePiP.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add renderer/src/types/pip.ts renderer/src/hooks/usePiP.ts renderer/src/hooks/usePiP.test.ts
git commit -m "feat: add viewMode state to PiPContext for dashboard/terminal toggle"
```

---

## Task 5: Update MainTerminal to Respect viewMode

**Files:**
- Modify: `renderer/src/components/pip/MainTerminal.tsx`

**Interfaces:**
- Consumes: `viewMode` from PiPContext

- [ ] **Step 1: Update MainTerminal to check viewMode**

```tsx
// renderer/src/components/pip/MainTerminal.tsx
import { usePiPContext } from '../../context/PiPContext';
import { TerminalView } from '../terminal/TerminalView';
import { Dashboard } from '../dashboard/Dashboard';

export function MainTerminal() {
  const { state } = usePiPContext();

  // If no main agent, always show dashboard
  if (!state.mainAgentId) {
    return <Dashboard />;
  }

  // If main agent is set, respect viewMode toggle
  if (state.viewMode === 'dashboard') {
    return <Dashboard />;
  }

  return (
    <div className="w-full h-full">
      <TerminalView agentId={state.mainAgentId} />
    </div>
  );
}
```

- [ ] **Step 2: Run dev server and manually test**

Run: `pnpm dev`
Test: Toggle between dashboard and terminal views when an agent is focused.
Expected: Toggle works, dashboard shows when viewMode is 'dashboard', terminal when 'terminal'.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/pip/MainTerminal.tsx
git commit -m "feat: MainTerminal respects viewMode toggle between dashboard and terminal"
```

---

## Task 6: Update Topbar with Toggle and Feed Controls

**Files:**
- Modify: `renderer/src/components/dashboard/Topbar.tsx`

**Interfaces:**
- Consumes: `viewMode`, `toggleViewMode` from PiPContext
- Produces: Toggle button, feed pause/clear controls

- [ ] **Step 1: Update Topbar props and add toggle button**

```tsx
// renderer/src/components/dashboard/Topbar.tsx
import { useNavigate } from 'react-router-dom';
import { Pause, Play, Square, Plus, GitBranch, LayoutDashboard, Monitor } from 'lucide-react';
import type { Mode } from '@/types/dashboard';
import type { ViewMode } from '@/types/pip';

type TopbarProps = {
  mode: Mode;
  viewMode: ViewMode;
  isFeedPaused: boolean;
  hasMainAgent: boolean;
  onModeChange: (mode: Mode) => void;
  onToggleViewMode: () => void;
  onToggleFeedPause: () => void;
  onClearFeed: () => void;
};

export function Topbar({
  mode,
  viewMode,
  isFeedPaused,
  hasMainAgent,
  onModeChange,
  onToggleViewMode,
  onToggleFeedPause,
  onClearFeed,
}: TopbarProps) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] bg-[#0a0a0a]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-base font-semibold text-[#e5e5e5]">Pi Orchestrator</span>
        </div>
        <span className="font-mono text-sm font-medium text-[#a3a3a3]">pi-dash</span>
      </div>

      {/* View Toggle */}
      <nav aria-label="View mode" className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
        <button
          onClick={onToggleViewMode}
          disabled={!hasMainAgent}
          className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors ${
            viewMode === 'dashboard'
              ? 'bg-[#2a2a2a] text-[#e5e5e5]'
              : 'text-[#737373] hover:text-[#a3a3a3]'
          } ${!hasMainAgent ? 'opacity-40 cursor-not-allowed' : ''}`}
          title="Dashboard view"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Dashboard
        </button>
        <button
          onClick={onToggleViewMode}
          disabled={!hasMainAgent}
          className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors ${
            viewMode === 'terminal'
              ? 'bg-[#2a2a2a] text-[#e5e5e5]'
              : 'text-[#737373] hover:text-[#a3a3a3]'
          } ${!hasMainAgent ? 'opacity-40 cursor-not-allowed' : ''}`}
          title="Terminal view"
        >
          <Monitor className="w-3.5 h-3.5" />
          Terminal
        </button>
      </nav>

      <button
        onClick={() => navigate('/worktrees')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#737373] hover:text-[#e5e5e5] rounded-lg hover:bg-[#1a1a1a] transition-colors"
      >
        <GitBranch className="w-3.5 h-3.5" />
        Worktrees
      </button>

      <nav aria-label="Dashboard mode" className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
        {(['auto', 'supervised', 'manual'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              mode === m
                ? 'bg-[#2a2a2a] text-[#e5e5e5]'
                : 'text-[#737373] hover:text-[#a3a3a3]'
            }`}
          >
            {m}
          </button>
        ))}
      </nav>

      <nav aria-label="Dashboard actions" className="flex items-center gap-2">
        <button
          onClick={onToggleFeedPause}
          className="p-2 rounded-lg bg-[#1a1a1a] text-[#a3a3a3] hover:bg-[#2a2a2a] transition-colors"
          title={isFeedPaused ? 'Resume feed' : 'Pause feed'}
        >
          {isFeedPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
        <button
          onClick={onClearFeed}

          className="p-2 rounded-lg bg-[#1a1a1a] text-red-500 hover:bg-[#2a2a2a] transition-colors"
          title="Clear feed"
        >
          <Square className="w-4 h-4" />
        </button>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/dashboard/Topbar.tsx
git commit -m "feat: add view toggle and feed controls to Topbar"
```

---

## Task 7: Create RunningAgentCard and AvailableAgentCard

**Files:**
- Create: `renderer/src/components/dashboard/RunningAgentCard.tsx`
- Create: `renderer/src/components/dashboard/AvailableAgentCard.tsx`

**Interfaces:**
- Consumes: `SessionInfo` from SessionContext, `AgentConfig` from shared types
- Produces: Two card components for FleetPanel

- [ ] **Step 1: Create RunningAgentCard**

Shows live elapsed time (updating every second), command count, status indicator (blue=running, red=exited), Focus and PiP buttons. Uses `SessionInfo` from SessionContext. Elapsed time computed from `session.createdAt`.

- [ ] **Step 2: Create AvailableAgentCard**

Shows detected agent name, truncated path, Launch and PiP buttons. Uses `AgentConfig` from shared types. Slightly muted styling (opacity 0.7) to de-emphasize.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/RunningAgentCard.tsx renderer/src/components/dashboard/AvailableAgentCard.tsx
git commit -m "feat: create RunningAgentCard and AvailableAgentCard components"
```

---

## Task 8: Restructure FleetPanel with Two Sections

**Files:**
- Modify: `renderer/src/components/dashboard/FleetPanel.tsx`

**Interfaces:**
- Consumes: `SessionInfo[]` (running), `AgentConfig[]` (available), card components from Task 7
- Produces: Two-section FleetPanel with Running and Available sections

- [ ] **Step 1: Rewrite FleetPanel**

Replace current single-list FleetPanel with two sections:
1. **Running** section: renders `RunningAgentCard` for each active session from SessionContext
2. **Available** section: renders `AvailableAgentCard` for each detected agent from `useAgents()`

Props change from `agents: Agent[]` to `runningSessions: SessionInfo[]` and `availableAgents: AgentConfig[]`.

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/dashboard/FleetPanel.tsx
git commit -m "feat: restructure FleetPanel with Running and Available sections"
```

---

## Task 9: Create useRealActivityFeed Hook

**Files:**
- Create: `renderer/src/hooks/useRealActivityFeed.ts`
- Test: `renderer/src/hooks/useRealActivityFeed.test.ts`

**Interfaces:**
- Consumes: `useSessionContext()` from SessionContext
- Produces: `{ events: FeedEvent[], isPaused: boolean, pause, resume, clear }`

- [ ] **Step 1: Create useRealActivityFeed hook**

Hook subscribes to SessionContext changes and generates FeedEvents:
- `session:started` â€” when a new session appears in context
- `session:exited` â€” when a session disappears from context
- `command` â€” when commandHistory grows for a session

Events stored in buffer (max 100). Pause stops rendering but continues capturing. Resume flushes pending events. Clear empties buffer.

- [ ] **Step 2: Write tests**

Test: starts empty, pause/resume works, clear works, events generated on session changes.

- [ ] **Step 3: Run tests and commit**

```bash
pnpm test renderer/src/hooks/useRealActivityFeed.test.ts
git add renderer/src/hooks/useRealActivityFeed.ts renderer/src/hooks/useRealActivityFeed.test.ts
git commit -m "feat: create useRealActivityFeed hook for real session events"
```

---

## Task 10: Update ActivityFeed Component

**Files:**
- Modify: `renderer/src/components/dashboard/ActivityFeed.tsx`

**Interfaces:**
- Consumes: `FeedEvent[]` and `isPaused` from `useRealActivityFeed`
- Produces: Updated ActivityFeed that renders real events

- [ ] **Step 1: Rewrite ActivityFeed for real events**

Replace simulated activity rendering with real event rendering:
- Lifecycle events (started/exited) with colored badges
- Command events with command text and output preview (first 3 lines)
- Paused state shows "PAUSED" badge and dims content
- Timestamps formatted as HH:MM:SS

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/dashboard/ActivityFeed.tsx
git commit -m "feat: update ActivityFeed to render real session events"
```

---

## Task 11: Update MetricsFooter for Real Data

**Files:**
- Modify: `renderer/src/components/dashboard/MetricsFooter.tsx`

**Interfaces:**
- Consumes: `elapsed`, `activeAgents`, `totalCommands` (computed from SessionContext)
- Produces: Updated MetricsFooter with real data

- [ ] **Step 1: Update MetricsFooter**

Remove `progress` and `tokens` props. Add `totalCommands` prop. Show:
- Elapsed time (aggregate across all active sessions)
- Active agents count
- Total commands executed

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/dashboard/MetricsFooter.tsx
git commit -m "feat: update MetricsFooter to show real session data"
```

---

## Task 12: Rewire Dashboard to Use Real Data

**Files:**
- Modify: `renderer/src/components/dashboard/Dashboard.tsx`

**Interfaces:**
- Consumes: `useSessionContext()`, `useRealActivityFeed()`, `useAgents()`, PiPContext
- Produces: Dashboard fully wired to real session data

- [ ] **Step 1: Rewrite Dashboard**

Remove `useAgentSimulation`, `useActivityFeed` (old), `useElapsedTimer`. Replace with:
- `useSessionContext()` for running sessions
- `useAgents()` for available agents
- `useRealActivityFeed()` for activity events
- Compute elapsed time from earliest active session
- Pass `viewMode`, `toggleViewMode`, feed controls to Topbar
- Pass running sessions and available agents to FleetPanel
- Pass events and pause state to ActivityFeed
- Pass computed metrics to MetricsFooter

- [ ] **Step 2: Run dev server and manually test full flow**

Run: `pnpm dev`
Test:
1. Dashboard shows Available agents from scanner
2. Launch an agent â†’ it appears in Running section with live data
3. Focus agent â†’ terminal view shows, toggle works
4. Activity feed shows session started event
5. Type commands â†’ they appear in feed
6. Pause/resume feed works
7. Metrics show real data

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/Dashboard.tsx
git commit -m "feat: rewire Dashboard to use real session data from SessionContext"
```

---

## Task 13: Remove Deprecated Hooks

**Files:**
- Delete: `renderer/src/hooks/useAgentSimulation.ts`
- Delete: `renderer/src/hooks/useActivityFeed.ts`
- Delete: `renderer/src/data/mockData.ts` (verify no other usages first)
- Modify: any files that import these (should be none after Task 12)

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "useAgentSimulation" renderer/src/
grep -r "useActivityFeed" renderer/src/
grep -r "mockData" renderer/src/
```

Expected: No results (all usages removed in Task 12).

- [ ] **Step 2: Delete deprecated files**

```bash
git rm renderer/src/hooks/useAgentSimulation.ts
git rm renderer/src/hooks/useActivityFeed.ts
git rm renderer/src/data/mockData.ts
```

- [ ] **Step 3: Run full test suite**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove deprecated simulation hooks and mock data"
```

---

## Task 14: Edge Cases and Polish

**Files:**
- Modify: Various files for edge case handling

- [ ] **Step 1: Handle stale mainAgentId on restart**

In `App.tsx` or `MainTerminal.tsx`, check if `mainAgentId` session is still alive on mount. If dead, clear `mainAgentId` and fall back to Dashboard.

- [ ] **Step 2: Prevent duplicate sessions**

In `useSession` or Dashboard launch handlers, check if session already exists before spawning. If exists, just focus it.

- [ ] **Step 3: Handle session crash**

When `session:onExit` fires unexpectedly, ensure agent moves from Running to Available in FleetPanel. If it was the main agent, clear `mainAgentId`.

- [ ] **Step 4: Add error toasts**

Use `sonner` (already installed) to show error toasts when:
- Session creation fails
- Agent binary not found
- Session crashes unexpectedly

- [ ] **Step 5: Run full test suite and manual testing**

```bash
pnpm test
pnpm dev
```

Manual test checklist:
- [ ] Launch 3+ agents simultaneously
- [ ] Verify all appear in Running section with live data
- [ ] Toggle between Dashboard and Terminal views
- [ ] Open/close overlays, promote to main
- [ ] Pause/resume activity feed
- [ ] Kill sessions, verify they move to Available
- [ ] Restart app, verify state persistence
- [ ] Test with 10+ overlays for performance
- [ ] Verify keyboard navigation works

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: handle edge cases and polish dashboard integration"
```

---

## Acceptance Criteria

- [ ] Dashboard shows real PTY session data, not simulated data
- [ ] Fleet panel has two sections: Running (active sessions) and Available (detected agents)
- [ ] Running section shows live elapsed time, command count, status
- [ ] Users can focus an agent as main terminal from the dashboard
- [ ] Toggle button switches between Dashboard and Terminal views
- [ ] Activity feed shows commands and lifecycle events from all active sessions
- [ ] Feed pause/resume only affects display, not sessions
- [ ] Feed clear button empties the buffer
- [ ] Topbar controls work as specified
- [ ] Metrics footer shows real data (active agents, elapsed time, commands)
- [ ] Session state persists across navigation (PiP layout stays intact)
- [ ] Edge cases handled (stale sessions, crashes, duplicates, errors)
- [ ] All unit and integration tests pass
