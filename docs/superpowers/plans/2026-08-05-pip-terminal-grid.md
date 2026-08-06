# Picture-in-Picture Terminal Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Picture-in-Picture terminal layout where one agent occupies the main terminal area and additional agents float as draggable, resizable overlays.

**Architecture:** React Context (`PiPProvider`) manages global PiP state (main agent, overlays, z-index). Each overlay uses `react-rnd` for drag/resize physics. Multiple xterm.js instances subscribe to the same backend session via IPC events. Sessions persist across navigation; closing an overlay detaches the view but keeps the session running.

**Tech Stack:** React 19, TypeScript, react-rnd, @xterm/xterm, Tailwind CSS v4, Vitest

## Global Constraints

- Package manager: **pnpm**
- Dark theme only: `#0a0a0a` bg, `#1a1a1a` surface, `#2a2a2a` border
- Design tokens: `--dashboard-bg`, `--dashboard-surface`, `--dashboard-border`, `--dashboard-text-primary`, `--dashboard-text-secondary`, `--dashboard-accent`
- State architecture: Hooks own state, components are pure render
- Styling: Tailwind CSS v4 + shadcn/ui primitives
- Icons: lucide-react
- Accessibility: Keyboard navigation (Tab/Enter/Space), ARIA labels, focus rings
- Session per agent: one active session per agentId, reject duplicates
- Tests: `pnpm test` runs Vitest (main: node env, renderer: jsdom env)

---

### Task 1: Install react-rnd and Define PiP Types

**Files:**
- Modify: `package.json`
- Create: `renderer/src/types/pip.ts`

**Interfaces:**
- Produces: `Overlay`, `PiPState`, `SizePreset` types used by all subsequent tasks

- [ ] **Step 1: Install react-rnd dependency**

Run: `pnpm add react-rnd`

Expected: Package added to dependencies in `package.json`

- [ ] **Step 2: Verify installation**

Run: `pnpm build:ts`

Expected: TypeScript compiles without errors

- [ ] **Step 3: Create PiP types file**

Create `renderer/src/types/pip.ts`:

```typescript
export type OverlaySize = 'S' | 'M' | 'L';

export type Overlay = {
  agentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  size: OverlaySize;
};

export type SizePreset = {
  width: number;
  height: number;
};

export type SizePresets = Record<OverlaySize, SizePreset>;

export const SIZE_PRESETS: SizePresets = {
  S: { width: 280, height: 180 },
  M: { width: 400, height: 260 },
  L: { width: 560, height: 360 },
};

export type OverlayContentMode = 'minimal' | 'preview' | 'rich';

export type PiPState = {
  mainAgentId: string | null;
  overlays: Overlay[];
  nextZIndex: number;
};

export type PiPActions = {
  setMainAgent: (agentId: string | null) => void;
  addOverlay: (agentId: string) => void;
  removeOverlay: (agentId: string) => void;
  promoteToMain: (agentId: string) => void;
  updateOverlayPosition: (agentId: string, x: number, y: number) => void;
  updateOverlaySize: (agentId: string, width: number, height: number, size: OverlaySize) => void;
  bringOverlayToFront: (agentId: string) => void;
};
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm build:ts`

Expected: TypeScript compiles without errors

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml renderer/src/types/pip.ts
git commit -m "feat: add react-rnd dependency and PiP type definitions"
```

---

### Task 2: Implement usePiP Hook with Unit Tests

**Files:**
- Create: `renderer/src/hooks/usePiP.ts`
- Create: `renderer/src/hooks/usePiP.test.ts`

**Interfaces:**
- Consumes: `Overlay`, `PiPState`, `PiPActions`, `SIZE_PRESETS` from `types/pip.ts`
- Produces: `usePiP()` hook returning `{ state, actions }`

- [ ] **Step 1: Write failing test for initial state**

Create `renderer/src/hooks/usePiP.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePiP } from './usePiP';

describe('usePiP', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => usePiP());
    expect(result.current.state.mainAgentId).toBeNull();
    expect(result.current.state.overlays).toEqual([]);
    expect(result.current.state.nextZIndex).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/hooks/usePiP.test.ts`

Expected: FAIL with "usePiP is not a function" or similar

- [ ] **Step 3: Implement usePiP hook**

Create `renderer/src/hooks/usePiP.ts`:

```typescript
import { useState, useCallback } from 'react';
import type { Overlay, OverlaySize, PiPState, PiPActions } from '../types/pip';
import { SIZE_PRESETS } from '../types/pip';

export function usePiP(): { state: PiPState; actions: PiPActions } {
  const [state, setState] = useState<PiPState>({
    mainAgentId: null,
    overlays: [],
    nextZIndex: 10,
  });

  const setMainAgent = useCallback((agentId: string | null) => {
    setState(prev => ({ ...prev, mainAgentId: agentId }));
  }, []);

  const addOverlay = useCallback((agentId: string) => {
    setState(prev => {
      // Prevent duplicate: already main
      if (prev.mainAgentId === agentId) return prev;
      // Prevent duplicate: already in overlays
      if (prev.overlays.some(o => o.agentId === agentId)) return prev;

      const preset = SIZE_PRESETS.M;
      const newOverlay: Overlay = {
        agentId,
        x: 100 + prev.overlays.length * 30,
        y: 100 + prev.overlays.length * 30,
        width: preset.width,
        height: preset.height,
        zIndex: prev.nextZIndex,
        size: 'M',
      };

      return {
        ...prev,
        overlays: [...prev.overlays, newOverlay],
        nextZIndex: prev.nextZIndex + 10,
      };
    });
  }, []);

  const removeOverlay = useCallback((agentId: string) => {
    setState(prev => ({
      ...prev,
      overlays: prev.overlays.filter(o => o.agentId !== agentId),
    }));
  }, []);

  const promoteToMain = useCallback((agentId: string) => {
    setState(prev => {
      const overlay = prev.overlays.find(o => o.agentId === agentId);
      if (!overlay) return prev;

      const oldMainId = prev.mainAgentId;
      const newOverlays = prev.overlays.filter(o => o.agentId !== agentId);

      // If there was a main agent, move it to overlays
      if (oldMainId) {
        const preset = SIZE_PRESETS.M;
        const demotedOverlay: Overlay = {
          agentId: oldMainId,
          x: overlay.x,
          y: overlay.y,
          width: preset.width,
          height: preset.height,
          zIndex: prev.nextZIndex,
          size: 'M',
        };
        newOverlays.push(demotedOverlay);
      }

      return {
        mainAgentId: agentId,
        overlays: newOverlays,
        nextZIndex: prev.nextZIndex + 10,
      };
    });
  }, []);

  const updateOverlayPosition = useCallback((agentId: string, x: number, y: number) => {
    setState(prev => ({
      ...prev,
      overlays: prev.overlays.map(o =>
        o.agentId === agentId ? { ...o, x, y } : o
      ),
    }));
  }, []);

  const updateOverlaySize = useCallback((agentId: string, width: number, height: number, size: OverlaySize) => {
    setState(prev => ({
      ...prev,
      overlays: prev.overlays.map(o =>
        o.agentId === agentId ? { ...o, width, height, size } : o
      ),
    }));
  }, []);

  const bringOverlayToFront = useCallback((agentId: string) => {
    setState(prev => ({
      ...prev,
      overlays: prev.overlays.map(o =>
        o.agentId === agentId ? { ...o, zIndex: prev.nextZIndex } : o
      ),
      nextZIndex: prev.nextZIndex + 10,
    }));
  }, []);

  const actions: PiPActions = {
    setMainAgent,
    addOverlay,
    removeOverlay,
    promoteToMain,
    updateOverlayPosition,
    updateOverlaySize,
    bringOverlayToFront,
  };

  return { state, actions };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/hooks/usePiP.test.ts`

Expected: PASS

- [ ] **Step 5: Write test for addOverlay validation**

Add to `renderer/src/hooks/usePiP.test.ts`:

```typescript
  it('prevents adding duplicate overlay when agent is main', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.setMainAgent('agent-1');
    });
    act(() => {
      result.current.actions.addOverlay('agent-1');
    });
    expect(result.current.state.overlays).toEqual([]);
  });

  it('prevents adding duplicate overlay when already in overlays', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.addOverlay('agent-1');
    });
    act(() => {
      result.current.actions.addOverlay('agent-1');
    });
    expect(result.current.state.overlays).toHaveLength(1);
  });

  it('adds overlay with default position and size', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.addOverlay('agent-1');
    });
    expect(result.current.state.overlays).toHaveLength(1);
    expect(result.current.state.overlays[0].agentId).toBe('agent-1');
    expect(result.current.state.overlays[0].size).toBe('M');
    expect(result.current.state.overlays[0].width).toBe(400);
    expect(result.current.state.overlays[0].height).toBe(260);
  });
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test renderer/src/hooks/usePiP.test.ts`

Expected: All tests PASS

- [ ] **Step 7: Write test for promoteToMain swap logic**

Add to `renderer/src/hooks/usePiP.test.ts`:

```typescript
  it('promotes overlay to main and demotes current main to overlay', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.setMainAgent('agent-1');
      result.current.actions.addOverlay('agent-2');
    });
    act(() => {
      result.current.actions.promoteToMain('agent-2');
    });
    expect(result.current.state.mainAgentId).toBe('agent-2');
    expect(result.current.state.overlays).toHaveLength(1);
    expect(result.current.state.overlays[0].agentId).toBe('agent-1');
  });

  it('promotes overlay to main when no current main', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.addOverlay('agent-1');
    });
    act(() => {
      result.current.actions.promoteToMain('agent-1');
    });
    expect(result.current.state.mainAgentId).toBe('agent-1');
    expect(result.current.state.overlays).toHaveLength(0);
  });
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm test renderer/src/hooks/usePiP.test.ts`

Expected: All tests PASS

- [ ] **Step 9: Write test for z-index management**

Add to `renderer/src/hooks/usePiP.test.ts`:

```typescript
  it('brings overlay to front by incrementing z-index', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.addOverlay('agent-1');
      result.current.actions.addOverlay('agent-2');
    });
    const initialZ1 = result.current.state.overlays[0].zIndex;
    const initialZ2 = result.current.state.overlays[1].zIndex;
    expect(initialZ2).toBeGreaterThan(initialZ1);
    
    act(() => {
      result.current.actions.bringOverlayToFront('agent-1');
    });
    const newZ1 = result.current.state.overlays[0].zIndex;
    expect(newZ1).toBeGreaterThan(initialZ2);
  });
```

Run: `pnpm test renderer/src/hooks/usePiP.test.ts`

Expected: All tests PASS

- [ ] **Step 11: Commit**

```bash
git add renderer/src/hooks/usePiP.ts renderer/src/hooks/usePiP.test.ts
git commit -m "feat: implement usePiP hook with validation and z-index management"
```

---

### Task 3: Create PiPContext Provider

**Files:**
- Create: `renderer/src/context/PiPContext.tsx`

**Interfaces:**
- Consumes: `usePiP()` hook, `PiPState`, `PiPActions`
- Produces: `PiPProvider` component, `usePiPContext()` hook

- [ ] **Step 1: Create PiPContext**

Create `renderer/src/context/PiPContext.tsx`:

```typescript
import { createContext, useContext, type ReactNode } from 'react';
import { usePiP } from '../hooks/usePiP';
import type { PiPState, PiPActions } from '../types/pip';

type PiPContextValue = {
  state: PiPState;
  actions: PiPActions;
};

const PiPContext = createContext<PiPContextValue | null>(null);

export function PiPProvider({ children }: { children: ReactNode }) {
  const pip = usePiP();
  return <PiPContext.Provider value={pip}>{children}</PiPContext.Provider>;
}

export function usePiPContext(): PiPContextValue {
  const context = useContext(PiPContext);
  if (!context) {
    throw new Error('usePiPContext must be used within PiPProvider');
  }
  return context;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add renderer/src/context/PiPContext.tsx
git commit -m "feat: create PiPContext provider for global PiP state"
```

---

### Task 4: Build PiPContainer Layout Component

**Files:**
- Create: `renderer/src/components/pip/PiPContainer.tsx`

**Interfaces:**
- Consumes: `usePiPContext()` to get state
- Produces: Layout wrapper with CSS Grid structure

- [ ] **Step 1: Create PiPContainer component**

Create `renderer/src/components/pip/PiPContainer.tsx`:

```typescript
import type { ReactNode } from 'react';

type PiPContainerProps = {
  children: ReactNode;
};

export function PiPContainer({ children }: PiPContainerProps) {
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        display: 'grid',
        gridTemplate: '1fr / 1fr',
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/pip/PiPContainer.tsx
git commit -m "feat: create PiPContainer with CSS Grid layout"
```

---

### Task 5: Implement AgentOverlay with react-rnd

**Files:**
- Create: `renderer/src/components/pip/AgentOverlay.tsx`

**Interfaces:**
- Consumes: `Overlay` type, `usePiPContext()`, `useSession()`, xterm.js
- Produces: Draggable/resizable overlay component

- [ ] **Step 1: Create AgentOverlay component**

Create `renderer/src/components/pip/AgentOverlay.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import { usePiPContext } from '../../context/PiPContext';
import { useSession } from '../../hooks/useSession';
import type { Overlay, OverlayContentMode } from '../../types/pip';

type AgentOverlayProps = {
  overlay: Overlay;
  agentName: string;
  agentStatus: 'idle' | 'running' | 'exited';
};

export function AgentOverlay({ overlay, agentName, agentStatus }: AgentOverlayProps) {
  const { actions } = usePiPContext();
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [contentMode, setContentMode] = useState<OverlayContentMode>('preview');
  const [isDragging, setIsDragging] = useState(false);

  const { state: sessionState, spawn, write, resize } = useSession(overlay.agentId);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || (contentMode !== 'preview' && contentMode !== 'rich')) return;

    const term = new Terminal({
      cursorBlink: false,
      fontSize: 12,
      fontFamily: 'Monaco, Menlo, monospace',
      scrollback: 100,
      theme: {
        background: '#0a0a0a',
        foreground: '#e5e5e5',
      },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    const onDataDisposable = term.onData((data) => {
      write(data);
    });

    const unsubData = window.api.session.onData((evtAgentId, data) => {
      if (evtAgentId === overlay.agentId) {
        term.write(data);
      }
    });

    const unsubExit = window.api.session.onExit((evtAgentId) => {
      if (evtAgentId === overlay.agentId) {
        term.writeln('\r\n[Session ended]');
      }
    });

    if (sessionState === 'idle') {
      spawn(process.cwd()).catch((err) => {
        term.writeln(`\r\nFailed to start session: ${err.message}`);
      });
    }

    return () => {
      unsubData();
      unsubExit();
      onDataDisposable.dispose();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [overlay.agentId, contentMode]);

  // Fit terminal on resize
  useEffect(() => {
    if (fitAddonRef.current && termRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
        if (termRef.current) {
          const { cols, rows } = termRef.current;
          resize(cols, rows);
        }
      }, 0);
    }
  }, [overlay.width, overlay.height]);

  const handleDragStop = (_e: any, data: { x: number; y: number }) => {
    actions.updateOverlayPosition(overlay.agentId, data.x, data.y);
    setIsDragging(false);
  };

  const handleResizeStop = (_e: any, _dir: any, ref: any, _delta: any, position: { x: number; y: number }) => {
    const width = parseInt(ref.style.width);
    const height = parseInt(ref.style.height);

    let size: 'S' | 'M' | 'L' = 'M';
    if (width <= 300) size = 'S';
    else if (width >= 500) size = 'L';

    actions.updateOverlaySize(overlay.agentId, width, height, size);
    actions.updateOverlayPosition(overlay.agentId, position.x, position.y);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    actions.removeOverlay(overlay.agentId);
  };

  const handlePromote = (e: React.MouseEvent) => {
    e.stopPropagation();
    actions.promoteToMain(overlay.agentId);
  };

  const handleCycleMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const modes: OverlayContentMode[] = ['minimal', 'preview', 'rich'];
    const currentIndex = modes.indexOf(contentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setContentMode(modes[nextIndex]);
  };

  const statusColor = agentStatus === 'running' ? '#3b82f6' : agentStatus === 'exited' ? '#dc2626' : '#737373';

  return (
    <Rnd
      default={{
        x: overlay.x,
        y: overlay.y,
        width: overlay.width,
        height: overlay.height,
      }}
      position={{ x: overlay.x, y: overlay.y }}
      size={{ width: overlay.width, height: overlay.height }}
      minWidth={200}
      minHeight={120}
      bounds="parent"
      dragHandleClassName="overlay-header"
      style={{
        zIndex: overlay.zIndex,
        transition: isDragging ? 'none' : 'transform 0.1s ease',
      }}
      className={`group ${isDragging ? 'scale-[0.98]' : ''}`}
      onDragStart={() => setIsDragging(true)}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onClick={() => actions.bringOverlayToFront(overlay.agentId)}
    >
      <div className="h-full flex flex-col bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] overflow-hidden focus-within:outline focus-within:outline-2 focus-within:outline-[#3b82f6]">
        {/* Header */}
        <div
          className="overlay-header flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] border-b border-[#2a2a2a] cursor-move select-none"
          onClick={handlePromote}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <span className="text-xs font-medium text-[#e5e5e5] flex-1 truncate">
            {agentName}
          </span>
          <button
            onClick={handleCycleMode}
            className="p-1 rounded hover:bg-[#2a2a2a] text-[#737373] hover:text-[#e5e5e5] transition-colors"
            title="Toggle view mode"
          >
            {contentMode === 'minimal' ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-[#dc2626] text-[#737373] hover:text-white transition-colors"
            title="Close overlay"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {contentMode === 'minimal' ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center">
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: statusColor }}
                />
                <p className="text-[10px] uppercase tracking-wide text-[#737373]">
                  {agentStatus}
                </p>
              </div>
            </div>
          ) : (
            <div ref={terminalRef} className="w-full h-full" />
          )}
        </div>
      </div>
    </Rnd>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/pip/AgentOverlay.tsx
git commit -m "feat: implement AgentOverlay with react-rnd drag/resize"
```

---

### Task 6: Build OverlayManager Component

**Files:**
- Create: `renderer/src/components/pip/OverlayManager.tsx`

**Interfaces:**
- Consumes: `usePiPContext()`, `AgentOverlay` component
- Produces: Renders all overlays with absolute positioning

- [ ] **Step 1: Create OverlayManager component**

Create `renderer/src/components/pip/OverlayManager.tsx`:

```typescript
import { usePiPContext } from '../../context/PiPContext';
import { AgentOverlay } from './AgentOverlay';
import { useSessionState } from '../../hooks/useSessionState';

export function OverlayManager() {
  const { state } = usePiPContext();
  const { sessions } = useSessionState();

  if (state.overlays.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 40 }}
    >
      {state.overlays.map((overlay) => {
        const session = sessions.get(overlay.agentId);
        const agentStatus = session?.state || 'idle';

        return (
          <div key={overlay.agentId} className="pointer-events-auto">
            <AgentOverlay
              overlay={overlay}
              agentName={overlay.agentId}
              agentStatus={agentStatus}
            />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/pip/OverlayManager.tsx
git commit -m "feat: create OverlayManager to render all overlays"
```

---

### Task 7: Integrate PiP into App.tsx

**Files:**
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: `PiPProvider`, `PiPContainer`, `OverlayManager`
- Produces: App wrapped with PiP context

- [ ] **Step 1: Update App.tsx to use PiPProvider**

Replace the entire `renderer/src/App.tsx` with:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TooltipProvider } from './components/ui/tooltip';
import { Dashboard } from './components/dashboard/Dashboard';
import { TerminalView } from './components/terminal/TerminalView';
import { AgentDetailView } from './components/views/AgentDetailView';
import { WorktreeView } from './components/views/WorktreeView';
import { CompletedWorkView } from './components/views/CompletedWorkView';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { PiPProvider } from './context/PiPContext';

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
    return null;
  }

  if (!onboardingCompleted) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <PiPProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agent/:agentId" element={<TerminalView />} />
            <Route path="/worktrees" element={<WorktreeView />} />
            <Route path="/completed/:agentId" element={<CompletedWorkView />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </PiPProvider>
  );
}

export default App;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add renderer/src/App.tsx
git commit -m "feat: wrap app with PiPProvider for global PiP state"
```

---

### Task 8: Add "Open as Overlay" to Dashboard

**Files:**
- Modify: `renderer/src/components/dashboard/Dashboard.tsx`

**Interfaces:**
- Consumes: `usePiPContext()` to access `addOverlay` action
- Produces: Button to open agent as overlay

- [ ] **Step 1: Import usePiPContext in Dashboard**

Add to imports in `renderer/src/components/dashboard/Dashboard.tsx`:

```typescript
import { usePiPContext } from '@/context/PiPContext';
```

- [ ] **Step 2: Add usePiPContext hook call**

Inside the `Dashboard` component function body, add after the existing hooks:

```typescript
const { actions: pipActions } = usePiPContext();
```

- [ ] **Step 3: Add handler for opening overlay**

Add this handler function after `handleAgentClick`:

```typescript
const handleOpenAsOverlay = (agentId: string) => {
  pipActions.addOverlay(agentId);
};
```

- [ ] **Step 4: Add PiP button to agent cards**

Read the Dashboard component to find where agent cards are rendered. Look for the section that renders agent action buttons (Launch, View Terminal). Add a PiP button next to them:

```typescript
<button
  onClick={() => handleOpenAsOverlay(agent.id)}
  className="px-3 py-1.5 text-xs bg-[#2a2a2a] text-[#e5e5e5] rounded hover:bg-[#3a3a3a] transition-colors"
  title="Open as overlay"
>
  PiP
</button>
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add renderer/src/components/dashboard/Dashboard.tsx
git commit -m "feat: add 'Open as Overlay' button to dashboard agent cards"
```

---

### Task 9: Create MainTerminal Component for PiP Layout

**Files:**
- Create: `renderer/src/components/pip/MainTerminal.tsx`
- Modify: `renderer/src/components/terminal/TerminalView.tsx`

**Interfaces:**
- Consumes: `usePiPContext()` to get `mainAgentId`, existing `TerminalView` component
- Produces: Main terminal area that shows focused agent or dashboard fallback

- [ ] **Step 1: Update TerminalView to accept agentId prop**

Replace `renderer/src/components/terminal/TerminalView.tsx` with:

```typescript
import { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useSession } from '../../hooks/useSession';

type TerminalViewProps = {
  agentId?: string;
};

export function TerminalView({ agentId: propAgentId }: TerminalViewProps = {}) {
  const { agentId: paramAgentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const cwd = searchParams.get('cwd') || process.cwd();
  const agentId = propAgentId || paramAgentId;

  const terminalRef = useRef<HTMLDivElement>(null);
  const { state, spawn, write, resize, destroy } = useSession(agentId!);

  useEffect(() => {
    if (!terminalRef.current || !agentId) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, monospace',
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    const onDataDisposable = term.onData((data) => {
      write(data);
    });

    const unsubData = window.api.session.onData((evtAgentId, data) => {
      if (evtAgentId === agentId) {
        term.write(data);
      }
    });

    const unsubExit = window.api.session.onExit((evtAgentId) => {
      if (evtAgentId === agentId) {
        term.writeln('\r\n[Session ended]');
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      const { cols, rows } = term;
      resize(cols, rows);
    });
    resizeObserver.observe(terminalRef.current);

    spawn(cwd).catch((err) => {
      term.writeln(`\r\nFailed to start session: ${err.message}`);
    });

    return () => {
      resizeObserver.disconnect();
      unsubData();
      unsubExit();
      onDataDisposable.dispose();
      term.dispose();
    };
  }, [agentId, cwd, spawn, write, resize, destroy]);

  return <div className="terminal-container" ref={terminalRef} />;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors

- [ ] **Step 3: Create MainTerminal component**

Create `renderer/src/components/pip/MainTerminal.tsx`:

```typescript
import { usePiPContext } from '../../context/PiPContext';
import { TerminalView } from '../terminal/TerminalView';
import { Dashboard } from '../dashboard/Dashboard';

export function MainTerminal() {
  const { state } = usePiPContext();

  if (!state.mainAgentId) {
    return <Dashboard />;
  }

  return (
    <div className="w-full h-full">
      <TerminalView agentId={state.mainAgentId} />
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/pip/MainTerminal.tsx renderer/src/components/terminal/TerminalView.tsx
git commit -m "feat: create MainTerminal component and make TerminalView accept agentId prop"
```

---

### Task 10: Integrate PiP Layout into Dashboard Route

**Files:**
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: `PiPContainer`, `MainTerminal`, `OverlayManager`
- Produces: Dashboard route wrapped in PiP layout

- [ ] **Step 1: Update App.tsx to use PiP layout**

Replace the entire `renderer/src/App.tsx` with:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TooltipProvider } from './components/ui/tooltip';
import { Dashboard } from './components/dashboard/Dashboard';
import { TerminalView } from './components/terminal/TerminalView';
import { AgentDetailView } from './components/views/AgentDetailView';
import { WorktreeView } from './components/views/WorktreeView';
import { CompletedWorkView } from './components/views/CompletedWorkView';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { PiPProvider } from './context/PiPContext';
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
    return null;
  }

  if (!onboardingCompleted) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <PiPProvider>
      <TooltipProvider>
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
            <Route path="/agent/:agentId" element={<TerminalView />} />
            <Route path="/worktrees" element={<WorktreeView />} />
            <Route path="/completed/:agentId" element={<CompletedWorkView />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </PiPProvider>
  );
}

export default App;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add renderer/src/App.tsx
git commit -m "feat: integrate PiP layout into dashboard route"
```

---

### Task 11: Manual Testing and Verification

**Files:**
None (manual testing)

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

Expected: App launches without errors

- [ ] **Step 2: Test basic overlay creation**

1. Complete onboarding if needed
2. Click "PiP" button on an agent card in dashboard
3. Expected: Overlay appears with default size (400x260) at position (100, 100)

- [ ] **Step 3: Test overlay dragging**

1. Click and drag overlay header
2. Expected: Overlay moves smoothly, follows cursor
3. Release mouse
4. Expected: Overlay stays at new position

- [ ] **Step 4: Test overlay resizing**

1. Drag overlay edges/corners
2. Expected: Overlay resizes smoothly
3. Terminal content inside adjusts to new size

- [ ] **Step 5: Test overlay promotion**

1. Click overlay header (not on buttons)
2. Expected: Overlay becomes main terminal, previous main (if any) becomes overlay

- [ ] **Step 6: Test overlay closing**

1. Click X button on overlay
2. Expected: Overlay disappears, session continues running in background

- [ ] **Step 7: Test multiple overlays**

1. Open 3-4 overlays for different agents
2. Expected: All overlays visible, can drag/resize independently
3. Click different overlays
4. Expected: Clicked overlay comes to front (z-index increases)

- [ ] **Step 8: Test content mode cycling**

1. Click the toggle button (Maximize2/Minimize2 icon) on overlay
2. Expected: Cycles through minimal → preview → rich modes
3. Minimal mode shows only status indicator
4. Preview/Rich modes show terminal

- [ ] **Step 9: Test session persistence**

1. Open overlay for agent
2. Navigate to different route (e.g., /worktrees)
3. Navigate back to dashboard
4. Expected: Overlay still visible, session still running

- [ ] **Step 10: Test keyboard navigation**

1. Tab through overlays
2. Expected: Focus moves between overlays
3. Press Enter/Space on focused overlay
4. Expected: Overlay promotes to main
5. Press Escape on focused overlay
6. Expected: Overlay closes

- [ ] **Step 11: Test performance with many overlays**

1. Open 10 overlays
2. Drag and resize multiple overlays
3. Expected: Smooth performance, no lag
4. Check browser DevTools Performance tab
5. Expected: No significant frame drops

- [ ] **Step 12: Verify all success criteria**

Check each item from the spec's success criteria:

- [ ] Main terminal shows focused agent or dashboard fallback
- [ ] Overlays are draggable with react-rnd
- [ ] Overlays are resizable with preset sizes (S/M/L)
- [ ] Clicking overlay promotes to main focus
- [ ] Overlay content is configurable (minimal/preview/rich)
- [ ] Sessions persist across navigation
- [ ] No duplicate agents (main OR overlay, not both)
- [ ] Overlay positions persist across app restarts (NOT YET IMPLEMENTED - see Task 12)
- [ ] Performance acceptable with 10+ overlays

- [ ] **Step 13: Commit any fixes**

If any bugs were found and fixed during manual testing:

```bash
git add -A
git commit -m "fix: resolve issues found during manual PiP testing"
```

---

### Task 12: Add Position Persistence (Optional Enhancement)

**Files:**
- Create: `renderer/src/lib/pip-persistence.ts`
- Modify: `renderer/src/hooks/usePiP.ts`

**Interfaces:**
- Consumes: `PiPState` type
- Produces: Save/load functions for overlay positions

- [ ] **Step 1: Create pip-persistence utility**

Create `renderer/src/lib/pip-persistence.ts`:

```typescript
const PIP_STORAGE_KEY = 'pidash:pip-state';

export type PersistedPiPState = {
  mainAgentId: string | null;
  overlays: Array<{
    agentId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    size: 'S' | 'M' | 'L';
  }>;
};

export function savePiPState(state: PersistedPiPState): void {
  localStorage.setItem(PIP_STORAGE_KEY, JSON.stringify(state));
}

export function loadPiPState(): PersistedPiPState | null {
  const data = localStorage.getItem(PIP_STORAGE_KEY);
  if (!data) return null;

  try {
    return JSON.parse(data) as PersistedPiPState;
  } catch {
    return null;
  }
}

export function clearPiPState(): void {
  localStorage.removeItem(PIP_STORAGE_KEY);
}
```

- [ ] **Step 2: Write test for persistence**

Create `renderer/src/lib/pip-persistence.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { savePiPState, loadPiPState, clearPiPState } from './pip-persistence';

describe('pip-persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads PiP state', () => {
    const state = {
      mainAgentId: 'agent-1',
      overlays: [
        { agentId: 'agent-2', x: 100, y: 200, width: 400, height: 260, size: 'M' as const },
      ],
    };

    savePiPState(state);
    const loaded = loadPiPState();

    expect(loaded).toEqual(state);
  });

  it('returns null when no state saved', () => {
    const loaded = loadPiPState();
    expect(loaded).toBeNull();
  });

  it('clears PiP state', () => {
    const state = {
      mainAgentId: 'agent-1',
      overlays: [],
    };

    savePiPState(state);
    clearPiPState();
    const loaded = loadPiPState();

    expect(loaded).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm test renderer/src/lib/pip-persistence.test.ts`

Expected: All tests PASS

- [ ] **Step 4: Integrate persistence into usePiP hook**

Modify `renderer/src/hooks/usePiP.ts` to save state on changes and load on init:

```typescript
import { useState, useCallback, useEffect } from 'react';
import type { Overlay, OverlaySize, PiPState, PiPActions } from '../types/pip';
import { SIZE_PRESETS } from '../types/pip';
import { savePiPState, loadPiPState, type PersistedPiPState } from '../lib/pip-persistence';

export function usePiP(): { state: PiPState; actions: PiPActions } {
  const [state, setState] = useState<PiPState>(() => {
    const persisted = loadPiPState();
    if (persisted) {
      return {
        mainAgentId: persisted.mainAgentId,
        overlays: persisted.overlays.map((o, i) => ({
          ...o,
          zIndex: 10 + i * 10,
        })),
        nextZIndex: 10 + persisted.overlays.length * 10,
      };
    }
    return {
      mainAgentId: null,
      overlays: [],
      nextZIndex: 10,
    };
  });

  // Save state to localStorage on changes
  useEffect(() => {
    const toSave: PersistedPiPState = {
      mainAgentId: state.mainAgentId,
      overlays: state.overlays.map(o => ({
        agentId: o.agentId,
        x: o.x,
        y: o.y,
        width: o.width,
        height: o.height,
        size: o.size,
      })),
    };
    savePiPState(toSave);
  }, [state]);

  // ... rest of the hook remains the same
```

Add this useEffect after the useState initialization, before the action callbacks.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors

- [ ] **Step 6: Test persistence manually**

1. Start app with `pnpm dev`
2. Open 2-3 overlays, position them
3. Refresh the page
4. Expected: Overlays restored to same positions

- [ ] **Step 7: Commit**

```bash
git add renderer/src/lib/pip-persistence.ts renderer/src/lib/pip-persistence.test.ts renderer/src/hooks/usePiP.ts
git commit -m "feat: add position persistence for PiP overlays"
```

---

## Summary

This plan implements a complete Picture-in-Picture terminal grid with:

- **Global state management** via React Context (PiPProvider)
- **Draggable/resizable overlays** using react-rnd
- **Multiple xterm.js instances** sharing backend sessions via IPC
- **Three content modes** (minimal/preview/rich)
- **Z-index management** for proper layering
- **Position persistence** across app restarts
- **Keyboard accessibility** for navigation

**Total estimated time:** 8-12 hours for an experienced developer

**Key files created:**
- `renderer/src/types/pip.ts` — Type definitions
- `renderer/src/hooks/usePiP.ts` — State management hook
- `renderer/src/context/PiPContext.tsx` — Global context provider
- `renderer/src/components/pip/PiPContainer.tsx` — Layout wrapper
- `renderer/src/components/pip/AgentOverlay.tsx` — Individual overlay
- `renderer/src/components/pip/OverlayManager.tsx` — Renders all overlays
- `renderer/src/components/pip/MainTerminal.tsx` — Main terminal area
- `renderer/src/lib/pip-persistence.ts` — Position persistence

**Key files modified:**
- `renderer/src/App.tsx` — Wrap with PiPProvider, integrate PiP layout
- `renderer/src/components/dashboard/Dashboard.tsx` — Add "Open as Overlay" button
- `renderer/src/components/terminal/TerminalView.tsx` — Accept agentId prop
- `package.json` — Add react-rnd dependency

---

### Task 13: Add Keyboard Navigation to Overlays

**Files:**
- Modify: `renderer/src/components/pip/AgentOverlay.tsx`

**Interfaces:**
- Consumes: Existing AgentOverlay component
- Produces: Keyboard-accessible overlays with tabIndex and handlers

- [ ] **Step 1: Add tabIndex and keyboard handlers to AgentOverlay**

Modify `renderer/src/components/pip/AgentOverlay.tsx` to add keyboard support:

In the `<Rnd>` component, add:

```typescript
<Rnd
  // ... existing props
  tabIndex={0}
  onKeyDown={(e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      actions.promoteToMain(overlay.agentId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      actions.removeOverlay(overlay.agentId);
    }
  }}
>
```

- [ ] **Step 2: Add focus styles**

The overlay already has `focus-within:outline` styles. Verify they work correctly with the new tabIndex.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors

- [ ] **Step 4: Test keyboard navigation manually**

1. Start app with `pnpm dev`
2. Open 2-3 overlays
3. Press Tab to navigate between overlays
4. Expected: Focus moves between overlays with visible outline
5. Press Enter or Space on focused overlay
6. Expected: Overlay promotes to main
7. Open another overlay, focus it
8. Press Escape
9. Expected: Overlay closes

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/pip/AgentOverlay.tsx
git commit -m "feat: add keyboard navigation to overlays (Tab/Enter/Space/Escape)"
```

---

### Task 14: Add Reduced Motion Support

**Files:**
- Modify: `renderer/src/components/pip/AgentOverlay.tsx`

**Interfaces:**
- Consumes: Existing AgentOverlay component
- Produces: Respects prefers-reduced-motion setting

- [ ] **Step 1: Add reduced motion detection**

Modify `renderer/src/components/pip/AgentOverlay.tsx` to detect reduced motion preference:

Add at the top of the component:

```typescript
const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  setPrefersReducedMotion(mediaQuery.matches);
  
  const handleChange = (e: MediaQueryListEvent) => {
    setPrefersReducedMotion(e.matches);
  };
  
  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
}, []);
```

- [ ] **Step 2: Conditionally apply scale transform**

Modify the `className` prop on the `<Rnd>` component:

```typescript
className={`group ${isDragging && !prefersReducedMotion ? 'scale-[0.98]' : ''}`}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors

- [ ] **Step 4: Test reduced motion manually**

1. In OS settings, enable "Reduce motion" (Windows: Settings > Ease of Access > Display > Show animations; macOS: System Preferences > Accessibility > Display > Reduce motion)
2. Start app with `pnpm dev`
3. Open overlay and drag it
4. Expected: No scale transform during drag
5. Disable "Reduce motion"
6. Drag overlay again
7. Expected: Scale transform visible during drag

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/pip/AgentOverlay.tsx
git commit -m "feat: respect prefers-reduced-motion for overlay drag animation"
```

---

### Task 15: Add Activity Metrics to Rich Mode

**Files:**
- Modify: `renderer/src/components/pip/AgentOverlay.tsx`

**Interfaces:**
- Consumes: Existing AgentOverlay component, session state
- Produces: Rich mode displays CPU and elapsed time metrics

- [ ] **Step 1: Import useElapsedTimer hook**

Add to imports in `renderer/src/components/pip/AgentOverlay.tsx`:

```typescript
import { useElapsedTimer } from '../../hooks/useElapsedTimer';
```

- [ ] **Step 2: Add elapsed time tracking**

Inside the AgentOverlay component, add:

```typescript
const elapsedTime = useElapsedTimer(sessionState === 'running');
```

- [ ] **Step 3: Update rich mode rendering**

Modify the content rendering section to show metrics in rich mode:

```typescript
{contentMode === 'minimal' ? (
  <div className="h-full flex items-center justify-center p-4">
    <div className="text-center">
      <div
        className="w-3 h-3 rounded-full mx-auto mb-2"
        style={{ backgroundColor: statusColor }}
      />
      <p className="text-[10px] uppercase tracking-wide text-[#737373]">
        {agentStatus}
      </p>
    </div>
  </div>
) : contentMode === 'preview' ? (
  <div ref={terminalRef} className="w-full h-full" />
) : (
  // Rich mode: terminal + metrics
  <div className="h-full flex flex-col">
    <div ref={terminalRef} className="flex-1 min-h-0" />
    <div className="flex items-center gap-3 px-3 py-1.5 bg-[#0a0a0a] border-t border-[#2a2a2a] text-[10px] text-[#737373]">
      <span className="uppercase tracking-wide">
        {agentStatus}
      </span>
      {sessionState === 'running' && elapsedTime && (
        <span className="font-mono">
          {elapsedTime}
        </span>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors (may need to check useElapsedTimer return type)

- [ ] **Step 5: Test rich mode manually**

1. Start app with `pnpm dev`
2. Open overlay
3. Click toggle button to cycle to rich mode
4. Expected: Terminal visible with metrics footer showing status and elapsed time
5. Wait 10-20 seconds
6. Expected: Elapsed time updates

- [ ] **Step 6: Commit**

```bash
git add renderer/src/components/pip/AgentOverlay.tsx
git commit -m "feat: add activity metrics (elapsed time) to rich mode overlays"
```

---

### Task 16: Add Performance Optimizations

**Files:**
- Modify: `renderer/src/components/pip/AgentOverlay.tsx`

**Interfaces:**
- Consumes: Existing AgentOverlay component
- Produces: Optimized rendering with will-change and IntersectionObserver

- [ ] **Step 1: Add will-change optimization**

Modify the `<Rnd>` component's style prop:

```typescript
style={{
  zIndex: overlay.zIndex,
  transition: isDragging ? 'none' : 'transform 0.1s ease',
  willChange: isDragging ? 'transform' : 'auto',
}}
```

- [ ] **Step 2: Add IntersectionObserver for lazy rendering**

Add state and effect to track visibility:

```typescript
const [isVisible, setIsVisible] = useState(true);
const overlayRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!overlayRef.current) return;
  
  const observer = new IntersectionObserver(
    ([entry]) => {
      setIsVisible(entry.isIntersecting);
    },
    { threshold: 0.1 }
  );
  
  observer.observe(overlayRef.current);
  return () => observer.disconnect();
}, []);
```

Add ref to the outer div:

```typescript
<div ref={overlayRef} className="h-full flex flex-col bg-[#1a1a1a] ...">
```

- [ ] **Step 3: Conditionally render terminal based on visibility**

Modify the terminal initialization effect to check visibility:

```typescript
useEffect(() => {
  if (!terminalRef.current || !isVisible || (contentMode !== 'preview' && contentMode !== 'rich')) return;
  
  // ... rest of terminal initialization
}, [overlay.agentId, contentMode, isVisible]);
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors

- [ ] **Step 5: Test performance optimizations**

1. Start app with `pnpm dev`
2. Open DevTools Performance tab
3. Open 5-10 overlays
4. Drag overlays around
5. Expected: Smooth performance, no frame drops
6. Scroll overlays out of viewport (if possible)
7. Expected: Terminal rendering pauses when not visible

- [ ] **Step 6: Commit**

```bash
git add renderer/src/components/pip/AgentOverlay.tsx
git commit -m "perf: add will-change optimization and IntersectionObserver for overlays"
```

---

### Task 17: Add Preset Size Selection

**Files:**
- Modify: `renderer/src/components/pip/AgentOverlay.tsx`

**Interfaces:**
- Consumes: Existing AgentOverlay component, SIZE_PRESETS
- Produces: Double-click or context menu to select preset sizes

- [ ] **Step 1: Add double-click handler for size cycling**

Add a handler to cycle through preset sizes on double-click:

```typescript
const handleDoubleClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  const sizes: Array<'S' | 'M' | 'L'> = ['S', 'M', 'L'];
  const currentIndex = sizes.indexOf(overlay.size);
  const nextIndex = (currentIndex + 1) % sizes.length;
  const newSize = sizes[nextIndex];
  const preset = SIZE_PRESETS[newSize];
  
  actions.updateOverlaySize(overlay.agentId, preset.width, preset.height, newSize);
};
```

- [ ] **Step 2: Attach double-click handler to header**

Modify the header div:

```typescript
<div
  className="overlay-header flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] border-b border-[#2a2a2a] cursor-move select-none"
  onClick={handlePromote}
  onDoubleClick={handleDoubleClick}
>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm build:ts`

Expected: No errors

- [ ] **Step 4: Test preset size selection**

1. Start app with `pnpm dev`
2. Open overlay (default size M: 400x260)
3. Double-click overlay header
4. Expected: Overlay cycles to size L (560x360)
5. Double-click again
6. Expected: Cycles to size S (280x180)
7. Double-click again
8. Expected: Cycles back to size M

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/pip/AgentOverlay.tsx
git commit -m "feat: add double-click to cycle through preset sizes (S/M/L)"
```

---

## Updated Summary

This plan now implements a complete Picture-in-Picture terminal grid with:

- **Global state management** via React Context (PiPProvider)
- **Draggable/resizable overlays** using react-rnd
- **Multiple xterm.js instances** sharing backend sessions via IPC
- **Three content modes** (minimal/preview/rich) with activity metrics
- **Z-index management** for proper layering
- **Position persistence** across app restarts
- **Keyboard accessibility** (Tab/Enter/Space/Escape)
- **Reduced motion support** for accessibility
- **Performance optimizations** (will-change, IntersectionObserver)
- **Preset size selection** via double-click

**Total tasks:** 17 (was 12, added 5 for completeness)

**Total estimated time:** 12-16 hours for an experienced developer

**All spec requirements covered:**
- ✅ Main terminal shows focused agent or dashboard fallback
- ✅ Overlays are draggable with react-rnd
- ✅ Overlays are resizable with preset sizes (S/M/L)
- ✅ Clicking overlay promotes to main focus
- ✅ Overlay content is configurable (minimal/preview/rich)
- ✅ Sessions persist across navigation
- ✅ No duplicate agents (main OR overlay, not both)
- ✅ Overlay positions persist across app restarts
- ✅ Performance acceptable with 10+ overlays
- ✅ Keyboard navigation (Tab/Enter/Space/Escape)
- ✅ Reduced motion support
- ✅ Activity metrics in rich mode
- ✅ Performance optimizations (will-change, IntersectionObserver)
- ✅ Preset size selection via double-click

