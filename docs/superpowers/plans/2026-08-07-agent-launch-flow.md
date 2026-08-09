# Agent Launch Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fire-and-forget agent launch with PTY-backed sessions, add terminal panel to dashboard, and remove legacy `launchAgent` IPC.

**Architecture:** Dashboard uses Variant F layout (Terminal Center, Plan Dock). Launch calls `session.create()` instead of `launchAgent`. Terminal panel binds to `selectedAgentId`. AgentConfig gains `cwd` field.

**Tech Stack:** Electron IPC, node-pty, React, TypeScript, xterm.js

## Global Constraints

- Package manager: **pnpm**
- `cwd` defaults to `os.homedir()` when not set
- No new dependencies — reuse existing `node-pty`, `xterm.js`, `SessionManager`
- Remove all references to legacy `launchAgent` — clean cutover
- Follow existing patterns: `session.create` returns `{ pid, state } | { error }`

---

### Task 1: Add `cwd` to AgentConfig Type

**Files:**
- Modify: `src/shared/types.ts`
- Test: `src/main/agent-scanner.test.ts`

**Interfaces:**
- Consumes: Nothing
- Produces: `AgentConfig` type with `cwd: string` field

- [ ] **Step 1: Update AgentConfig type**

In `src/shared/types.ts`, add `cwd` field:

```typescript
export type AgentConfig = {
  id: string;
  name: string;
  icon: string;
  path: string;
  cwd: string;  // NEW
  source: 'detected' | 'manual';
  fingerprint?: string;
  pid?: number;
};
```

- [ ] **Step 2: Update scanner to set default cwd**

In `src/main/agent-scanner.ts`, line ~208, add `cwd` when creating agents:

```typescript
agents.push({
  id: known.id,
  name: known.name,
  icon: known.icon,
  path: foundPath,
  cwd: process.env.HOME || process.env.USERPROFILE || '',  // NEW
  source: 'detected',
  fingerprint: fingerprintAgent(foundPath),
});
```

- [ ] **Step 3: Update scanner test**

In `src/main/agent-scanner.test.ts`, add `cwd` to expected agent objects in test assertions.

- [ ] **Step 4: Run tests**

Run: `pnpm exec vitest run src/main/agent-scanner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/types.ts src/main/agent-scanner.ts src/main/agent-scanner.test.ts
git commit -m "feat: add cwd field to AgentConfig with default from env"
```

---

### Task 2: Update Manual Add Screen to Set cwd

**Files:**
- Modify: `renderer/src/components/onboarding/ManualAddScreen.tsx`

**Interfaces:**
- Consumes: `AgentConfig` type (now has `cwd`)
- Produces: Agent objects with `cwd` set

- [ ] **Step 1: Update handleAdd in ManualAddScreen**

In `renderer/src/components/onboarding/ManualAddScreen.tsx`, find the `handleAdd` callback (~line 106). Add `cwd` to the agent object:

```typescript
const agent: AgentConfig = {
  id: identificationResult?.knownAgentId || `manual-${Date.now()}`,
  name: identificationResult?.suggestedName || path.split('/').pop() || 'Unknown',
  icon: identificationResult?.suggestedIcon || 'generic',
  path,
  cwd: process.env.HOME || process.env.USERPROFILE || '',  // NEW
  source: 'manual',
};
addAgent(agent);
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/onboarding/ManualAddScreen.tsx
git commit -m "feat: set cwd when adding agents manually"
```

---

### Task 3: Replace launchAgent with session.create in Dashboard

**Files:**
- Modify: `renderer/src/components/dashboard/Dashboard.tsx`
- Test: `renderer/src/App.test.tsx`

**Interfaces:**
- Consumes: `window.api.session.create(agentId, cwd)`, `sessionContext.registerSession()`
- Produces: Working launch flow via sessions

- [ ] **Step 1: Update handleLaunch**

In `renderer/src/components/dashboard/Dashboard.tsx`, replace `handleLaunch` (~line 94):

```typescript
const handleLaunch = async (agentId: string) => {
  const agent = availableAgents.find(a => a.id === agentId);
  if (!agent) return;

  try {
    const result = await window.api.session.create(agentId, agent.cwd);
    if ('error' in result) {
      toast.error(`Failed to start ${agentId}: ${result.error}`);
      return;
    }
    ctx.registerSession(agentId, result.pid, agent.cwd);
    setSelectedAgentId(agentId);
  } catch (error) {
    console.error('Failed to launch agent:', error);
  }
};
```

Note: `ctx` is `useSessionContext()` — already imported as `const ctx = useSessionContext();` on line 33.

- [ ] **Step 2: Add toast import if missing**

Check if `toast` from `sonner` is imported. If not, add:

```typescript
import { toast } from 'sonner';
```

- [ ] **Step 3: Run tests**

Run: `pnpm exec vitest run renderer/src/App.test.tsx`
Expected: PASS (may need to update mocks if `launchAgent` was mocked)

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/dashboard/Dashboard.tsx
git commit -m "feat: replace launchAgent with session.create in Dashboard"
```

---

### Task 4: Create TerminalPanel Component

**Files:**
- Create: `renderer/src/components/dashboard/TerminalPanel.tsx`
- Test: `renderer/src/components/dashboard/__tests__/TerminalPanel.test.tsx`

**Interfaces:**
- Consumes: `selectedAgentId` from Dashboard, `TerminalView` component
- Produces: Terminal panel with empty state and active state

- [ ] **Step 1: Write failing test**

Create `renderer/src/components/dashboard/__tests__/TerminalPanel.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { TerminalPanel } from '../TerminalPanel';

describe('TerminalPanel', () => {
  it('shows empty state when no agent selected', () => {
    render(<TerminalPanel agentId={null} />);
    expect(screen.getByText('No agent selected')).toBeInTheDocument();
  });

  it('renders TerminalView when agentId is provided', () => {
    render(<TerminalPanel agentId="claude-code" />);
    expect(screen.queryByText('No agent selected')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run renderer/src/components/dashboard/__tests__/TerminalPanel.test.tsx`
Expected: FAIL — "TerminalPanel is not defined"

- [ ] **Step 3: Create TerminalPanel component**

Create `renderer/src/components/dashboard/TerminalPanel.tsx`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run renderer/src/components/dashboard/__tests__/TerminalPanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/dashboard/TerminalPanel.tsx renderer/src/components/dashboard/__tests__/TerminalPanel.test.tsx
git commit -m "feat: add TerminalPanel component with empty and active states"
```

---

### Task 5: Update Dashboard Layout to Variant F

**Files:**
- Modify: `renderer/src/components/dashboard/Dashboard.tsx`

**Interfaces:**
- Consumes: `TerminalPanel` component, `selectedAgentId` state
- Produces: New three-column layout with terminal center

- [ ] **Step 1: Import TerminalPanel**

Add to imports in `Dashboard.tsx`:

```typescript
import { TerminalPanel } from './TerminalPanel';
```

- [ ] **Step 2: Update layout JSX**

Replace the content area div (~line 166-184) with Variant F layout:

```typescript
<div className="flex-1 flex overflow-hidden">
  <FleetPanel
    runningSessions={runningSessions}
    availableAgents={availableAgents}
    onFocus={handleAgentClick}
    onLaunch={handleLaunch}
    onOpenAsOverlay={handleOpenAsOverlay}
    onAddAgent={() => setAddAgentOpen(true)}
  />

  <TerminalPanel agentId={selectedAgentId} />

  <ActivityFeed
    events={events}
    isPaused={isPaused}
    hasAgents={hasAgents}
    onAddAgent={() => setAddAgentOpen(true)}
  />
</div>

<PlanPanel steps={mockSteps} progress={hasAgents ? progress : 0} />
```

Key change: `PlanPanel` moves from inside the flex row to below it (docked at bottom). `TerminalPanel` replaces `PlanPanel` in the center column.

- [ ] **Step 3: Run dev server to verify layout**

Run: `pnpm dev`
Expected: Dashboard shows FleetPanel | TerminalPanel | ActivityFeed with PlanPanel docked below

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/dashboard/Dashboard.tsx
git commit -m "feat: update dashboard layout to Variant F with terminal center"
```

---

### Task 6: Remove Legacy launchAgent IPC

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload.ts`
- Modify: `renderer/src/types/global.d.ts`

**Interfaces:**
- Consumes: Nothing (removal only)
- Produces: Clean API surface with no `launchAgent`

- [ ] **Step 1: Remove IPC handler**

In `src/main/ipc-handlers.ts`, delete the `launch-agent` handler (lines 38-52):

```typescript
// DELETE these lines:
ipcMain.handle('launch-agent', async (_event, id: string) => {
  const store = await loadAgents();
  const agent = store.agents.find(a => a.id === id);
  if (!agent) {
    throw new Error(`Agent ${id} not found`);
  }

  const child = spawn(agent.path, [], {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
  return { pid: child.pid };
});
```

Also remove the `spawn` import if no longer used:

```typescript
// DELETE: import { spawn } from 'child_process';
```

- [ ] **Step 2: Remove preload binding**

In `src/preload.ts`, delete line 28:

```typescript
// DELETE: launchAgent: (id: string) => ipcRenderer.invoke('launch-agent', id),
```

- [ ] **Step 3: Remove type declaration**

In `renderer/src/types/global.d.ts`, delete line 89:

```typescript
// DELETE: launchAgent: (id: string) => Promise<{ pid: number }>;
```

- [ ] **Step 4: Run TypeScript check**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload.ts renderer/src/types/global.d.ts
git commit -m "refactor: remove legacy launchAgent IPC handler and bindings"
```

---

### Task 7: Verify End-to-End Flow


**Files:**
- No file changes — verification only

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

- [ ] **Step 2: Verify launch flow**

1. App should open to dashboard
2. Available agents should show in FleetPanel
3. Click "Launch" on an agent
4. Terminal panel should show live output
5. Agent should appear in "Running" section
6. Click another agent card → terminal switches
7. Close/kill agent → toast notification appears

- [ ] **Step 3: Verify no launchAgent references**

Run: `grep -r "launchAgent" src/ renderer/src/`
Expected: No results (except in test files if they mock it)

- [ ] **Step 4: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 5: Final commit if any fixes needed**
