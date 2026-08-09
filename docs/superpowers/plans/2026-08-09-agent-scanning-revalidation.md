# Agent Scanning & Re-validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract agent scanning into a unified `useAgentScanner` hook with four modes, enabling reusable scanning logic across onboarding, dashboard, and settings. Add drift detection on app startup with passive notifications.

**Architecture:** Create a parameterized React hook that wraps existing `window.api.scanAgents()` and adds client-side logic for diffing, validation, and drift reporting. Dashboard and settings both use this hook. Drift detection runs silently on app start and shows a toast if issues are found.

**Tech Stack:** React 19, TypeScript, Electron IPC, Vitest

## Global Constraints

- Use existing IPC surface: `scan-agents`, `validate-agent`, `identify-agent`, `get-agents`, `save-agents`
- Add one new IPC handler: `find-agent-in-path` for moved-agent detection
- No changes to `agents.json` or `projects.json` schema
- All new types go in `src/shared/types.ts`
- Ignored drifts stored in settings, not agents.json
- Passive notifications only — never block the dashboard

---

## File Structure

**Files to create:**
- `renderer/src/hooks/useAgentScanner.ts` — unified scanning hook
- `renderer/src/components/dashboard/QuickScanModal.tsx` — modal for quick-scan
- `renderer/src/components/dashboard/DriftModal.tsx` — modal for drift review
- `renderer/src/hooks/useAgentScanner.test.ts` — unit tests for hook
- `renderer/src/components/dashboard/QuickScanModal.test.tsx` — integration tests
- `renderer/src/components/dashboard/DriftModal.test.tsx` — integration tests

**Files to modify:**
- `src/shared/types.ts` — add new types (AgentValidation, DriftReport, IgnoredDrift, AgentValidationStatus)
- `src/main/ipc-handlers.ts` — add `find-agent-in-path` handler
- `src/preload.ts` — expose `findAgentInPath` on `window.api`
- `renderer/src/types/settings.ts` — add `ignoredDrifts` field
- `renderer/src/components/dashboard/FleetPanel.tsx` — add "Scan for Agents" button
- `renderer/src/components/settings/AgentsSettings.tsx` — integrate hook, add status indicators
- `renderer/src/App.tsx` — add background scan on mount

---

### Task 1: Add New Types

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `renderer/src/types/settings.ts`

**Interfaces:**
- Produces: `AgentValidationStatus`, `AgentValidation`, `DriftReport`, `IgnoredDrift` types

- [ ] **Step 1: Add types to shared/types.ts**

Open `src/shared/types.ts` and add at the end:

```typescript
export type AgentValidationStatus = 'valid' | 'moved' | 'missing';

export interface AgentValidation {
  agent: AgentConfig;
  status: AgentValidationStatus;
  newPath?: string;
}

export interface DriftReport {
  newAgents: AgentConfig[];
  missingAgents: AgentConfig[];
  movedAgents: AgentValidation[];
}

export interface IgnoredDrift {
  agentId: string;
  type: 'missing' | 'moved';
  fingerprint: string;
  ignoredAt: string;
}
```

- [ ] **Step 2: Add ignoredDrifts to settings type**

Open `renderer/src/types/settings.ts` and add to the `AppSettings` interface:

```typescript
ignoredDrifts: Record<string, IgnoredDrift>;
```

Import `IgnoredDrift` from `../../src/shared/types`.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts renderer/src/types/settings.ts
git commit -m "feat: add agent validation and drift types"
```

---

### Task 2: Add find-agent-in-path IPC Handler

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload.ts`

**Interfaces:**
- Consumes: `findInPath` from `agent-scanner.ts`
- Produces: `window.api.findAgentInPath(binary: string): Promise<{ found: boolean; path?: string }>`

- [ ] **Step 1: Add IPC handler**

Open `src/main/ipc-handlers.ts` and add inside `registerIpcHandlers()`:

```typescript
ipcMain.handle('find-agent-in-path', async (_event, binary: string) => {
  const { findInPath } = await import('./agent-scanner');
  const foundPath = await findInPath(binary);
  return { found: foundPath !== null, path: foundPath || undefined };
});
```

- [ ] **Step 2: Expose in preload**

Open `src/preload.ts` and add to the `window.api` object:

```typescript
findAgentInPath: (binary: string) => ipcRenderer.invoke('find-agent-in-path', binary),
```

- [ ] **Step 3: Update global.d.ts**

Open `renderer/src/types/global.d.ts` and add to the `Window['api']` interface:

```typescript
findAgentInPath: (binary: string) => Promise<{ found: boolean; path?: string }>;
```

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload.ts renderer/src/types/global.d.ts
git commit -m "feat: add find-agent-in-path IPC handler"
```

---

### Task 3: Create useAgentScanner Hook

**Files:**
- Create: `renderer/src/hooks/useAgentScanner.ts`
- Create: `renderer/src/hooks/useAgentScanner.test.ts`

**Interfaces:**
- Consumes: `window.api.scanAgents`, `window.api.validateAgent`, `window.api.findAgentInPath`
- Produces: `useAgentScanner(options): { scan, isScanning, error, result }`

- [ ] **Step 1: Write failing test for initial mode**

Create `renderer/src/hooks/useAgentScanner.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAgentScanner } from './useAgentScanner';

describe('useAgentScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'api', {
      value: {
        scanAgents: vi.fn(),
        validateAgent: vi.fn(),
        findAgentInPath: vi.fn(),
      },
      writable: true,
    });
  });

  it('initial mode returns all scanned agents', async () => {
    const mockAgents = [
      { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', source: 'detected' as const },
    ];
    window.api.scanAgents = vi.fn().mockResolvedValue({
      agents: mockAgents,
      warnings: [],
      locationsScanned: 5,
      duration: 100,
    });

    const { result } = renderHook(() => useAgentScanner({ mode: 'initial' }));

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.result?.agents).toEqual(mockAgents);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/hooks/useAgentScanner.test.ts`
Expected: FAIL with "useAgentScanner is not a function" or similar

- [ ] **Step 3: Implement hook**

Create `renderer/src/hooks/useAgentScanner.ts`:

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import type { AgentConfig, AgentValidation, DriftReport } from '../../../src/shared/types';

export interface UseAgentScannerOptions {
  mode: 'initial' | 'incremental' | 'revalidate' | 'background';
  existingAgents?: AgentConfig[];
  autoStart?: boolean;
  onComplete?: (result: ScanResult) => void;
  onError?: (error: Error) => void;
}

export interface ScanResult {
  agents: AgentConfig[];
  newAgents?: AgentConfig[];
  validations?: AgentValidation[];
  drift?: DriftReport;
  scanDuration: number;
  locationsScanned: number;
}

export function useAgentScanner(options: UseAgentScannerOptions) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const scan = useCallback(async () => {
    // Cancel any existing scan
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsScanning(true);
    setError(null);

    try {
      const scanResponse = await window.api.scanAgents();
      
      // Check if scan was cancelled
      if (controller.signal.aborted) {
        return;
      }
      
      const agents = scanResponse.agents;

      let newAgents: AgentConfig[] | undefined;
      let validations: AgentValidation[] | undefined;
      let drift: DriftReport | undefined;

      if (options.mode === 'incremental' && options.existingAgents) {
        const existingIds = new Set(options.existingAgents.map(a => a.id));
        newAgents = agents.filter(a => !existingIds.has(a.id));
      }

      if (options.mode === 'revalidate' && options.existingAgents) {
        validations = await Promise.all(
          options.existingAgents.map(async (agent) => {
            const validation = await window.api.validateAgent(agent.path);
            if (validation.valid) {
              return { agent, status: 'valid' as const };
            }
            const found = await window.api.findAgentInPath(agent.name.toLowerCase());
            if (found.found && found.path) {
              return { agent, status: 'moved' as const, newPath: found.path };
            }
            return { agent, status: 'missing' as const };
          })
        );

      if (controller.signal.aborted) return;
      if (options.mode === 'background' && options.existingAgents) {
        const existingIds = new Set(options.existingAgents.map(a => a.id));
        const scannedIds = new Set(agents.map(a => a.id));

        const newAgentsList = agents.filter(a => !existingIds.has(a.id));
        const missingAgentsList = options.existingAgents.filter(a => !scannedIds.has(a.id));

        const movedAgents: AgentValidation[] = [];
        const trulyMissing: AgentConfig[] = [];

        for (const agent of missingAgentsList) {
          const found = await window.api.findAgentInPath(agent.name.toLowerCase());
          if (found.found && found.path) {
            movedAgents.push({ agent, status: 'moved', newPath: found.path });
          } else {
            trulyMissing.push(agent);
          }
        }

        drift = {
          newAgents: newAgentsList,
          missingAgents: trulyMissing,
          movedAgents,
        };
      }

      if (controller.signal.aborted) return;

      const scanResult: ScanResult = {
        agents,
        newAgents,
        validations,
        drift,
        scanDuration: scanResponse.duration,
        locationsScanned: scanResponse.locationsScanned,
      };

      setResult(scanResult);
      options.onComplete?.(scanResult);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Scan failed');
      setError(error);
      options.onError?.(error);
    } finally {
      setIsScanning(false);
    }
  }, [options]);

  return { scan, isScanning, error, result };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/hooks/useAgentScanner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/hooks/useAgentScanner.ts renderer/src/hooks/useAgentScanner.test.ts
git commit -m "feat: add useAgentScanner hook with initial mode"
```

---

### Task 4: Add incremental Mode Tests

**Files:**
- Modify: `renderer/src/hooks/useAgentScanner.test.ts`

- [ ] **Step 1: Add test for incremental mode**

Add to `renderer/src/hooks/useAgentScanner.test.ts`:

```typescript
it('incremental mode computes correct diff', async () => {
  const existingAgents = [
    { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', source: 'detected' as const },
  ];
  const scannedAgents = [
    { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', source: 'detected' as const },
    { id: 'aider', name: 'Aider', path: '/usr/bin/aider', icon: 'aider', source: 'detected' as const },
  ];
  window.api.scanAgents = vi.fn().mockResolvedValue({
    agents: scannedAgents,
    warnings: [],
    locationsScanned: 5,
    duration: 100,
  });

  const { result } = renderHook(() => useAgentScanner({ mode: 'incremental', existingAgents }));

  await act(async () => {
    await result.current.scan();
  });

  expect(result.current.result?.newAgents).toHaveLength(1);
  expect(result.current.result?.newAgents?.[0].id).toBe('aider');
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm test renderer/src/hooks/useAgentScanner.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add renderer/src/hooks/useAgentScanner.test.ts
git commit -m "test: add incremental mode test for useAgentScanner"
```

---

### Task 5: Add revalidate Mode Tests

**Files:**
- Modify: `renderer/src/hooks/useAgentScanner.test.ts`

- [ ] **Step 1: Add test for revalidate mode**

Add to `renderer/src/hooks/useAgentScanner.test.ts`:

```typescript
it('revalidate mode checks each agent', async () => {
  const existingAgents = [
    { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', source: 'detected' as const },
    { id: 'aider', name: 'Aider', path: '/usr/bin/aider', icon: 'aider', source: 'detected' as const },
  ];
  window.api.scanAgents = vi.fn().mockResolvedValue({ agents: [], warnings: [], locationsScanned: 5, duration: 100 });
  window.api.validateAgent = vi.fn()
    .mockResolvedValueOnce({ valid: true, executable: true, isDirectory: false })
    .mockResolvedValueOnce({ valid: false, executable: false, isDirectory: false, error: 'File not found' });
  window.api.findAgentInPath = vi.fn().mockResolvedValue({ found: false });

  const { result } = renderHook(() => useAgentScanner({ mode: 'revalidate', existingAgents }));

  await act(async () => {
    await result.current.scan();
  });

  expect(result.current.result?.validations).toHaveLength(2);
  expect(result.current.result?.validations?.[0].status).toBe('valid');
  expect(result.current.result?.validations?.[1].status).toBe('missing');
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm test renderer/src/hooks/useAgentScanner.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add renderer/src/hooks/useAgentScanner.test.ts
git commit -m "test: add revalidate mode test for useAgentScanner"
```

---

### Task 6: Add background Mode Tests

**Files:**
- Modify: `renderer/src/hooks/useAgentScanner.test.ts`

- [ ] **Step 1: Add test for background mode**

Add to `renderer/src/hooks/useAgentScanner.test.ts`:

```typescript
it('background mode produces drift report', async () => {
  const existingAgents = [
    { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', source: 'detected' as const },
    { id: 'aider', name: 'Aider', path: '/usr/bin/aider', icon: 'aider', source: 'detected' as const },
  ];
  const scannedAgents = [
    { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', source: 'detected' as const },
    { id: 'cursor', name: 'Cursor', path: '/usr/bin/cursor', icon: 'cursor', source: 'detected' as const },
  ];
  window.api.scanAgents = vi.fn().mockResolvedValue({
    agents: scannedAgents,
    warnings: [],
    locationsScanned: 5,
    duration: 100,
  });
  window.api.findAgentInPath = vi.fn().mockResolvedValue({ found: false });

  const { result } = renderHook(() => useAgentScanner({ mode: 'background', existingAgents }));

  await act(async () => {
    await result.current.scan();
  });

  expect(result.current.result?.drift?.newAgents).toHaveLength(1);
  expect(result.current.result?.drift?.newAgents?.[0].id).toBe('cursor');
  expect(result.current.result?.drift?.missingAgents).toHaveLength(1);
  expect(result.current.result?.drift?.missingAgents?.[0].id).toBe('aider');
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm test renderer/src/hooks/useAgentScanner.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add renderer/src/hooks/useAgentScanner.test.ts
git commit -m "test: add background mode test for useAgentScanner"
```

---

### Task 7: Create QuickScanModal Component

**Files:**
- Create: `renderer/src/components/dashboard/QuickScanModal.tsx`
- Create: `renderer/src/components/dashboard/QuickScanModal.test.tsx`

- [ ] **Step 1: Write failing test**

Create `renderer/src/components/dashboard/QuickScanModal.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickScanModal } from './QuickScanModal';

describe('QuickScanModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'api', {
      value: {
        scanAgents: vi.fn().mockResolvedValue({ agents: [], warnings: [], locationsScanned: 0, duration: 0 }),
        getAgents: vi.fn().mockResolvedValue([]),
        saveAgents: vi.fn(),
        validateAgent: vi.fn(),
        findAgentInPath: vi.fn(),
      },
      writable: true,
    });
  });

  it('shows scanning state', () => {
    render(<QuickScanModal open={true} onOpenChange={() => {}} />);
    expect(screen.getByText(/scanning for agents/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/components/dashboard/QuickScanModal.test.tsx`
Expected: FAIL with "QuickScanModal is not defined"

- [ ] **Step 3: Implement component**

Create `renderer/src/components/dashboard/QuickScanModal.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Spinner } from '../ui/Spinner';
import { useAgentScanner } from '../../hooks/useAgentScanner';
import type { AgentConfig } from '../../../src/shared/types';

interface QuickScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickScanModal({ open, onOpenChange }: QuickScanModalProps) {
  const [existingAgents, setExistingAgents] = useState<AgentConfig[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { scan, isScanning, result, error } = useAgentScanner({
    mode: 'incremental',
    existingAgents,
  });

  useEffect(() => {
    if (open) {
      window.api.getAgents().then(setExistingAgents);
    }
  }, [open]);

  useEffect(() => {
    if (open && existingAgents.length >= 0) {
      scan();
    }
  }, [open, existingAgents]);

  const handleAddSelected = async () => {
    const newAgents = result?.newAgents?.filter(a => selectedIds.has(a.id)) || [];
    const allAgents = [...existingAgents, ...newAgents];
    await window.api.saveAgents(allAgents);
    onOpenChange(false);
  };

  const toggleAgent = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan for Agents</DialogTitle>
        </DialogHeader>

        {error ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-destructive">Scan failed: {error.message}</p>
            <Button variant="outline" size="sm" onClick={() => scan()}>Retry</Button>
          </div>
        ) : isScanning ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Spinner size={40} />
            <p>Scanning for agents...</p>
          </div>
        ) : !result?.newAgents?.length ? (
          <div className="py-8 text-center">
            <p>No new agents detected</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p>{result.newAgents.length} new agent(s) detected</p>
            <div className="space-y-2">
              {result.newAgents.map(agent => (
                <label key={agent.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(agent.id)}
                    onChange={() => toggleAgent(agent.id)}
                  />
                  {agent.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAddSelected} disabled={!selectedIds.size}>Add Selected</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/components/dashboard/QuickScanModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/dashboard/QuickScanModal.tsx renderer/src/components/dashboard/QuickScanModal.test.tsx
git commit -m "feat: add QuickScanModal component"
```

---

### Task 8: Integrate QuickScanModal into FleetPanel

**Files:**
- Modify: `renderer/src/components/dashboard/FleetPanel.tsx`

- [ ] **Step 1: Add scan button and modal state**

Open `renderer/src/components/dashboard/FleetPanel.tsx` and add:

```typescript
import { useState } from 'react';
import { QuickScanModal } from './QuickScanModal';

// Inside FleetPanel component, add state:
const [showQuickScan, setShowQuickScan] = useState(false);

// Add button before "Add Agent" button:
<Button onClick={() => setShowQuickScan(true)} variant="outline" size="sm">
  Scan for Agents
</Button>

// Add modal at the end of the component's return:
<QuickScanModal open={showQuickScan} onOpenChange={setShowQuickScan} />
```

- [ ] **Step 2: Run tests to verify nothing broke**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/FleetPanel.tsx
git commit -m "feat: add Scan for Agents button to FleetPanel"
```

---

### Task 9: Integrate Hook into AgentsSettings

**Files:**
- Modify: `renderer/src/components/settings/AgentsSettings.tsx`

- [ ] **Step 1: Add revalidate and incremental scan**

Open `renderer/src/components/settings/AgentsSettings.tsx` and add:

```typescript
import { useAgentScanner } from '../../hooks/useAgentScanner';

// Inside AgentsSettings component:
const { scan: revalidate, result: validationResult, isScanning: isValidating } =
  useAgentScanner({ mode: 'revalidate', existingAgents: agents });

const { scan: incrementalScan, result: scanResult, isScanning: isScaning } =
  useAgentScanner({ mode: 'incremental', existingAgents: agents });

// Add "Re-validate All" button next to "Scan for Agents":
<Button onClick={() => revalidate()} disabled={isValidating}>
  {isValidating ? 'Validating...' : 'Re-validate All'}
</Button>

// Add status indicators to agent list:
const getStatus = (agentId: string) => {
  const validation = validationResult?.validations?.find(v => v.agent.id === agentId);
  if (!validation) return null;
  return validation.status;
};

// In the agent list rendering, add status icon:
const status = getStatus(agent.id);
const statusIcon = status === 'valid' ? '🟢' : status === 'moved' ? '🟡' : status === 'missing' ? '🔴' : null;
```

- [ ] **Step 2: Run tests**

Run: `pnpm test renderer/src/components/settings/AgentsSettings.test.tsx`
Expected: PASS (or update tests if needed)

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/settings/AgentsSettings.tsx
git commit -m "feat: integrate useAgentScanner into AgentsSettings"
```

---

### Task 10: Add Background Scan to App.tsx

**Files:**
- Modify: `renderer/src/App.tsx`

- [ ] **Step 1: Add background scan on mount**

Open `renderer/src/App.tsx` and add:

```typescript
import { useAgentScanner } from './hooks/useAgentScanner';
import { toast } from 'sonner';

// Inside App component, after agents are loaded:
const { result: driftResult } = useAgentScanner({
  mode: 'background',
  existingAgents: agents,
  autoStart: true,
});

useEffect(() => {
  if (driftResult?.drift) {
    const { newAgents, missingAgents, movedAgents } = driftResult.drift;
    const total = newAgents.length + missingAgents.length + movedAgents.length;
    if (total > 0) {
      toast(`${total} agent(s) need attention`, {
        action: {
          label: 'Review',
          onClick: () => {
            // Open drift modal (to be implemented in Task 11)
          },
        },
      });
    }
  }
}, [driftResult]);
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/App.tsx
git commit -m "feat: add background drift detection on app start"
```

---

### Task 11: Create DriftModal Component

**Files:**
- Create: `renderer/src/components/dashboard/DriftModal.tsx`
- Create: `renderer/src/components/dashboard/DriftModal.test.tsx`

- [ ] **Step 1: Write failing test**

Create `renderer/src/components/dashboard/DriftModal.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DriftModal } from './DriftModal';

describe('DriftModal', () => {
  it('shows drift summary', () => {
    const drift = {
      newAgents: [],
      missingAgents: [{ id: 'aider', name: 'Aider', path: '/usr/bin/aider', icon: 'aider', source: 'detected' as const }],
      movedAgents: [],
    };
    render(<DriftModal open={true} onOpenChange={() => {}} drift={drift} />);
    expect(screen.getByText(/1 agent missing/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/components/dashboard/DriftModal.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement component**

Create `renderer/src/components/dashboard/DriftModal.tsx`:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import type { DriftReport } from '../../../src/shared/types';

interface DriftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drift: DriftReport;
}

export function DriftModal({ open, onOpenChange, drift }: DriftModalProps) {
  const total = drift.newAgents.length + drift.missingAgents.length + drift.movedAgents.length;

  return (
    <Dialog open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Agent Configuration Drift</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {drift.missingAgents.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">⚠ {drift.missingAgents.length} agent(s) missing</h3>
              {drift.missingAgents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between py-2">
                  <span>{agent.name} ({agent.path})</span>
                  <Button size="sm" variant="outline" onClick={() => window.api.saveAgents([])}>Remove</Button>
                </div>
              ))}
            </div>
          )}

          {drift.movedAgents.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">🔄 {drift.movedAgents.length} agent(s) moved</h3>
              {drift.movedAgents.map(v => (
                <div key={v.agent.id} className="flex items-center justify-between py-2">
                  <span>{v.agent.name} → {v.newPath}</span>
                  <Button size="sm" variant="outline">Update Path</Button>
                </div>
              ))}
            </div>
          )}

          {drift.newAgents.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">✨ {drift.newAgents.length} new agent(s) detected</h3>
              {drift.newAgents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between py-2">
                  <span>{agent.name} ({agent.path})</span>
                  <Button size="sm" variant="outline">Add</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/components/dashboard/DriftModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/dashboard/DriftModal.tsx renderer/src/components/dashboard/DriftModal.test.tsx
git commit -m "feat: add DriftModal component"
```

---

### Task 12: Wire DriftModal into App.tsx

**Files:**
- Modify: `renderer/src/App.tsx`

- [ ] **Step 1: Add DriftModal state and render**

Open `renderer/src/App.tsx` and add:

```typescript
import { DriftModal } from './components/dashboard/DriftModal';

// Add state:
const [showDriftModal, setShowDriftModal] = useState(false);

// Update the toast action to open the modal:
toast(`${total} agent(s) need attention`, {
  action: {
    label: 'Review',
    onClick: () => setShowDriftModal(true),
  },
});

// Add modal render:
{driftResult?.drift && (
  <DriftModal
    open={showDriftModal}
    onOpenChange={setShowDriftModal}
    drift={driftResult.drift}
  />
)}
```

- [ ] **Step 2: Run tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add renderer/src/App.tsx
git commit -m "feat: wire DriftModal into App.tsx"
```

---

### Task 13: Final Integration Test and Smoke Test

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 2: Run dev server and smoke test**

Run: `pnpm dev`

Verify:
1. Dashboard loads with "Scan for Agents" button in FleetPanel
2. Click "Scan for Agents" → modal opens → shows scan results
3. Settings → Agents → "Re-validate All" → status indicators appear
4. App restart → if drift exists, toast appears

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete agent scanning & re-validation (Sub-project A)"
```