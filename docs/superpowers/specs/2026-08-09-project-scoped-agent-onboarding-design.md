# Project-scoped Agent Onboarding Design

**Date:** 2026-08-09  
**Scope:** Sub-project B — Case 6 (project-specific agent onboarding)  
**Status:** Approved for implementation

## Overview

Enable project-scoped agent selection during project setup. When users select agents not in the global config, prompt them to choose: add to global config or use for this project only. Project-scoped agents are stored in the project config, not the global agent store.

## Architecture

**Current flow:**
```
Project Setup → Scan (global) → Select agents → Add to global config → Set project.selectedAgents
```

**New flow with explicit prompt:**
```
Project Setup → Scan (global) → Select agents
  ├─► For each selected agent:
  │     ├─► If in global config → just reference by ID
  │     └─► If NOT in global config → prompt: "Add to global?" or "Project only?"
  │           ├─► "Add to global" → save to agents.json, reference by ID
  │           └─► "Project only" → save to project.projectAgents, reference by ID
  └─► Set project.selectedAgents (IDs from both sources)
```

**Component hierarchy:**
```
ProjectSetupFlow
  └─► SelectAgentsScreen
        ├─► Shows global agents (checkboxes)
        ├─► Shows scanned agents not in global (checkboxes + "New" badge)
        └─► On "Continue":
              └─► For new agents: show AgentScopeDialog
                    ├─► "Add to Global" → addToGlobal(agent)
                    └─► "Project Only" → addToProject(agent)
```

**Key principle:** Agents are identified by ID everywhere. The ID is the same whether the agent is global or project-scoped. The storage location differs, but the reference model is unified.

## Component & API Design

**New component: `AgentScopeDialog`**

Shown when user selects an agent not in global config during project setup.

```tsx
interface AgentScopeDialogProps {
  agents: AgentConfig[]; // agents not in global config
  onAddToGlobal: (agents: AgentConfig[]) => void;
  onAddToProject: (agents: AgentConfig[]) => void;
  onCancel: () => void;
}

// UI:
// ┌─────────────────────────────────────┐
// │ Add Agents to Config                │
// ├─────────────────────────────────────┤
// │                                     │
// │ These agents are not in your        │
// │ global config. How would you like   │
// │ to add them?                        │
// │                                     │
// │ • Aider (/usr/bin/aider)            │
// │ • Roo Code (/usr/bin/roo)           │
// │                                     │
// │ ○ Add to global config              │
// │   Available across all projects     │
// │                                     │
// │ ○ Use for this project only         │
// │   Specific to this project          │
// │                                     │
// │        [Cancel]  [Continue]         │
// └─────────────────────────────────────┘
```

**Changes to `useProjectSetupState`:**

```ts
interface ProjectSetupState {
  // ... existing fields
  pendingAgents: AgentConfig[]; // agents selected but not yet scoped
  agentScopeChoice: 'global' | 'project' | null; // user's choice
}

// New actions:
interface ProjectSetupActions {
  // ... existing actions
  setPendingAgents: (agents: AgentConfig[]) => void;
  setAgentScopeChoice: (choice: 'global' | 'project' | null) => void;
  completeWithScopedAgents: (onComplete?: () => void) => Promise<void>;
}
```

**Helper functions (new file: `renderer/src/utils/agentScope.ts`):**

```ts
// Determine which selected agents are not in global config
export function findNewAgents(
  selected: AgentConfig[],
  globalAgents: AgentConfig[]
): AgentConfig[] {
  const globalIds = new Set(globalAgents.map(a => a.id));
  return selected.filter(a => !globalIds.has(a.id));
}

// Merge project agents into a combined list for display
export function mergeAgents(
  globalAgents: AgentConfig[],
  projectAgents: AgentConfig[]
): AgentConfig[] {
  const map = new Map<string, AgentConfig>();
  globalAgents.forEach(a => map.set(a.id, a));
  projectAgents.forEach(a => map.set(a.id, a)); // project agents override
  return Array.from(map.values());
}
```

**IPC changes:**

No new IPC handlers needed. We use existing:
- `saveAgents(agents)` — add to global config
- `addProject(project)` — save project with `projectAgents` field

## UI Flows

**Flow 1: Project Setup with New Agents**

```
1. User starts project setup → selects project path
2. Setup scans for agents → finds 5 agents (3 in global, 2 new)
3. SelectAgentsScreen shows:
   ┌─────────────────────────────────────┐
   │ Select Agents                       │
   ├─────────────────────────────────────┤
   │ Global Agents:                      │
   │ [x] OMP                             │
   │ [x] Cursor                          │
   │ [x] Claude Code                     │
   │                                     │
   │ New Agents:                         │
   │ [x] Aider 🆕                        │
   │ [x] Roo Code 🆕                     │
   │                                     │
   │        [Back]  [Continue]           │
   └─────────────────────────────────────┘
4. User clicks "Continue"
5. AgentScopeDialog appears (for the 2 new agents):
   ┌─────────────────────────────────────┐
   │ Add Agents to Config                │
   ├─────────────────────────────────────┤
   │ These agents are not in your        │
   │ global config.                      │
   │                                     │
   │ • Aider (/usr/bin/aider)            │
   │ • Roo Code (/usr/bin/roo)           │
   │                                     │
   │ ○ Add to global config              │
   │ ○ Use for this project only         │
   │                                     │
   │        [Cancel]  [Continue]         │
   └─────────────────────────────────────┘
6. User selects "Use for this project only" → clicks "Continue"
7. Project saved with:
   - selectedAgents: ['omp', 'cursor', 'claude', 'aider', 'roo']
   - projectAgents: [{ id: 'aider', ... }, { id: 'roo', ... }]
8. Setup complete → Dashboard loads
```

**Flow 2: ConfigureAgentsDialog (existing, enhanced)**

Currently shows only global agents. Enhanced to show project-scoped agents too.

```
┌─────────────────────────────────────┐
│ Configure Agents for Project        │
├─────────────────────────────────────┤
│                                     │
│ Global Agents:                      │
│ [x] OMP                             │
│ [x] Cursor                          │
│ [ ] Claude Code                     │
│                                     │
│ Project-Specific Agents:            │
│ [x] Aider 🆕                        │
│ [x] Roo Code 🆕                     │
│                                     │
│ [Scan for Agents] [Add Manually]    │
│                                     │
│        [Cancel]  [Save]             │
└─────────────────────────────────────┘
```

**Flow 3: Promote Project Agent to Global (6f)**

From ConfigureAgentsDialog, user can promote a project-scoped agent to global.

```
┌─────────────────────────────────────┐
│ Project-Specific Agents:            │
│ [x] Aider 🆕  [Promote to Global]   │
│ [x] Roo Code 🆕                     │
└─────────────────────────────────────┘

User clicks "Promote to Global" on Aider:
→ Aider moved from project.projectAgents to global agents.json
→ project.projectAgents no longer includes Aider
→ Toast: "Aider added to global config"
```

**Flow 4: Copy Agents from Project (6d)**

From Dashboard, user can copy agent config from one project to another.

```
TopBar → ProjectSwitcher → "Copy agents from..." → Select source project
→ Copies selectedAgents + projectAgents from source to active project
→ Toast: "Agents copied from Project A"
```

## Data Model Changes

**Project type extension:**

```ts
// renderer/src/types/project-setup.ts — extend Project interface
export interface Project {
  path: string;
  name: string;
  addedAt: string;
  lastOpenedAt: string;
  selectedAgents: string[]; // IDs from both global and project-scoped agents
  projectAgents: AgentConfig[]; // NEW: agents specific to this project
  githubUrl?: string;
  isGitRepo: boolean;
}
```

**ProjectSetupState extension:**

```ts
// renderer/src/types/project-setup.ts — extend ProjectSetupState
export interface ProjectSetupState {
  // ... existing fields
  pendingAgents: AgentConfig[]; // NEW: agents selected but not yet scoped
  agentScopeChoice: 'global' | 'project' | null; // NEW: user's scoping choice
}
```

**No changes to `agents.json` schema.** Global agents remain unchanged.

**No changes to IPC surface.** We use existing `addProject`, `updateProject`, `saveAgents`.

**Migration:**
- Existing projects have `projectAgents: []` (empty array) — backward compatible
- No data migration needed; new field defaults to empty

## Error Handling

| Scenario | Behavior |
|---|---|
| Agent scope dialog cancelled | Return to SelectAgentsScreen, user can re-select |
| Save to global config fails | Toast: "Failed to add agents to global config. Try again." |
| Save project with projectAgents fails | Toast: "Failed to save project. Try again." |
| Promote to global fails | Toast: "Failed to promote agent. Try again." |
| Copy agents from project fails | Toast: "Failed to copy agents. Try again." |
| Project agent path becomes invalid | Show warning in ConfigureAgentsDialog: "Aider: path not found" |

**Principles:**
- Never lose user selections — if save fails, keep dialog open
- Project-scoped agents are validated same as global agents (path exists, executable)
- Promote operation is atomic: either fully succeeds or fully fails

## Testing Strategy

**Unit tests:**

| Test | What it verifies |
|---|---|
| `findNewAgents` returns correct diff | Given selected + global, returns only new agents |
| `mergeAgents` combines correctly | Global + project agents merged, project overrides global |
| AgentScopeDialog renders with new agents | Shows list of agents not in global config |
| ProjectSetupState handles pendingAgents | State transitions: select → pending → scope → complete |

**Integration tests:**

| Test | What it verifies |
|---|---|
| Project setup with new agents | Select new agent → scope dialog → choose "project only" → verify project.projectAgents populated |
| Project setup with global agents | Select existing agent → no scope dialog → verify only selectedAgents updated |
| Promote project agent to global | Click "Promote" → verify agent moved from projectAgents to global |
| Copy agents between projects | Copy from Project A → verify Project B has same selectedAgents + projectAgents |

## Implementation Notes

**Files to create:**
- `renderer/src/components/project-setup/AgentScopeDialog.tsx` — dialog for scoping new agents
- `renderer/src/utils/agentScope.ts` — helper functions for agent scoping

**Files to modify:**
- `renderer/src/types/project-setup.ts` — add `projectAgents` to Project, add fields to ProjectSetupState
- `renderer/src/hooks/useProjectSetupState.ts` — add pendingAgents, agentScopeChoice, completeWithScopedAgents
- `renderer/src/components/project-setup/screens/SelectAgentsScreen.tsx` — show new agents with badge, trigger scope dialog
- `renderer/src/components/dashboard/ConfigureAgentsDialog.tsx` — show project-scoped agents, add "Promote to Global" button
- `renderer/src/components/dashboard/Topbar.tsx` — add "Copy agents from..." option to ProjectSwitcher

**Dependencies:**
- None. Uses existing IPC surface.

**Migration:**
- None. Additive changes only. Existing projects default to `projectAgents: []`.
