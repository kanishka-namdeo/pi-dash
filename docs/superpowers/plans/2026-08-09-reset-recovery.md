# Reset & Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reset and recovery functionality to Settings. Users can export/import configuration backups, reset agents, reset projects, or perform a full reset that restarts onboarding.

**Architecture:** Add 5 new IPC handlers in main process for export/import/reset operations. Export uses native `dialog.showSaveDialog`, import uses `dialog.showOpenDialog`. Settings gets a new "Reset & Recovery" tab with danger zone for destructive actions. All resets require confirmation dialogs.

**Tech Stack:** React 19, TypeScript, Electron IPC, Vitest

## Global Constraints

- Export/import use native Electron dialogs (`showSaveDialog`/`showOpenDialog`) — NOT Blob download pattern
- All destructive actions require explicit confirmation with impact preview
- Full reset requires typing "RESET" to confirm
- Import validates `version` field before applying
- After import, prompt user to restart app
- No changes to existing `agents.json` or `projects.json` schemas

---

## File Structure

**Files to create:**
- `renderer/src/components/settings/ResetRecoverySettings.tsx`
- `renderer/src/components/settings/ResetRecoverySettings.test.tsx`
- `renderer/src/components/settings/ResetAction.tsx`
- `renderer/src/components/settings/ResetAction.test.tsx`

**Files to modify:**
- `src/shared/types.ts` — add `ExportedConfig` type
- `src/main/agent-store.ts` — add `resetOnboarding()` function
- `src/main/ipc-handlers.ts` — add 5 new IPC handlers
- `src/preload.ts` — expose 5 new API methods
- `renderer/src/types/global.d.ts` — add type declarations
- `renderer/src/components/settings/SettingsSidebar.tsx` — add tab
- `renderer/src/components/settings/SettingsScreen.tsx` — add route

---

### Task 1: Add ExportedConfig Type

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add ExportedConfig interface**

Open `src/shared/types.ts` and add:

```typescript
export interface ExportedConfig {
  version: 1;
  exportedAt: string;
  agents: AgentsStore;
  projects: Project[];
}
```

Import `Project` from `./project-setup-types`.

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add ExportedConfig type"
```

---

### Task 2: Add resetOnboarding Function

**Files:**
- Modify: `src/main/agent-store.ts`
- Modify: `src/main/agent-store.test.ts`

- [ ] **Step 1: Write failing test**

Add to `src/main/agent-store.test.ts`:

```typescript
it('resets onboarding flag', async () => {
  await completeOnboarding();
  let store = await loadAgents();
  expect(store.onboardingCompleted).toBe(true);

  await resetOnboarding();
  store = await loadAgents();
  expect(store.onboardingCompleted).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/agent-store.test.ts`
Expected: FAIL with "resetOnboarding is not defined"

- [ ] **Step 3: Implement resetOnboarding**

Add to `src/main/agent-store.ts`:

```typescript
export async function resetOnboarding(): Promise<void> {
  const userDataPath = process.env.PI_DASH_USER_DATA || app.getPath('userData');
  const storePath = path.join(userDataPath, STORE_FILE);
  const store = await loadAgents();
  store.onboardingCompleted = false;
  const dir = path.dirname(storePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/agent-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/agent-store.ts src/main/agent-store.test.ts
git commit -m "feat: add resetOnboarding function"
```

---

### Task 3: Add IPC Handlers for Reset/Export/Import

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload.ts`
- Modify: `renderer/src/types/global.d.ts`

- [ ] **Step 1: Add IPC handlers**

Add to `src/main/ipc-handlers.ts` inside `registerIpcHandlers()`:

```typescript
import { dialog, app } from 'electron';
import fs from 'fs/promises';
import type { ExportedConfig } from '../shared/types';

// Export config with native save dialog
ipcMain.handle('export-config', async () => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: 'JSON', extensions: ['json'] }],
    defaultPath: `pi-dash-backup-${Date.now()}.json`,
  });
  if (result.canceled || !result.filePath) return { success: false };

  const agents = await loadAgents();
  const { getProjects } = await import('./project-manager');
  const projects = await getProjects();
  const config: ExportedConfig = {
    version: 1,
    exportedAt: new Date().toISOString(),
    agents,
    projects,
  };
  await fs.writeFile(result.filePath, JSON.stringify(config, null, 2));
  return { success: true };
});

// Import config with native open dialog
ipcMain.handle('import-config', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return { success: false };

  const content = await fs.readFile(result.filePaths[0], 'utf-8');
  let config: ExportedConfig;
  try {
    config = JSON.parse(content) as ExportedConfig;
  } catch {
    throw new Error('INVALID_JSON');
  }

  // Validate structure
  if (config.version !== 1) throw new Error('INCOMPATIBLE_VERSION');
  if (!config.agents || !Array.isArray(config.agents.agents)) throw new Error('INVALID_AGENTS');
  if (!Array.isArray(config.projects)) throw new Error('INVALID_PROJECTS');
  if (typeof config.agents.onboardingCompleted !== 'boolean') throw new Error('INVALID_ONBOARDING');

  await saveAgents(config.agents.agents);
  const projectsPath = path.join(app.getPath('userData'), 'projects.json');
  await fs.writeFile(projectsPath, JSON.stringify({ version: 1, projects: config.projects }, null, 2));
  return { success: true, config };
});

// Reset agents
ipcMain.handle('reset-agents', async () => {
  await saveAgents([]);
  return { success: true };
});

// Reset projects
ipcMain.handle('reset-projects', async () => {
  const projectsPath = path.join(app.getPath('userData'), 'projects.json');
  await fs.writeFile(projectsPath, JSON.stringify({ version: 1, projects: [] }, null, 2));
  return { success: true };
});

// Full reset
ipcMain.handle('full-reset', async () => {
  await saveAgents([]);
  const projectsPath = path.join(app.getPath('userData'), 'projects.json');
  await fs.writeFile(projectsPath, JSON.stringify({ version: 1, projects: [] }, null, 2));
  const { resetOnboarding } = await import('./agent-store');
  await resetOnboarding();
  return { success: true };
});
```

- [ ] **Step 2: Expose in preload**

Add to `src/preload.ts` in the `window.api` object:

```typescript
exportConfig: () => ipcRenderer.invoke('export-config'),
importConfig: () => ipcRenderer.invoke('import-config'),
resetAgents: () => ipcRenderer.invoke('reset-agents'),
resetProjects: () => ipcRenderer.invoke('reset-projects'),
fullReset: () => ipcRenderer.invoke('full-reset'),
```

- [ ] **Step 3: Update global.d.ts**

Add to `renderer/src/types/global.d.ts`:

```typescript
exportConfig: () => Promise<{ success: boolean }>;
importConfig: () => Promise<{ success: boolean; config?: any }>;
resetAgents: () => Promise<{ success: boolean }>;
resetProjects: () => Promise<{ success: boolean }>;
fullReset: () => Promise<{ success: boolean }>;
```

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload.ts renderer/src/types/global.d.ts
git commit -m "feat: add reset/export/import IPC handlers"
```

---

### Task 4: Create ResetAction Component

**Files:**
- Create: `renderer/src/components/settings/ResetAction.tsx`
- Create: `renderer/src/components/settings/ResetAction.test.tsx`

- [ ] **Step 1: Write failing test**

Create `renderer/src/components/settings/ResetAction.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResetAction } from './ResetAction';

describe('ResetAction', () => {
  it('shows title and description', () => {
    render(
      <ResetAction
        title="Reset Agents"
        description="Remove all agents"
        impact="5 agents"
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText('Reset Agents')).toBeInTheDocument();
    expect(screen.getByText('Remove all agents')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/components/settings/ResetAction.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement component**

Create `renderer/src/components/settings/ResetAction.tsx`:

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';

interface ResetActionProps {
  title: string;
  description: string;
  impact: string;
  onConfirm: () => Promise<void>;
  requireText?: string;
}

export function ResetAction({ title, description, impact, onConfirm, requireText }: ResetActionProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const canConfirm = !requireText || confirmText === requireText;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
        <div>
          <h4 className="text-sm font-medium">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
          {title}...
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm">This will remove:</p>
            <p className="text-sm font-medium">• {impact}</p>

            {requireText && (
              <div className="space-y-2">
                <p className="text-sm">Type "{requireText}" to confirm:</p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder={requireText}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={!canConfirm || isConfirming}>
              {isConfirming ? 'Resetting...' : title}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/components/settings/ResetAction.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/settings/ResetAction.tsx renderer/src/components/settings/ResetAction.test.tsx
git commit -m "feat: add ResetAction confirmation dialog component"
```

---

### Task 5: Create ResetRecoverySettings Component

**Files:**
- Create: `renderer/src/components/settings/ResetRecoverySettings.tsx`
- Create: `renderer/src/components/settings/ResetRecoverySettings.test.tsx`

- [ ] **Step 1: Write failing test**

Create `renderer/src/components/settings/ResetRecoverySettings.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResetRecoverySettings } from './ResetRecoverySettings';

describe('ResetRecoverySettings', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'api', {
      value: {
        getAgents: vi.fn().mockResolvedValue([]),
        getProjects: vi.fn().mockResolvedValue([]),
        exportConfig: vi.fn(),
        importConfig: vi.fn(),
        resetAgents: vi.fn(),
        resetProjects: vi.fn(),
        fullReset: vi.fn(),
      },
      writable: true,
    });
  });

  it('shows export and import sections', () => {
    render(<ResetRecoverySettings />);
    expect(screen.getByText('Export Configuration')).toBeInTheDocument();
    expect(screen.getByText('Import Configuration')).toBeInTheDocument();
  });

  it('shows danger zone with reset actions', () => {
    render(<ResetRecoverySettings />);
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    expect(screen.getByText('Reset Agents')).toBeInTheDocument();
    expect(screen.getByText('Reset Projects')).toBeInTheDocument();
    expect(screen.getByText('Full Reset')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/components/settings/ResetRecoverySettings.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement component**

Create `renderer/src/components/settings/ResetRecoverySettings.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SectionCard } from './SectionCard';
import { Button } from '../ui/button';
import { ResetAction } from './ResetAction';

export function ResetRecoverySettings() {
  const [agentCount, setAgentCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    window.api.getAgents().then(agents => setAgentCount(agents.length));
    window.api.getProjects().then(projects => setProjectCount(projects.length));
  }, []);

  const handleExport = async () => {
    try {
      const result = await window.api.exportConfig();
      if (result.success) {
        toast.success('Configuration exported');
      }
    } catch {
      toast.error('Failed to export configuration. Check disk space.');
    }
  };

  const handleImport = async () => {
    try {
      const result = await window.api.importConfig();
      if (result.success) {
        toast.success('Configuration imported. Please restart the app.');
      }
    } catch (err) {
      if (err instanceof Error) {
        switch (err.message) {
          case 'INCOMPATIBLE_VERSION':
            toast.error('Incompatible backup file format.');
            break;
          case 'INVALID_JSON':
            toast.error('Invalid JSON in backup file.');
            break;
          case 'INVALID_AGENTS':
          case 'INVALID_PROJECTS':
          case 'INVALID_ONBOARDING':
            toast.error('Backup file is corrupted or incomplete.');
            break;
          default:
            toast.error('Failed to import configuration. Check disk space.');
        }
      } else {
        toast.error('Failed to import configuration. Check disk space.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Export Configuration">
        <p className="text-sm text-muted-foreground mb-3">
          Backup agents and projects to a JSON file.
        </p>
        <Button onClick={handleExport}>Export...</Button>
      </SectionCard>

      <SectionCard title="Import Configuration">
        <p className="text-sm text-muted-foreground mb-3">
          Restore from a backup file. This will overwrite current config.
        </p>
        <Button onClick={handleImport}>Import...</Button>
      </SectionCard>

      <SectionCard title="Danger Zone">
        <ResetAction
          title="Reset Agents"
          description={`Remove all ${agentCount} agents. Projects will be kept.`}
          impact={`${agentCount} agents`}
          onConfirm={async () => {
            await window.api.resetAgents();
            toast.success('Agents reset.');
            setAgentCount(0);
          }}
        />
        <ResetAction
          title="Reset Projects"
          description={`Remove all ${projectCount} projects. Agents will be kept.`}
          impact={`${projectCount} projects`}
          onConfirm={async () => {
            await window.api.resetProjects();
            toast.success('Projects reset.');
            setProjectCount(0);
          }}
        />
        <ResetAction
          title="Full Reset"
          description={`Remove all ${agentCount} agents and ${projectCount} projects. Onboarding will restart.`}
          impact={`${agentCount} agents and ${projectCount} projects`}
          onConfirm={async () => {
            await window.api.fullReset();
            toast.success('Full reset complete. Restarting...');
          }}
          requireText="RESET"
        />
      </SectionCard>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/components/settings/ResetRecoverySettings.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/settings/ResetRecoverySettings.tsx renderer/src/components/settings/ResetRecoverySettings.test.tsx
git commit -m "feat: add ResetRecoverySettings component"
```

---

### Task 6: Wire Reset & Recovery Tab into Settings

**Files:**
- Modify: `renderer/src/components/settings/SettingsSidebar.tsx`
- Modify: `renderer/src/components/settings/SettingsScreen.tsx`

- [ ] **Step 1: Add tab to sidebar**

Open `SettingsSidebar.tsx` and add to `navItems`:

```typescript
import { ShieldAlert } from 'lucide-react';

// Add to navItems array:
{ id: 'reset', label: 'Reset & Recovery', icon: ShieldAlert },
```

- [ ] **Step 2: Add route to SettingsScreen**

Open `SettingsScreen.tsx` and add:

```typescript
import { ResetRecoverySettings } from './ResetRecoverySettings';

// Add inside <Routes>:
<Route path="/reset" element={<ResetRecoverySettings />} />
```

- [ ] **Step 3: Run tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/settings/SettingsSidebar.tsx renderer/src/components/settings/SettingsScreen.tsx
git commit -m "feat: add Reset & Recovery tab to Settings"
```

---

### Task 7: Final Integration and Smoke Test

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 2: Smoke test**

Run: `pnpm dev`

Verify:
1. Settings → Reset & Recovery tab appears
2. Export → native save dialog opens → file saved
3. Import → native open dialog opens → config restored
4. Reset Agents → confirmation dialog → agents cleared
5. Reset Projects → confirmation dialog → projects cleared
6. Full Reset → requires typing "RESET" → both cleared → onboarding restarts

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete reset & recovery (Sub-project C)"
```
