# Reset & Recovery Design

**Date:** 2026-08-09  
**Scope:** Sub-project C — Case 7 (reset and recovery)  
**Status:** Approved for implementation

## Overview

Add reset and recovery functionality to Settings. Users can export/import configuration backups, reset agents, reset projects, or perform a full reset that restarts onboarding.

## Architecture

**Current state:**
- No reset/recovery UI exists
- `agents.json` and `projects.json` are managed separately
- No export/import functionality

**New architecture:**
```
Settings → Reset & Recovery tab
  ├─► Export Config → save agents.json + projects.json to single file
  ├─► Import Config → load file, restore agents.json + projects.json
  ├─► Reset Agents → clear agents.json, keep projects.json
  ├─► Reset Projects → clear projects.json, keep agents.json
  └─► Full Reset → clear both, set onboardingCompleted=false, restart app
```

**Component hierarchy:**
```
SettingsScreen
  └─► ResetRecoverySettings (new tab content)
        ├─► ExportSection
        ├─► ImportSection
        └─► DangerZone
              ├─► ResetAgentsButton → ConfirmationDialog
              ├─► ResetProjectsButton → ConfirmationDialog
              └─► FullResetButton → ConfirmationDialog
```

**Key principle:** All destructive actions require explicit confirmation with impact preview. Export/import use a single JSON file containing both agents and projects.

## Component & API Design

**New IPC handlers (main process):**

```ts
// src/main/ipc-handlers.ts — add new handlers

// Export: combine agents + projects into single object
ipcMain.handle('export-config', async () => {
  const agents = await loadAgents();
  const projects = await getProjects();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    agents,
    projects,
  };
});

// Import: restore from exported object
ipcMain.handle('import-config', async (_event, config: ExportedConfig) => {
  // Validate version
  if (config.version !== 1) {
    throw new Error('INCOMPATIBLE_VERSION');
  }
  
  // Restore agents
  await saveAgents(config.agents.agents);
  
  // Clear and re-add projects
  const projectsPath = path.join(app.getPath('userData'), 'projects.json');
  await fs.writeFile(projectsPath, JSON.stringify({ version: 1, projects: config.projects }, null, 2));
});

// Reset agents: clear agents.json, keep onboarding flag
ipcMain.handle('reset-agents', async () => {
  await saveAgents([]); // empty array clears the file
});

// Reset projects: clear projects.json
ipcMain.handle('reset-projects', async () => {
  const projectsPath = path.join(app.getPath('userData'), 'projects.json');
  await fs.writeFile(projectsPath, JSON.stringify({ version: 1, projects: [] }, null, 2));
});

// Full reset: clear both, reset onboarding
ipcMain.handle('full-reset', async () => {
  await saveAgents([]);
  const projectsPath = path.join(app.getPath('userData'), 'projects.json');
  await fs.writeFile(projectsPath, JSON.stringify({ version: 1, projects: [] }, null, 2));
  await resetOnboarding();
});
```

**New function in `agent-store.ts`:**

```ts
// src/main/agent-store.ts
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

**New types:**

```ts
// src/shared/types.ts
export interface ExportedConfig {
  version: 1;
  exportedAt: string; // ISO timestamp
  agents: AgentsStore;
  projects: Project[];
}
```

**New preload API:**

```ts
// src/preload.ts
exportConfig: () => ipcRenderer.invoke('export-config'),
importConfig: (config: ExportedConfig) => ipcRenderer.invoke('import-config', config),
resetAgents: () => ipcRenderer.invoke('reset-agents'),
resetProjects: () => ipcRenderer.invoke('reset-projects'),
fullReset: () => ipcRenderer.invoke('full-reset'),
```

**New component: `ResetRecoverySettings.tsx`**

```tsx
// renderer/src/components/settings/ResetRecoverySettings.tsx

export function ResetRecoverySettings() {
  const [agentCount, setAgentCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    window.api.getAgents().then(agents => setAgentCount(agents.length));
    window.api.getProjects().then(projects => setProjectCount(projects.length));
  }, []);

  const handleExport = async () => {
    try {
      const config = await window.api.exportConfig();
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pi-dash-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Configuration exported');
    } catch (err) {
      toast.error('Failed to export configuration. Check disk space.');
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const config = JSON.parse(text) as ExportedConfig;
        
        // Validate
        if (!config.version || !config.agents || !config.projects) {
          toast.error('Incompatible backup file format.');
          return;
        }
        
        // Show confirmation
        const confirmed = await showImportConfirmation(config);
        if (!confirmed) return;
        
        await window.api.importConfig(config);
        toast.success('Configuration imported. Please restart the app.');
      } catch (err) {
        if (err instanceof SyntaxError) {
          toast.error('Invalid backup file. Please select a valid JSON file.');
        } else {
          toast.error('Failed to import configuration. Check disk space.');
        }
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Export Configuration">
        <p>Backup agents and projects to a JSON file.</p>
        <Button onClick={handleExport}>Export...</Button>
      </SectionCard>

      <SectionCard title="Import Configuration">
        <p>Restore from a backup file. This will overwrite current config.</p>
        <Button onClick={handleImport}>Import...</Button>
      </SectionCard>

      <SectionCard title="Danger Zone" variant="destructive">
        <ResetAction
          title="Reset Agents"
          description={`Remove all ${agentCount} agents. Projects will be kept.`}
          impact={`${agentCount} agents`}
          onConfirm={() => window.api.resetAgents()}
        />
        <ResetAction
          title="Reset Projects"
          description={`Remove all ${projectCount} projects. Agents will be kept.`}
          impact={`${projectCount} projects`}
          onConfirm={() => window.api.resetProjects()}
        />
        <ResetAction
          title="Full Reset"
          description={`Remove all ${agentCount} agents and ${projectCount} projects. Onboarding will restart.`}
          impact={`${agentCount} agents and ${projectCount} projects`}
          onConfirm={() => window.api.fullReset()}
          requireText="RESET"
        />
      </SectionCard>
    </div>
  );
}
```

**New component: `ResetAction.tsx`**

```tsx
// Reusable confirmation dialog for reset actions
interface ResetActionProps {
  title: string;
  description: string;
  impact: string;
  onConfirm: () => Promise<void>;
  requireText?: string; // if provided, user must type this to confirm
}
```

## UI Flows

**Flow 1: Export Configuration**

```
1. User navigates to Settings → Reset & Recovery
2. User clicks "Export..."
3. Browser downloads: pi-dash-backup-20260809-143022.json
4. Toast: "Configuration exported"
5. File contains:
   {
     "version": 1,
     "exportedAt": "2026-08-09T14:30:22.123Z",
     "agents": { ... },
     "projects": [ ... ]
   }
```

**Flow 2: Import Configuration**

```
1. User navigates to Settings → Reset & Recovery
2. User clicks "Import..."
3. File picker opens → user selects backup.json
4. Confirmation dialog:
   ┌─────────────────────────────────────┐
   │ Import Configuration                │
   ├─────────────────────────────────────┤
   │                                     │
   │ This will overwrite:                │
   │ • 5 agents → 3 agents (from backup) │
   │ • 3 projects → 2 projects (backup)  │
   │                                     │
   │ This action cannot be undone.       │
   │                                     │
   │       [Cancel]  [Import]            │
   └─────────────────────────────────────┘
5. User clicks "Import"
6. Config restored
7. Toast: "Configuration imported. Please restart the app."
```

**Flow 3: Reset Agents**

```
1. User clicks "Reset Agents..."
2. Confirmation dialog:
   ┌─────────────────────────────────────┐
   │ Reset Agents                        │
   ├─────────────────────────────────────┤
   │                                     │
   │ This will remove:                   │
   │ • 5 agents                          │
   │                                     │
   │ Projects will be kept.              │
   │                                     │
   │       [Cancel]  [Reset Agents]      │
   └─────────────────────────────────────┘
3. User clicks "Reset Agents"
4. agents.json cleared (empty array)
5. Toast: "Agents reset. You can add agents in Settings."
6. Dashboard updates (agent list empty)
```

**Flow 4: Reset Projects**

```
1. User clicks "Reset Projects..."
2. Confirmation dialog:
   ┌─────────────────────────────────────┐
   │ Reset Projects                      │
   ├─────────────────────────────────────┤
   │                                     │
   │ This will remove:                   │
   │ • 3 projects                        │
   │                                     │
   │ Agents will be kept.                │
   │                                     │
   │       [Cancel]  [Reset Projects]    │
   └─────────────────────────────────────┘
3. User clicks "Reset Projects"
4. projects.json cleared (empty array)
5. Toast: "Projects reset. Add a project to get started."
6. App shows ProjectSetupFlow (since projectCount === 0)
```

**Flow 5: Full Reset**

```
1. User clicks "Full Reset..."
2. Confirmation dialog (requires typing "RESET"):
   ┌─────────────────────────────────────┐
   │ Full Reset                          │
   ├─────────────────────────────────────┤
   │                                     │
   │ This will remove:                   │
   │ • 5 agents                          │
   │ • 3 projects                        │
   │                                     │
   │ Onboarding will restart.            │
   │                                     │
   │ Type "RESET" to confirm:            │
   │ [____________]                      │
   │                                     │
   │    [Cancel]  [Reset Everything]     │
   └─────────────────────────────────────┘
3. User types "RESET" → button enables
4. User clicks "Reset Everything"
5. agents.json cleared, onboardingCompleted = false
6. projects.json cleared
7. Toast: "Full reset complete. Restarting..."
8. App restarts → OnboardingFlow shown
```

## Data Model Changes

**New type:**

```ts
// src/shared/types.ts
export interface ExportedConfig {
  version: 1;
  exportedAt: string;
  agents: AgentsStore;
  projects: Project[];
}
```

**No changes to existing schemas.** `agents.json` and `projects.json` remain unchanged. Export is a wrapper that combines both.

**New IPC handlers:**
- `export-config` — returns `ExportedConfig`
- `import-config` — takes `ExportedConfig`, restores
- `reset-agents` — clears agents, keeps onboarding flag
- `reset-projects` — clears projects
- `full-reset` — clears both + resets onboarding

**New function in `agent-store.ts`:**
- `resetOnboarding()` — sets `onboardingCompleted = false`

## Error Handling

| Scenario | Behavior |
|---|---|
| Export fails (no write access) | Toast: "Failed to export configuration. Check disk space." |
| Import fails (invalid JSON) | Toast: "Invalid backup file. Please select a valid JSON file." |
| Import fails (missing version) | Toast: "Incompatible backup file format." |
| Import fails (write error) | Toast: "Failed to import configuration. Check disk space." |
| Reset agents fails | Toast: "Failed to reset agents. Try again." |
| Reset projects fails | Toast: "Failed to reset projects. Try again." |
| Full reset fails | Toast: "Failed to perform full reset. Try again." |

**Principles:**
- Never silently fail — always show toast
- Import validates schema before applying
- Full reset requires explicit confirmation (type "RESET")
- After import, prompt user to restart app

## Testing Strategy

**Unit tests:**

| Test | What it verifies |
|---|---|
| `exportConfig` returns correct structure | Version, exportedAt, agents, projects |
| `importConfig` restores agents | agents.json updated with imported data |
| `importConfig` restores projects | projects.json updated with imported data |
| `resetAgents` clears agents | agents.json becomes empty array |
| `resetProjects` clears projects | projects.json becomes empty array |
| `fullReset` clears both + resets onboarding | Both files cleared, onboardingCompleted = false |
| `resetOnboarding` sets flag to false | Store updated correctly |

**Integration tests:**

| Test | What it verifies |
|---|---|
| Export → Import roundtrip | Export config, import it back, verify state matches |
| Reset agents → Dashboard updates | Agent list becomes empty after reset |
| Reset projects → ProjectSetupFlow shown | App shows project setup when no projects |
| Full reset → OnboardingFlow shown | App restarts and shows onboarding |
| Confirmation dialog blocks action | Reset doesn't happen until user confirms |
| Text confirmation required for full reset | "Reset Everything" button disabled until "RESET" typed |

## Implementation Notes

**Files to create:**
- `renderer/src/components/settings/ResetRecoverySettings.tsx` — main settings component
- `renderer/src/components/settings/ResetAction.tsx` — reusable confirmation dialog

**Files to modify:**
- `src/main/ipc-handlers.ts` — add 5 new IPC handlers
- `src/main/agent-store.ts` — add `resetOnboarding()` function
- `src/preload.ts` — expose 5 new API methods
- `src/shared/types.ts` — add `ExportedConfig` type
- `renderer/src/components/settings/SettingsSidebar.tsx` — add "Reset & Recovery" tab
- `renderer/src/components/settings/SettingsScreen.tsx` — route to new tab

**Dependencies:**
- None. Uses existing file I/O patterns.

**Migration:**
- None. Additive changes only.
