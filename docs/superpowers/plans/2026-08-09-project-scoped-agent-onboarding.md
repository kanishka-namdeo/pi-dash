# Project-scoped Agent Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable project-scoped agent selection during project setup. When users select agents not in the global config, prompt them to choose: add to global config or use for this project only.

**Architecture:** Extend the Project type with `projectAgents: AgentConfig[]` for project-specific agents. During project setup, detect new agents and show an AgentScopeDialog. ConfigureAgentsDialog enhanced to show both global and project-scoped agents with promote capability.

**Tech Stack:** React 19, TypeScript, Electron IPC, Vitest

## Global Constraints

- No new IPC handlers needed — use existing `addProject`, `updateProject`, `saveAgents`
- Project-scoped agents use `crypto.randomUUID()` for IDs
- When copying project-scoped agents between projects, generate new IDs
- Existing projects default to `projectAgents: []` — backward compatible
- Promote is two IPC calls (not atomic) — acceptable per spec

---

## File Structure

**Files to create:**
- `renderer/src/components/project-setup/AgentScopeDialog.tsx`
- `renderer/src/components/project-setup/AgentScopeDialog.test.tsx`
- `renderer/src/utils/agentScope.ts`
- `renderer/src/utils/agentScope.test.ts`

**Files to modify:**
- `renderer/src/types/project-setup.ts` — add `projectAgents` to Project, add fields to ProjectSetupState
- `src/shared/project-setup-types.ts` — mirror Project type changes
- `renderer/src/hooks/useProjectSetupState.ts` — add pendingAgents, agentScopeChoice, completeWithScopedAgents
- `renderer/src/components/project-setup/screens/SelectAgentsScreen.tsx` — show new agents with badge, trigger scope dialog
- `renderer/src/components/dashboard/ConfigureAgentsDialog.tsx` — show project-scoped agents, add promote button
- `renderer/src/components/dashboard/Topbar.tsx` — add "Copy agents from..." option

---

### Task 1: Extend Project and ProjectSetupState Types

**Files:**
- Modify: `renderer/src/types/project-setup.ts`
- Modify: `src/shared/project-setup-types.ts`

- [ ] **Step 1: Add projectAgents to Project type**

Open `renderer/src/types/project-setup.ts` and add to the `Project` interface:

```typescript
projectAgents: AgentConfig[]; // agents specific to this project
```

Import `AgentConfig` from `../../../src/shared/types`.

- [ ] **Step 2: Mirror in shared types**

Open `src/shared/project-setup-types.ts` and add the same field to the `Project` interface there.

- [ ] **Step 3: Extend ProjectSetupState**

Add to `ProjectSetupState` in `renderer/src/types/project-setup.ts`:

```typescript
pendingAgents: AgentConfig[]; // agents selected but not yet scoped
agentScopeChoice: 'global' | 'project' | null; // user's scoping choice
```

- [ ] **Step 4: Commit**

```bash
git add renderer/src/types/project-setup.ts src/shared/project-setup-types.ts
git commit -m "feat: extend Project type with projectAgents field"
```

---

### Task 2: Create agentScope Utility Functions

**Files:**
- Create: `renderer/src/utils/agentScope.ts`
- Create: `renderer/src/utils/agentScope.test.ts`

- [ ] **Step 1: Write failing tests**

Create `renderer/src/utils/agentScope.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { findNewAgents, mergeAgents } from './agentScope';
import type { AgentConfig } from '../../../src/shared/types';

const makeAgent = (id: string): AgentConfig => ({
  id, name: id, path: `/usr/bin/${id}`, icon: 'generic', source: 'detected',
});

describe('findNewAgents', () => {
  it('returns agents not in global config', () => {
    const selected = [makeAgent('omp'), makeAgent('aider')];
    const global = [makeAgent('omp')];
    const result = findNewAgents(selected, global);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('aider');
  });

  it('returns empty when all agents are global', () => {
    const selected = [makeAgent('omp')];
    const global = [makeAgent('omp')];
    expect(findNewAgents(selected, global)).toHaveLength(0);
  });
});

describe('mergeAgents', () => {
  it('combines global and project agents', () => {
    const global = [makeAgent('omp')];
    const project = [makeAgent('aider')];
    const result = mergeAgents(global, project);
    expect(result).toHaveLength(2);
  });

  it('project agents override global with same ID', () => {
    const global = [{ ...makeAgent('omp'), path: '/old/path' }];
    const project = [{ ...makeAgent('omp'), path: '/new/path' }];
    const result = mergeAgents(global, project);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/new/path');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test renderer/src/utils/agentScope.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement utilities**

Create `renderer/src/utils/agentScope.ts`:

```typescript
import type { AgentConfig } from '../../../src/shared/types';

export function findNewAgents(
  selected: AgentConfig[],
  globalAgents: AgentConfig[]
): AgentConfig[] {
  const globalIds = new Set(globalAgents.map(a => a.id));
  return selected.filter(a => !globalIds.has(a.id));
}

export function mergeAgents(
  globalAgents: AgentConfig[],
  projectAgents: AgentConfig[]
): AgentConfig[] {
  const map = new Map<string, AgentConfig>();
  globalAgents.forEach(a => map.set(a.id, a));
  projectAgents.forEach(a => map.set(a.id, a));
  return Array.from(map.values());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test renderer/src/utils/agentScope.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/utils/agentScope.ts renderer/src/utils/agentScope.test.ts
git commit -m "feat: add agentScope utility functions"
```

---

### Task 3: Create AgentScopeDialog Component

**Files:**
- Create: `renderer/src/components/project-setup/AgentScopeDialog.tsx`
- Create: `renderer/src/components/project-setup/AgentScopeDialog.test.tsx`

- [ ] **Step 1: Write failing test**

Create `renderer/src/components/project-setup/AgentScopeDialog.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentScopeDialog } from './AgentScopeDialog';

describe('AgentScopeDialog', () => {
  it('shows list of new agents', () => {
    const agents = [
      { id: 'aider', name: 'Aider', path: '/usr/bin/aider', icon: 'aider', source: 'detected' as const },
    ];
    render(
      <AgentScopeDialog
        open={true}
        agents={agents}
        onAddToGlobal={vi.fn()}
        onAddToProject={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Aider')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/components/project-setup/AgentScopeDialog.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement component**

Create `renderer/src/components/project-setup/AgentScopeDialog.tsx`:

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import type { AgentConfig } from '../../../../src/shared/types';

interface AgentScopeDialogProps {
  open: boolean;
  agents: AgentConfig[];
  onAddToGlobal: (agents: AgentConfig[]) => void;
  onAddToProject: (agents: AgentConfig[]) => void;
  onCancel: () => void;
}

export function AgentScopeDialog({ open, agents, onAddToGlobal, onAddToProject, onCancel }: AgentScopeDialogProps) {
  const [choice, setChoice] = useState<'global' | 'project'>('global');

  const handleContinue = () => {
    if (choice === 'global') onAddToGlobal(agents);
    else onAddToProject(agents);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Agents to Config</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These agents are not in your global config. How would you like to add them?
          </p>

          <ul className="space-y-1">
            {agents.map(a => (
              <li key={a.id} className="text-sm">{a.name} ({a.path})</li>
            ))}
          </ul>

          <div className="space-y-2">
            <label className="flex items-start gap-2">
              <input type="radio" name="scope" checked={choice === 'global'} onChange={() => setChoice('global')} />
              <div>
                <div className="text-sm font-medium">Add to global config</div>
                <div className="text-xs text-muted-foreground">Available across all projects</div>
              </div>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="scope" checked={choice === 'project'} onChange={() => setChoice('project')} />
              <div>
                <div className="text-sm font-medium">Use for this project only</div>
                <div className="text-xs text-muted-foreground">Specific to this project</div>
              </div>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleContinue}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/components/project-setup/AgentScopeDialog.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/project-setup/AgentScopeDialog.tsx renderer/src/components/project-setup/AgentScopeDialog.test.tsx
git commit -m "feat: add AgentScopeDialog component"
```

---

### Task 4: Update useProjectSetupState for Scoped Agents

**Files:**
- Modify: `renderer/src/hooks/useProjectSetupState.ts`
- Modify: `renderer/src/hooks/__tests__/useProjectSetupState.test.ts`

- [ ] **Step 1: Write failing test**

Add to the existing test file:

```typescript
it('completeWithScopedAgents saves project agents separately', async () => {
  const { result } = renderHook(() => useProjectSetupState('full'));

  act(() => {
    result.current.updateProject('/path/to/project');
    result.current.setPendingAgents([
      { id: 'aider', name: 'Aider', path: '/usr/bin/aider', icon: 'aider', source: 'detected' },
    ]);
    result.current.setAgentScopeChoice('project');
  });

  const onComplete = vi.fn();
  await act(async () => {
    await result.current.completeWithScopedAgents(onComplete);
  });

  expect(window.api.addProject).toHaveBeenCalledWith(
    expect.objectContaining({
      projectAgents: expect.arrayContaining([
        expect.objectContaining({ id: 'aider' }),
      ]),
    })
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/hooks/__tests__/useProjectSetupState.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement completeWithScopedAgents**

Add to `useProjectSetupState.ts`:

```typescript
const setPendingAgents = useCallback((agents: AgentConfig[]) => {
  setState(prev => ({ ...prev, pendingAgents: agents }));
}, []);

const setAgentScopeChoice = useCallback((choice: 'global' | 'project' | null) => {
  setState(prev => ({ ...prev, agentScopeChoice: choice }));
}, []);

const completeWithScopedAgents = useCallback(async (onComplete?: () => void) => {
  const projectAgents = state.agentScopeChoice === 'project' ? state.pendingAgents : [];
  const globalAgents = state.agentScopeChoice === 'global' ? state.pendingAgents : [];

  // Save global agents if needed
  if (globalAgents.length > 0) {
    const existing = await window.api.getAgents();
    await window.api.saveAgents([...existing, ...globalAgents]);
  }

  // Build project with selectedAgents + projectAgents
  const project: Project = {
    path: state.projectPath!,
    name: state.projectName || path.basename(state.projectPath!),
    addedAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
    selectedAgents: state.selectedAgents,
    projectAgents,
    isGitRepo: await window.api.isGitRepo(state.projectPath!),
  };

  try {
    await window.api.addProject(project);
    onComplete?.();
  } catch (err: any) {
    if (err.message === 'PROJECT_ALREADY_EXISTS') {
      navigate('project-already-added');
    } else {
      throw err;
    }
  }
}, [state]);
```

Add these to the return object.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/hooks/__tests__/useProjectSetupState.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/hooks/useProjectSetupState.ts renderer/src/hooks/__tests__/useProjectSetupState.test.ts
git commit -m "feat: add scoped agent support to useProjectSetupState"
```

---

### Task 5: Update SelectAgentsScreen for New Agent Detection

**Files:**
- Modify: `renderer/src/components/project-setup/screens/SelectAgentsScreen.tsx`

- [ ] **Step 1: Add new agent detection and scope dialog trigger**

Open `SelectAgentsScreen.tsx` and add:

```typescript
import { useState, useEffect } from 'react';
import { AgentScopeDialog } from '../AgentScopeDialog';
import { findNewAgents } from '../../../utils/agentScope';
import type { AgentConfig } from '../../../../../src/shared/types';

// Inside the component:
const [globalAgents, setGlobalAgents] = useState<AgentConfig[]>([]);
const [showScopeDialog, setShowScopeDialog] = useState(false);

useEffect(() => {
  window.api.getAgents().then(setGlobalAgents);
}, []);

const newAgents = findNewAgents(scannedAgents, globalAgents);

const handleContinue = () => {
  if (newAgents.length > 0) {
    setPendingAgents(newAgents);
    setShowScopeDialog(true);
  } else {
    complete(onComplete);
  }
};

const handleAddToGlobal = async (agents: AgentConfig[]) => {
  const existing = await window.api.getAgents();
  await window.api.saveAgents([...existing, ...agents]);
  setAgentScopeChoice('global');
  setShowScopeDialog(false);
  complete(onComplete);
};

const handleAddToProject = (agents: AgentConfig[]) => {
  setAgentScopeChoice('project');
  setShowScopeDialog(false);
  complete(onComplete);
};
```

Add "🆕" badge next to new agents in the list. Add `<AgentScopeDialog>` at the end.

- [ ] **Step 2: Run tests**

Run: `pnpm test renderer/src/components/project-setup/screens/SelectAgentsScreen.test.tsx`
Expected: PASS (or update tests)

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/project-setup/screens/SelectAgentsScreen.tsx
git commit -m "feat: detect new agents in SelectAgentsScreen and show scope dialog"
```

---

### Task 6: Enhance ConfigureAgentsDialog

**Files:**
- Modify: `renderer/src/components/dashboard/ConfigureAgentsDialog.tsx`

- [ ] **Step 1: Add project-scoped agents section and promote button**

Open `ConfigureAgentsDialog.tsx` and add:

```typescript
import { mergeAgents } from '../../utils/agentScope';

// Get project agents from activeProject
const projectAgents = activeProject?.projectAgents || [];
const allAgents = mergeAgents(availableAgents, projectAgents);

// In the dialog body, add a second section:
{projectAgents.length > 0 && (
  <div>
    <h3 className="text-sm font-semibold mb-2">Project-Specific Agents</h3>
    {projectAgents.map(agent => (
      <div key={agent.id} className="flex items-center justify-between py-1">
        <AgentRow agent={agent} selected={selectedIds.includes(agent.id)} onToggle={() => toggle(agent.id)} />
        <Button size="sm" variant="ghost" onClick={() => promoteToGlobal(agent)}>
          Promote to Global
        </Button>
      </div>
    ))}
  </div>
)}

const promoteToGlobal = async (agent: AgentConfig) => {
  const existing = await window.api.getAgents();
  await window.api.saveAgents([...existing, agent]);
  const remaining = projectAgents.filter(a => a.id !== agent.id);
  await window.api.updateProject(activeProject!.path, { projectAgents: remaining });
  toast.success(`${agent.name} added to global config`);
  onSaved(selectedIds);
};
```

- [ ] **Step 2: Run tests**

Run: `pnpm test renderer/src/components/dashboard/ConfigureAgentsDialog.test.tsx`
Expected: PASS (or update tests)

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/ConfigureAgentsDialog.tsx
git commit -m "feat: show project-scoped agents with promote button in ConfigureAgentsDialog"
```

---

### Task 7: Add Copy Agents from Project

**Files:**
- Modify: `renderer/src/components/dashboard/Topbar.tsx`

- [ ] **Step 1: Add copy agents option to ProjectSwitcher**

Open `Topbar.tsx` and add a "Copy agents from..." button or menu item:

```typescript
const handleCopyAgents = async (sourcePath: string) => {
  const projects = await window.api.getProjects();
  const source = projects.find(p => p.path === sourcePath);
  if (!source || !activeProject) return;

  // Copy selectedAgents (by reference)
  // Copy projectAgents with NEW IDs
  const copiedProjectAgents = source.projectAgents.map(a => ({
    ...a,
    id: crypto.randomUUID(),
  }));

  await window.api.updateProject(activeProject.path, {
    selectedAgents: source.selectedAgents,
    projectAgents: copiedProjectAgents,
  });

  toast.success(`Agents copied from ${source.name}`);
};
```

Add a button or dropdown item that shows other projects and triggers this.

- [ ] **Step 2: Run tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/dashboard/Topbar.tsx
git commit -m "feat: add copy agents from project option"
```

---

### Task 8: Final Integration and Smoke Test

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 2: Smoke test**

Run: `pnpm dev`

Verify:
1. Project setup → scan finds new agents → AgentScopeDialog appears
2. Choose "Project only" → project saved with projectAgents
3. ConfigureAgentsDialog → shows project-scoped agents with promote button
4. Promote → agent moved to global config
5. Copy agents from another project → agents copied

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete project-scoped agent onboarding (Sub-project B)"
```
