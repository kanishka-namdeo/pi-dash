# Agent Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-fidelity, responsive agent orchestration dashboard with full simulation (live activity feed, progress ticking, pause/stop controls, agent detail panel).

**Architecture:** Feature-based with custom hooks. All simulation logic lives in hooks (`useAgentSimulation`, `useActivityFeed`, `useDashboardMode`, `useElapsedTimer`). Components are pure render functions receiving data via props. Dashboard.tsx orchestrates everything.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui, lucide-react

## Global Constraints

- Dark theme: `#0a0a0a` background, `#1a1a1a` cards, `#2a2a2a` borders
- Fonts: Geist (UI), JetBrains Mono (numbers/code)
- Responsive breakpoints: Desktop (1280px+), Tablet (768-1279px), Mobile (<768px)
- All animations use CSS transitions (no animation libraries)
- Hooks own all state and simulation logic; components are pure render
- Use existing shadcn/ui components where possible (Button, Card)
- Use lucide-react for icons

---

## File Structure

```
renderer/src/
├── types/
│   └── dashboard.ts                    ← Agent, Activity, PlanStep, Mode types
├── data/
│   └── mockData.ts                     ← Seed agents, activities, plan steps
├── hooks/
│   ├── useAgentSimulation.ts           ← Agent states, progress ticking, pause/stop
│   ├── useActivityFeed.ts              ← Activity generation, auto-append
│   ├── useDashboardMode.ts             ← Mode state management
│   └── useElapsedTimer.ts              ← Elapsed time counter
├── components/
│   └── dashboard/
│       ├── Dashboard.tsx               ← Main orchestrator
│       ├── Topbar.tsx                  ← Logo, mode selector, controls
│       ├── FleetPanel.tsx              ← Agent cards list
│       ├── AgentCard.tsx               ← Individual agent card
│       ├── PlanPanel.tsx               ← Active plan with steps
│       ├── ActivityFeed.tsx            ← Live activity stream
│       ├── MetricsFooter.tsx           ← Bottom stats bar
│       └── AgentDetailPanel.tsx        ← Slide-in panel
└── App.tsx                             ← Mount Dashboard component
```

---

### Task 1: Define TypeScript Types

**Files:**
- Create: `renderer/src/types/dashboard.ts`

**Interfaces:**
- Produces: `Agent`, `Activity`, `PlanStep`, `Mode` types used by all hooks and components

- [ ] **Step 1: Create types file with all data structures**

```typescript
// renderer/src/types/dashboard.ts

export type AgentStatus = 'active' | 'idle' | 'paused';

export type Agent = {
  id: string;
  name: string;
  short: string;
  color: string;
  textColor: string;
  status: AgentStatus;
  task: string;
  progress: number;
  files?: string[];
  messages?: { time: string; text: string }[];
};

export type ActivityAction = 'read' | 'write' | 'edit' | 'test' | 'lint' | 'plan';

export type Activity = {
  id: string;
  time: string;
  agentId: string;
  action: ActivityAction;
  description: string;
  file?: string;
};

export type Mode = 'auto' | 'supervised' | 'manual';

export type PlanStepStatus = 'done' | 'active' | 'pending';

export type PlanStep = {
  id: string;
  number: number;
  name: string;
  agentId: string;
  status: PlanStepStatus;
  duration: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/types/dashboard.ts
git commit -m "feat: add dashboard TypeScript types"
```

---

### Task 2: Create Mock Data

**Files:**
- Create: `renderer/src/data/mockData.ts`

**Interfaces:**
- Consumes: `Agent`, `Activity`, `PlanStep` types from `types/dashboard.ts`
- Produces: `seedAgents`, `seedActivities`, `seedPlanSteps` arrays

- [ ] **Step 1: Create mock data file with seed data**

```typescript
// renderer/src/data/mockData.ts

import type { Agent, Activity, PlanStep } from '@/types/dashboard';

export const seedAgents: Agent[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    short: 'C',
    color: '#1e3a5f',
    textColor: '#60a5fa',
    status: 'active',
    task: 'Implementing auth middleware',
    progress: 72,
    files: ['src/auth/jwt.ts', 'src/models/user.ts'],
    messages: [
      { time: '14:02', text: 'Found existing session pattern' },
      { time: '14:01', text: 'Starting JWT structure analysis' },
    ],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    short: 'Cu',
    color: '#14532d',
    textColor: '#34d399',
    status: 'active',
    task: 'Writing API routes',
    progress: 58,
    files: ['src/routes/auth.ts'],
    messages: [
      { time: '14:02', text: 'Created POST /api/auth/login' },
    ],
  },
  {
    id: 'copilot',
    name: 'Copilot',
    short: 'Co',
    color: '#312e81',
    textColor: '#a78bfa',
    status: 'active',
    task: 'Generating test fixtures',
    progress: 45,
    files: ['tests/fixtures/'],
    messages: [
      { time: '14:01', text: 'Generated 12 test fixtures' },
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    short: 'Cx',
    color: '#78350f',
    textColor: '#fbbf24',
    status: 'idle',
    task: 'Waiting for step 2',
    progress: 0,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    short: 'G',
    color: '#4c1d95',
    textColor: '#c4b5fd',
    status: 'idle',
    task: 'Available',
    progress: 0,
  },
  {
    id: 'qwen',
    name: 'Qwen',
    short: 'Q',
    color: '#3f3f46',
    textColor: '#d4d4d8',
    status: 'idle',
    task: 'Available',
    progress: 0,
  },
];

export const seedActivities: Activity[] = [
  { id: '1', time: '14:02', agentId: 'claude', action: 'read', description: 'Parsing JWT token structure', file: 'src/auth/jwt.ts' },
  { id: '2', time: '14:02', agentId: 'cursor', action: 'write', description: 'Created POST /api/auth/login', file: 'src/routes/auth.ts' },
  { id: '3', time: '14:01', agentId: 'copilot', action: 'test', description: 'Generated 12 test fixtures', file: 'tests/fixtures/' },
  { id: '4', time: '14:01', agentId: 'claude', action: 'edit', description: 'Added session validation', file: 'src/auth/session.ts' },
  { id: '5', time: '14:00', agentId: 'cursor', action: 'read', description: 'Analyzing user model schema', file: 'src/models/user.ts' },
  { id: '6', time: '13:59', agentId: 'copilot', action: 'lint', description: 'Fixed 3 linting errors', file: 'src/utils/' },
  { id: '7', time: '13:58', agentId: 'claude', action: 'plan', description: 'Breaking down auth flow', file: '' },
  { id: '8', time: '13:57', agentId: 'cursor', action: 'write', description: 'Created auth middleware', file: 'src/middleware/auth.ts' },
  { id: '9', time: '13:56', agentId: 'copilot', action: 'edit', description: 'Updated error messages', file: 'src/utils/errors.ts' },
  { id: '10', time: '13:55', agentId: 'claude', action: 'read', description: 'Reviewing existing patterns', file: 'src/' },
];

export const seedPlanSteps: PlanStep[] = [
  { id: '1', number: 1, name: 'Research existing auth patterns', agentId: 'claude', status: 'done', duration: '~2 min' },
  { id: '2', number: 2, name: 'Implement JWT middleware', agentId: 'cursor', status: 'active', duration: '~4 min' },
  { id: '3', number: 3, name: 'Build login/logout endpoints', agentId: 'copilot', status: 'pending', duration: '~4 min' },
  { id: '4', number: 4, name: 'Review and test', agentId: 'claude', status: 'pending', duration: '~2 min' },
];

export const activityTemplates = [
  { action: 'read' as const, descriptions: ['Parsing request headers', 'Analyzing dependencies', 'Reviewing type definitions'] },
  { action: 'write' as const, descriptions: ['Created new handler', 'Added validation logic', 'Implemented error handling'] },
  { action: 'edit' as const, descriptions: ['Updated configuration', 'Modified interface', 'Refactored utility function'] },
  { action: 'test' as const, descriptions: ['Running test suite', 'Generated test cases', 'Validating edge cases'] },
  { action: 'lint' as const, descriptions: ['Fixed linting errors', 'Formatted code', 'Resolved import order'] },
  { action: 'plan' as const, descriptions: ['Planning next steps', 'Breaking down task', 'Analyzing requirements'] },
];
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/data/mockData.ts
git commit -m "feat: add mock data for dashboard"
```

---

### Task 3: Implement useDashboardMode Hook

**Files:**
- Create: `renderer/src/hooks/useDashboardMode.ts`
- Test: `renderer/src/hooks/useDashboardMode.test.ts`

**Interfaces:**
- Consumes: `Mode` type from `types/dashboard.ts`
- Produces: `{ mode: Mode, setMode: (mode: Mode) => void }`

- [ ] **Step 1: Write failing test for mode hook**

```typescript
// renderer/src/hooks/useDashboardMode.test.ts

import { renderHook, act } from '@testing-library/react';
import { useDashboardMode } from './useDashboardMode';

describe('useDashboardMode', () => {
  it('should initialize with supervised mode', () => {
    const { result } = renderHook(() => useDashboardMode());
    expect(result.current.mode).toBe('supervised');
  });

  it('should change mode when setMode is called', () => {
    const { result } = renderHook(() => useDashboardMode());
    act(() => {
      result.current.setMode('auto');
    });
    expect(result.current.mode).toBe('auto');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test renderer/src/hooks/useDashboardMode.test.ts`
Expected: FAIL with "Cannot find module './useDashboardMode'"

- [ ] **Step 3: Implement useDashboardMode hook**

```typescript
// renderer/src/hooks/useDashboardMode.ts

import { useState } from 'react';
import type { Mode } from '@/types/dashboard';

export function useDashboardMode(initialMode: Mode = 'supervised') {
  const [mode, setMode] = useState<Mode>(initialMode);

  return { mode, setMode };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test renderer/src/hooks/useDashboardMode.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/hooks/useDashboardMode.ts renderer/src/hooks/useDashboardMode.test.ts
git commit -m "feat: implement useDashboardMode hook"
```

---

### Task 4: Implement useElapsedTimer Hook

**Files:**
- Create: `renderer/src/hooks/useElapsedTimer.ts`
- Test: `renderer/src/hooks/useElapsedTimer.test.ts`

**Interfaces:**
- Produces: `{ elapsed: number, start: () => void, stop: () => void, reset: () => void }`

- [ ] **Step 1: Write failing test for elapsed timer hook**

```typescript
// renderer/src/hooks/useElapsedTimer.test.ts

import { renderHook, act } from '@testing-library/react';
import { useElapsedTimer } from './useElapsedTimer';

describe('useElapsedTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with 0 elapsed time', () => {
    const { result } = renderHook(() => useElapsedTimer());
    expect(result.current.elapsed).toBe(0);
  });

  it('should increment elapsed time when started', () => {
    const { result } = renderHook(() => useElapsedTimer());
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.elapsed).toBe(3);
  });

  it('should stop incrementing when stopped', () => {
    const { result } = renderHook(() => useElapsedTimer());
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      result.current.stop();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.elapsed).toBe(2);
  });

  it('should reset to 0 when reset is called', () => {
    const { result } = renderHook(() => useElapsedTimer());
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.elapsed).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test renderer/src/hooks/useElapsedTimer.test.ts`
Expected: FAIL with "Cannot find module './useElapsedTimer'"

- [ ] **Step 3: Implement useElapsedTimer hook**

```typescript
// renderer/src/hooks/useElapsedTimer.ts

import { useState, useEffect, useRef } from 'react';

export function useElapsedTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const start = () => setIsRunning(true);
  const stop = () => setIsRunning(false);
  const reset = () => {
    setIsRunning(false);
    setElapsed(0);
  };

  return { elapsed, start, stop, reset };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test renderer/src/hooks/useElapsedTimer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/hooks/useElapsedTimer.ts renderer/src/hooks/useElapsedTimer.test.ts
git commit -m "feat: implement useElapsedTimer hook"
```

---

### Task 5: Implement useAgentSimulation Hook

**Files:**
- Create: `renderer/src/hooks/useAgentSimulation.ts`
- Test: `renderer/src/hooks/useAgentSimulation.test.ts`

**Interfaces:**
- Consumes: `Agent` type from `types/dashboard.ts`, `seedAgents` from `data/mockData.ts`
- Produces: `{ agents: Agent[], pause: () => void, resume: () => void, stop: () => void, reset: () => void }`

- [ ] **Step 1: Write failing test for agent simulation hook**

```typescript
// renderer/src/hooks/useAgentSimulation.test.ts

import { renderHook, act } from '@testing-library/react';
import { useAgentSimulation } from './useAgentSimulation';

describe('useAgentSimulation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with seed agents', () => {
    const { result } = renderHook(() => useAgentSimulation());
    expect(result.current.agents).toHaveLength(6);
    expect(result.current.agents[0].status).toBe('active');
  });

  it('should tick progress for active agents', () => {
    const { result } = renderHook(() => useAgentSimulation());
    const initialProgress = result.current.agents[0].progress;
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.agents[0].progress).toBeGreaterThanOrEqual(initialProgress);
  });

  it('should pause progress updates', () => {
    const { result } = renderHook(() => useAgentSimulation());
    act(() => {
      result.current.pause();
    });
    const progressAfterPause = result.current.agents[0].progress;
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.agents[0].progress).toBe(progressAfterPause);
  });

  it('should resume progress updates', () => {
    const { result } = renderHook(() => useAgentSimulation());
    act(() => {
      result.current.pause();
    });
    act(() => {
      result.current.resume();
    });
    const progressBefore = result.current.agents[0].progress;
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.agents[0].progress).toBeGreaterThanOrEqual(progressBefore);
  });

  it('should reset to initial state', () => {
    const { result } = renderHook(() => useAgentSimulation());
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.agents[0].progress).toBe(72);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test renderer/src/hooks/useAgentSimulation.test.ts`
Expected: FAIL with "Cannot find module './useAgentSimulation'"

- [ ] **Step 3: Implement useAgentSimulation hook**

```typescript
// renderer/src/hooks/useAgentSimulation.ts

import { useState, useEffect, useRef } from 'react';
import type { Agent } from '@/types/dashboard';
import { seedAgents } from '@/data/mockData';

export function useAgentSimulation() {
  const [agents, setAgents] = useState<Agent[]>(seedAgents);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = window.setInterval(() => {
        setAgents((prev) =>
          prev.map((agent) => {
            if (agent.status === 'active' && agent.progress < 100) {
              const increment = Math.floor(Math.random() * 5) + 1;
              const newProgress = Math.min(100, agent.progress + increment);
              return {
                ...agent,
                progress: newProgress,
                status: newProgress >= 100 ? 'idle' : 'active',
              };
            }
            return agent;
          })
        );
      }, 2000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused]);

  const pause = () => setIsPaused(true);
  const resume = () => setIsPaused(false);
  const stop = () => {
    setIsPaused(false);
    setAgents(seedAgents);
  };
  const reset = () => {
    setIsPaused(false);
    setAgents(seedAgents);
  };

  return { agents, pause, resume, stop, reset };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test renderer/src/hooks/useAgentSimulation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/hooks/useAgentSimulation.ts renderer/src/hooks/useAgentSimulation.test.ts
git commit -m "feat: implement useAgentSimulation hook"
```

---

### Task 6: Implement useActivityFeed Hook

**Files:**
- Create: `renderer/src/hooks/useActivityFeed.ts`
- Test: `renderer/src/hooks/useActivityFeed.test.ts`

**Interfaces:**
- Consumes: `Activity`, `Agent` types from `types/dashboard.ts`, `seedActivities`, `activityTemplates` from `data/mockData.ts`
- Produces: `{ activities: Activity[] }`

- [ ] **Step 1: Write failing test for activity feed hook**

```typescript
// renderer/src/hooks/useActivityFeed.test.ts

import { renderHook, act } from '@testing-library/react';
import { useActivityFeed } from './useActivityFeed';
import { seedAgents } from '@/data/mockData';

describe('useActivityFeed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with seed activities', () => {
    const { result } = renderHook(() => useActivityFeed(seedAgents, false));
    expect(result.current.activities).toHaveLength(10);
  });

  it('should generate new activities from active agents', () => {
    const { result } = renderHook(() => useActivityFeed(seedAgents, false));
    const initialCount = result.current.activities.length;
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.activities.length).toBeGreaterThanOrEqual(initialCount);
  });

  it('should not generate activities when paused', () => {
    const { result } = renderHook(() => useActivityFeed(seedAgents, true));
    const initialCount = result.current.activities.length;
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(result.current.activities.length).toBe(initialCount);
  });

  it('should keep only last 30 activities', () => {
    const { result } = renderHook(() => useActivityFeed(seedAgents, false));
    act(() => {
      vi.advanceTimersByTime(100000);
    });
    expect(result.current.activities.length).toBeLessThanOrEqual(30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test renderer/src/hooks/useActivityFeed.test.ts`
Expected: FAIL with "Cannot find module './useActivityFeed'"

- [ ] **Step 3: Implement useActivityFeed hook**

```typescript
// renderer/src/hooks/useActivityFeed.ts

import { useState, useEffect, useRef } from 'react';
import type { Activity, Agent } from '@/types/dashboard';
import { seedActivities, activityTemplates } from '@/data/mockData';

export function useActivityFeed(agents: Agent[], isPaused: boolean) {
  const [activities, setActivities] = useState<Activity[]>(seedActivities);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = window.setInterval(() => {
        const activeAgents = agents.filter((a) => a.status === 'active');
        if (activeAgents.length === 0) return;

        const agent = activeAgents[Math.floor(Math.random() * activeAgents.length)];
        const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
        const description = template.descriptions[Math.floor(Math.random() * template.descriptions.length)];

        const now = new Date();
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const newActivity: Activity = {
          id: Date.now().toString(),
          time,
          agentId: agent.id,
          action: template.action,
          description,
          file: Math.random() > 0.3 ? 'src/example.ts' : '',
        };

        setActivities((prev) => [newActivity, ...prev].slice(0, 30));
      }, 3000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [agents, isPaused]);

  return { activities };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test renderer/src/hooks/useActivityFeed.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/hooks/useActivityFeed.ts renderer/src/hooks/useActivityFeed.test.ts
git commit -m "feat: implement useActivityFeed hook"
```

---

### Task 7: Build Topbar Component

**Files:**
- Create: `renderer/src/components/dashboard/Topbar.tsx`

**Interfaces:**
- Consumes: `Mode` type from `types/dashboard.ts`
- Props: `{ mode: Mode, isPaused: boolean, onModeChange: (mode: Mode) => void, onPause: () => void, onStop: () => void }`

- [ ] **Step 1: Create Topbar component with mode selector and controls**

```tsx
// renderer/src/components/dashboard/Topbar.tsx

import { Pause, Square, Plus } from 'lucide-react';
import type { Mode } from '@/types/dashboard';

type TopbarProps = {
  mode: Mode;
  isPaused: boolean;
  onModeChange: (mode: Mode) => void;
  onPause: () => void;
  onStop: () => void;
};

export function Topbar({ mode, isPaused, onModeChange, onPause, onStop }: TopbarProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] bg-[#0a0a0a]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[#e5e5e5] font-medium">Pi Orchestrator</span>
        </div>
        <span className="font-mono text-sm text-[#a3a3a3]">pi-dash</span>
      </div>

      <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
        {(['auto', 'supervised', 'manual'] as Mode
) => (
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
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPause}
          className="p-2 rounded-lg bg-[#1a1a1a] text-[#a3a3a3] hover:bg-[#2a2a2a] transition-colors"
          title={isPaused ? 'Resume' : 'Pause'}
        >
          <Pause className="w-4 h-4" />
        </button>
        <button
          onClick={onStop}
          className="p-2 rounded-lg bg-[#1a1a1a] text-red-500 hover:bg-[#2a2a2a] transition-colors"
          title="Stop"
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          className="p-2 rounded-lg bg-[#1a1a1a] text-[#a3a3a3] hover:bg-[#2a2a2a] transition-colors"
          title="New Task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/dashboard/Topbar.tsx
git commit -m "feat: build Topbar component"
```

---

### Task 8: Build AgentCard Component

**Files:**
- Create: `renderer/src/components/dashboard/AgentCard.tsx`

**Interfaces:**
- Consumes: `Agent` type from `types/dashboard.ts`
- Props: `{ agent: Agent, isSelected: boolean, onClick: () => void }`

- [ ] **Step 1: Create AgentCard component**

```tsx
// renderer/src/components/dashboard/AgentCard.tsx

import type { Agent } from '@/types/dashboard';

type AgentCardProps = {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
};

export function AgentCard({ agent, isSelected, onClick }: AgentCardProps) {
  const statusColor =
    agent.status === 'active'
      ? 'bg-emerald-500'
      : agent.status === 'idle'
        ? 'bg-amber-500'
        : 'bg-gray-500';

  const barColor = agent.status === 'active' ? agent.textColor : '#f59e0b';

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-[#2a2a2a] border border-[#3a3a3a]' : 'bg-[#1a1a1a] hover:bg-[#1f1f1f]'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
          style={{ background: agent.color, color: agent.textColor }}
        >
          {agent.short}
        </div>
        <div className="flex-1">
          <div className="text-sm text-[#e5e5e5] font-medium">{agent.name}</div>
        </div>
        <div className={`w-2 h-2 rounded-full ${statusColor} ${agent.status === 'active' ? 'animate-pulse' : ''}`} />
      </div>

      <div className="text-xs font-mono text-[#737373] truncate mb-2">{agent.task}</div>

      {agent.progress > 0 && (
        <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${agent.progress}%`, background: barColor }}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/dashboard/AgentCard.tsx
git commit -m "feat: build AgentCard component"
```

---

### Task 9: Build FleetPanel Component

**Files:**
- Create: `renderer/src/components/dashboard/FleetPanel.tsx`

**Interfaces:**
- Consumes: `Agent` type from `types/dashboard.ts`, `AgentCard` component
- Props: `{ agents: Agent[], selectedAgentId?: string, onSelectAgent: (id: string) => void }`

- [ ] **Step 1: Create FleetPanel component**

```tsx
// renderer/src/components/dashboard/FleetPanel.tsx

import type { Agent } from '@/types/dashboard';
import { AgentCard } from './AgentCard';

type FleetPanelProps = {
  agents: Agent[];
  selectedAgentId?: string;
  onSelectAgent: (id: string) => void;
};

export function FleetPanel({ agents, selectedAgentId, onSelectAgent }: FleetPanelProps) {
  return (
    <aside className="w-[280px] border-r border-[#2a2a2a] bg-[#0a0a0a] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm text-[#e5e5e5] font-medium">Fleet</span>
        <span className="text-xs font-mono text-[#737373] bg-[#1a1a1a] px-2 py-0.5 rounded">
          {agents.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={agent.id === selectedAgentId}
            onClick={() => onSelectAgent(agent.id)}
          />
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/dashboard/FleetPanel.tsx
git commit -m "feat: build FleetPanel component"
```

---

### Task 10: Build PlanPanel Component

**Files:**
- Create: `renderer/src/components/dashboard/PlanPanel.tsx`

**Interfaces:**
- Consumes: `PlanStep` type from `types/dashboard.ts`, `seedPlanSteps` from `data/mockData.ts`
- Props: `{ steps: PlanStep[], progress: number }`

- [ ] **Step 1: Create PlanPanel component**

```tsx
// renderer/src/components/dashboard/PlanPanel.tsx

import type { PlanStep } from '@/types/dashboard';

type PlanPanelProps = {
  steps: PlanStep[];
  progress: number;
};

export function PlanPanel({ steps, progress }: PlanPanelProps) {
  return (
    <section className="flex-1 border-r border-[#2a2a2a] bg-[#0a0a0a] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm text-[#e5e5e5] font-medium">Active Plan</span>
        <span className="text-xs font-mono text-[#737373] bg-[#1a1a1a] px-2 py-0.5 rounded">
          {steps.length} steps
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {index < steps.length - 1 && (
                <div className="absolute left-[15px] top-[32px] bottom-[-16px] w-[2px] bg-[#2a2a2a]" />
              )}

              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                    step.status === 'done'
                      ? 'bg-emerald-500/20 text-emerald-500'
                      : step.status === 'active'
                        ? 'bg-blue-500/20 text-blue-500'
                        : 'bg-[#1a1a1a] text-[#737373]'
                  }`}
                >
                  {step.number}
                </div>

                <div className="flex-1 pt-1">
                  <div className="text-sm text-[#e5e5e5] mb-1">{step.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#737373] bg-[#1a1a1a] px-2 py-0.5 rounded">
                      {step.agentId}
                    </span>
                    <span className="text-xs text-[#737373]">{step.duration}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[#2a2a2a]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#737373]">Progress</span>
          <span className="text-xs font-mono text-[#e5e5e5]">{progress}%</span>
        </div>
        <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/dashboard/PlanPanel.tsx
git commit -m "feat: build PlanPanel component"
```

---

### Task 11: Build ActivityFeed Component

**Files:**
- Create: `renderer/src/components/dashboard/ActivityFeed.tsx`

**Interfaces:**
- Consumes: `Activity`, `Agent` types from `types/dashboard.ts`
- Props: `{ activities: Activity[], agents: Agent[] }`

- [ ] **Step 1: Create ActivityFeed component**

```tsx
// renderer/src/components/dashboard/ActivityFeed.tsx

import type { Activity, Agent } from '@/types/dashboard';

type ActivityFeedProps = {
  activities: Activity[];
  agents: Agent[];
};

const actionColors: Record<string, string> = {
  read: 'bg-blue-500/20 text-blue-500',
  write: 'bg-emerald-500/20 text-emerald-500',
  edit: 'bg-violet-500/20 text-violet-500',
  test: 'bg-amber-500/20 text-amber-500',
  lint: 'bg-gray-500/20 text-gray-500',
  plan: 'bg-blue-500/20 text-blue-500',
};

export function ActivityFeed({ activities, agents }: ActivityFeedProps) {
  const getAgent = (agentId: string) => agents.find((a) => a.id === agentId);

  return (
    <aside className="w-[320px] bg-[#0a0a0a] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm text-[#e5e5e5] font-medium">Activity</span>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {activities.map((activity) => {
          const agent = getAgent(activity.agentId);
          if (!agent) return null;

          return (
            <div
              key={activity.id}
              className="px-4 py-3 border-b border-[#1a1a1a] animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-3">
                <span className="text-xs font-mono text-[#737373] pt-0.5">{activity.time}</span>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                  style={{ background: agent.color, color: agent.textColor }}
                >
                  {agent.short}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${actionColors[activity.action]}`}>
                      {activity.action}
                    </span>
                  </div>
                  <div className="text-xs text-[#a3a3a3] mb-1">{activity.description}</div>
                  {activity.file && (
                    <div className="text-[10px] font-mono text-[#737373] truncate">{activity.file}</div>
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
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/dashboard/ActivityFeed.tsx
git commit -m "feat: build ActivityFeed component"
```

---

### Task 12: Build MetricsFooter Component

**Files:**
- Create: `renderer/src/components/dashboard/MetricsFooter.tsx`

**Interfaces:**
- Props: `{ progress: number, elapsed: number, activeAgents: number, tokens: number }`

- [ ] **Step 1: Create MetricsFooter component**

```tsx
// renderer/src/components/dashboard/MetricsFooter.tsx

type MetricsFooterProps = {
  progress: number;
  elapsed: number;
  activeAgents: number;
  tokens: number;
};

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MetricsFooter({ progress, elapsed, activeAgents, tokens }: MetricsFooterProps) {
  return (
    <footer className="flex items-center justify-center gap-8 px-6 py-3 border-t border-[#2a2a2a] bg-[#0a0a0a]">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#737373]">Progress</span>
        <span className="text-sm font-mono text-[#e5e5e5]">{progress}%</span>
      </div>
      <div className="w-px h-4 bg-[#2a2a2a]" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#737373]">Elapsed</span>
        <span className="text-sm font-mono text-[#e5e5e5]">{formatElapsed(elapsed)}</span>
      </div>
      <div className="w-px h-4 bg-[#2a2a2a]" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#737373]">Active</span>
        <span className="text-sm font-mono text-[#e5e5e5]">{activeAgents}</span>
      </div>
      <div className="w-px h-4 bg-[#2a2a2a]" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#737373]">Tokens</span>
        <span className="text-sm font-mono text-amber-500">{tokens}</span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/dashboard/MetricsFooter.tsx
git commit -m "feat: build MetricsFooter component"
```

---

### Task 13: Build AgentDetailPanel Component

**Files:**
- Create: `renderer/src/components/dashboard/AgentDetailPanel.tsx`

**Interfaces:**
- Consumes: `Agent` type from `types/dashboard.ts`
- Props: `{ agent?: Agent, isOpen: boolean, onClose: () => void }`

- [ ] **Step 1: Create AgentDetailPanel component**

```tsx
// renderer/src/components/dashboard/AgentDetailPanel.tsx

import { X } from 'lucide-react';
import type { Agent } from '@/types/dashboard';

type AgentDetailPanelProps = {
  agent?: Agent;
  isOpen: boolean;
  onClose: () => void;
};

export function AgentDetailPanel({ agent, isOpen, onClose }: AgentDetailPanelProps) {
  if (!agent) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-[320px] bg-[#0a0a0a] border-l border-[#2a2a2a] z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
              style={{ background: agent.color, color: agent.textColor }}
            >
              {agent.short}
            </div>
            <div>
              <div className="text-sm text-[#e5e5e5] font-medium">{agent.name}</div>
              <div className="text-xs text-[#737373]">Code specialist</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#737373] hover:bg-[#1a1a1a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <div className="text-xs text-[#737373] mb-2">Current task</div>
            <div className="text-sm text-[#e5e5e5]">{agent.task}</div>
          </div>

          <div>
            <div className="text-xs text-[#737373] mb-2">Progress</div>
            <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden mb-1">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${agent.progress}%`, background: agent.textColor }}
              />
            </div>
            <div className="text-xs font-mono text-[#a3a3a3]">{agent.progress}%</div>
          </div>

          {agent.files && agent.files.length > 0 && (
            <div>
              <div className="text-xs text-[#737373] mb-2">Files touched</div>
              <div className="space-y-1">
                {agent.files.map((file, i) => (
                  <div key={i} className="text-xs font-mono text-[#a3a3a3] bg-[#1a1a1a] px-2 py-1 rounded">
                    {file}
                  </div>
                ))}
              </div>
            </div>
          )}

          {agent.messages && agent.messages.length > 0 && (
            <div>
              <div className="text-xs text-[#737373] mb-2">Messages</div>
              <div className="space-y-2">
                {agent.messages.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-[#737373] pt-0.5">{msg.time}</span>
                    <span className="text-xs text-[#a3a3a3]">{msg.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/dashboard/AgentDetailPanel.tsx
git commit -m "feat: build AgentDetailPanel component"
```

---

### Task 14: Build Dashboard Orchestrator Component

**Files:**
- Create: `renderer/src/components/dashboard/Dashboard.tsx`
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: All hooks and components
- Produces: Complete dashboard view

- [ ] **Step 1: Create Dashboard component that wires all hooks and components**

```tsx
// renderer/src/components/dashboard/Dashboard.tsx

import { useState } from 'react';
import { useAgentSimulation } from '@/hooks/useAgentSimulation';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useDashboardMode } from '@/hooks/useDashboardMode';
import { useElapsedTimer } from '@/hooks/useElapsedTimer';
import { seedPlanSteps } from '@/data/mockData';
import { Topbar } from './Topbar';
import { FleetPanel } from './FleetPanel';
import { PlanPanel } from './PlanPanel';
import { ActivityFeed } from './ActivityFeed';
import { MetricsFooter } from './MetricsFooter';
import { AgentDetailPanel } from './AgentDetailPanel';

export function Dashboard() {
  const { agents, pause, resume, reset } = useAgentSimulation();
  const [isPaused, setIsPaused] = useState(false);
  const { activities } = useActivityFeed(agents, isPaused);
  const { mode, setMode } = useDashboardMode();
  const { elapsed, start, reset: resetTimer } = useElapsedTimer();
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();

  const handlePause = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    reset();
    resetTimer();
    setIsPaused(false);
    start();
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const activeAgents = agents.filter((a) => a.status === 'active').length;
  const progress = Math.round(agents.reduce((sum, a) => sum + a.progress, 0) / agents.length);
  const tokens = Math.floor(elapsed * 150);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      <Topbar
        mode={mode}
        isPaused={isPaused}
        onModeChange={setMode}
        onPause={handlePause}
        onStop={handleStop}
      />

      <div className="flex-1 flex overflow-hidden">
        <FleetPanel
          agents={agents}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgentId}
        />
        <PlanPanel steps={seedPlanSteps} progress={progress} />
        <ActivityFeed activities={activities} agents={agents} />
      </div>

      <MetricsFooter
        progress={progress}
        elapsed={elapsed}
        activeAgents={activeAgents}
        tokens={tokens}
      />

      <AgentDetailPanel
        agent={selectedAgent}
        isOpen={!!selectedAgentId}
        onClose={() => setSelectedAgentId(undefined)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx to mount Dashboard**

```tsx
// renderer/src/App.tsx

import { Dashboard } from './components/dashboard/Dashboard';

function App() {
  return <Dashboard />;
}

export default App;
```

- [ ] **Step 3: Start the dev server and verify the dashboard renders**

Run: `npm run dev`
Expected: Electron window opens with the dashboard visible

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/dashboard/Dashboard.tsx renderer/src/App.tsx
git commit -m "feat: build Dashboard orchestrator and mount in App"
```

---

### Task 15: Add Responsive Breakpoints

**Files:**
- Modify: `renderer/src/components/dashboard/Dashboard.tsx`
- Modify: `renderer/src/components/dashboard/FleetPanel.tsx`
- Modify: `renderer/src/components/dashboard/ActivityFeed.tsx`
