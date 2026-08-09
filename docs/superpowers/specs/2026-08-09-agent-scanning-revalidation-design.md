# Agent Scanning & Re-validation Design

**Date:** 2026-08-09  
**Scope:** Sub-project A — Cases 1, 3, 5 (post-onboarding discovery, re-validation, drift detection)  
**Status:** Approved for implementation

## Overview

Extract agent scanning into a unified `useAgentScanner` hook with four modes, enabling reusable scanning logic across onboarding, dashboard, and settings. Add drift detection on app startup with passive notifications.

## Architecture

```
┌─────────────────┐
│ useAgentScanner │
│  (unified hook) │
└────────┬────────┘
         │
         ├─► Onboarding (mode: 'initial')
         ├─► Dashboard quick-scan (mode: 'incremental')
         ├─► Settings re-scan (mode: 'incremental')
         ├─► Agent re-validation (mode: 'revalidate')
         └─► Startup drift check (mode: 'background')
```

**Component hierarchy:**
```
App.tsx
  ├─► OnboardingFlow
  │     └─► useAgentScanner({ mode: 'initial' })
  │
  ├─► Dashboard
  │     ├─► useAgentScanner({ mode: 'background' }) // startup scan
  │     ├─► QuickScanButton
  │     │     └─► useAgentScanner({ mode: 'incremental' })
  │     └─► DriftNotification (toast/banner)
  │
  └─► Settings
        └─► AgentsSettings
              ├─► useAgentScanner({ mode: 'incremental' })
              └─► useAgentScanner({ mode: 'revalidate' })
```

**Key principle:** The hook is a thin wrapper over existing `window.api.scanAgents()` + adds client-side logic for diffing, validation, and result formatting. No main process changes required for most modes.

## Hook API Design

```ts
interface UseAgentScannerOptions {
  mode: 'initial' | 'incremental' | 'revalidate' | 'background';
  existingAgents?: AgentConfig[]; // for diff/validation
  autoStart?: boolean; // for background mode (default: true)
  onComplete?: (result: ScanResult) => void;
  onError?: (error: Error) => void;
}

interface ScanResult {
  agents: AgentConfig[]; // all scanned agents
  newAgents?: AgentConfig[]; // diff: agents not in existingAgents (incremental mode)
  validations?: AgentValidation[]; // per-agent status (revalidate mode)
  drift?: DriftReport; // summary of changes (background mode)
  scanDuration: number;
  locationsScanned: number;
}

interface AgentValidation {
  agent: AgentConfig;
  status: 'valid' | 'moved' | 'missing' | 'version-changed';
  newPath?: string; // detected new path if moved
  newFingerprint?: string; // detected new fingerprint if version changed
}

interface DriftReport {
  newAgents: AgentConfig[]; // detected but not in config
  missingAgents: AgentConfig[]; // in config but not found
  movedAgents: AgentValidation[]; // path changed
  versionChanges: AgentValidation[]; // fingerprint changed
}

interface UseAgentScannerReturn {
  scan: () => Promise<void>;
  isScanning: boolean;
  error: Error | null;
  result: ScanResult | null;
}

function useAgentScanner(options: UseAgentScannerOptions): UseAgentScannerReturn;
```

**Mode behavior:**

| Mode | Input | Output | Use case |
|---|---|---|---|
| `initial` | No `existingAgents` | `agents` (all detected) | Onboarding |
| `incremental` | `existingAgents` | `agents` + `newAgents` (diff) | Dashboard/settings re-scan |
| `revalidate` | `existingAgents` | `validations[]` (per-agent status) | Check agent health |
| `background` | `existingAgents` | `drift` (summary report) | Startup scan |

**Validation logic (revalidate mode):**
- `valid` — path exists, fingerprint matches
- `moved` — path doesn't exist, but agent binary found elsewhere (search PATH)
- `missing` — path doesn't exist, agent not found anywhere
- `version-changed` — path exists, but fingerprint differs (agent updated)

## Dashboard Integration

**Startup drift check:**
```
App mounts
  └─► useAgentScanner({ mode: 'background', existingAgents: agents })
        └─► If drift detected:
              └─► toast("2 agents need attention", {
                    action: { label: "Review", onClick: openDriftModal }
                  })
```

**Quick-scan button location:**

FleetPanel already has "Add Agent" (manual path input). Add "Scan for Agents" next to it:

```
┌─────────────────────────┐
│ Fleet Panel             │
├─────────────────────────┤
│ [Scan for Agents]       │ ← NEW: triggers incremental scan
│ [Add Agent]             │ ← EXISTS: manual path input
├─────────────────────────┤
│ Running Agents          │
│  • OMP (working)        │
│  • Cursor (working)     │
├─────────────────────────┤
│ Available Agents        │
│  • Aider                │
│  [Configure ⚙]          │ ← EXISTS: project-scoped selection
└─────────────────────────┘
```

**Quick-scan flow:**
1. User clicks "Scan for Agents"
2. Modal opens: "Scanning for agents..." (spinner)
3. Scan completes, modal shows:
   - "3 new agents detected" (if any)
   - List with checkboxes: [x] Aider, [x] Claude Code, [ ] Roo Code
   - [Add Selected] button
4. User confirms, agents added to global config
5. Modal closes, FleetPanel refreshes

**Drift notification modal:**
```
┌─────────────────────────────────┐
│ Agent Configuration Drift       │
├─────────────────────────────────┤
│                                 │
│ ⚠ 1 agent missing               │
│   • Aider (/usr/bin/aider)      │
│     [Remove] [Ignore]           │
│                                 │
│ 🔄 1 agent moved                │
│   • Cursor → /new/path/cursor   │
│     [Update Path] [Ignore]      │
│                                 │
│ ✨ 2 new agents detected        │
│   • [x] Claude Code             │
│   • [x] Roo Code                │
│     [Add Selected]              │
│                                 │
└─────────────────────────────────┘
```

**Key UX decisions:**
- Startup scan is silent (no modal), only toast if drift detected
- Quick-scan is modal-based (focused task)
- Drift modal groups issues by type (missing, moved, new)
- Each issue has inline actions (update, remove, ignore)
- "Ignore" dismisses that specific drift (stored in settings, don't show again)

## Settings Integration

**Current `AgentsSettings.tsx` already has scan/rescan.** We enhance it with validation and status indicators.

**New layout:**
```
┌───────────────────────────────────────────────┐
│ Agents                                    [⚙] │
├───────────────────────────────────────────────┤
│ [Scan for Agents]  [Re-validate All]          │
├───────────────────────────────────────────────┤
│                                               │
│ 🟢 OMP                        /usr/bin/omp    │
│    Oh My Pi                   [Edit] [Remove] │
│                                               │
│ 🟡 Cursor                 /new/path/cursor ⚠  │
│    Cursor IDE               Path changed      │
│    [Update Path] [Ignore]   [Edit] [Remove]   │
│                                               │
│ 🔴 Aider                   /usr/bin/aider ✕   │
│    Aider                    Not found         │
│    [Remove] [Ignore]                          │
│                                               │
│ 🟢 Claude Code         /usr/local/bin/claude  │
│    Claude Code              [Edit] [Remove]   │
│                                               │
└───────────────────────────────────────────────┘
```

**Status indicators:**
| Icon | Meaning | Action |
|---|---|---|
| 🟢 | Valid | None |
| 🟡 | Moved / Version changed | Inline "Update Path" or "Ignore" |
| 🔴 | Missing | Inline "Remove" or "Ignore" |

**Re-validate flow:**
1. User clicks "Re-validate All"
2. Hook runs in `revalidate` mode
3. Each agent gets a status (valid/moved/missing/version-changed)
4. UI updates inline — no modal, no navigation
5. Invalid agents show action buttons directly in the list

**Scan for Agents flow (from settings):**
1. User clicks "Scan for Agents"
2. Hook runs in `incremental` mode
3. If new agents found → expandable section appears at top:
   ```
   ✨ 3 new agents detected
     [x] Aider    [x] Roo Code    [ ] WinCopilot
     [Add Selected]
   ```
4. User selects, clicks "Add Selected"
5. New agents added to list with 🟢 status

**Integration with hook:**
```ts
// In AgentsSettings.tsx
const { scan: revalidate, result: validationResult } = 
  useAgentScanner({ mode: 'revalidate', existingAgents: agents });

const { scan: incrementalScan, result: scanResult } = 
  useAgentScanner({ mode: 'incremental', existingAgents: agents });
```

## Drift Detection Flow

**Startup scan sequence:**
```
App.tsx mounts
  └─► useEffect: loadAgents() → agents
  └─► useEffect: useAgentScanner({ mode: 'background', existingAgents: agents })
        └─► scan() runs silently (no UI)
        └─► If result.drift has items:
              └─► Filter out ignored drifts (from settings)
              └─► If unignored drift remains:
                    └─► toast("N agents need attention", { action: openDriftModal })
```

**Ignored drifts persistence:**

Stored in `settings.json` (not `agents.json`):
```ts
interface Settings {
  // ... existing settings
  ignoredDrifts: Record<string, IgnoredDrift>;
}

interface IgnoredDrift {
  agentId: string;
  type: 'missing' | 'moved' | 'version-changed';
  fingerprint: string; // agent fingerprint at time of ignore
  ignoredAt: string; // ISO timestamp
}
```

**Ignore logic:**
- User clicks "Ignore" on a drift item
- Store `{ agentId, type, fingerprint, ignoredAt }` in settings
- Next startup scan:
  - If same `agentId` + same `fingerprint` → skip (still ignored)
  - If same `agentId` + different `fingerprint` → show drift again (agent updated since ignore)
  - If `agentId` no longer in config → remove from ignored list (cleanup)

**Drift modal actions:**

| Drift Type | Available Actions | Effect |
|---|---|---|
| Missing | Remove, Ignore | Remove deletes from agents.json; Ignore stores in settings |
| Moved | Update Path, Ignore | Update writes new path to agents.json; Ignore stores in settings |
| Version changed | Ignore | Ignore stores in settings (no auto-update, user can manually edit) |
| New agent | Add, Ignore | Add writes to agents.json; Ignore stores in settings |

**Cleanup:**
- On app start, after drift check, prune ignored drifts for agents no longer in config
- Prevents settings.json from growing unbounded

## Data Model Changes

**New types needed:**

```ts
// src/shared/types.ts — add to existing types

export type AgentValidationStatus = 'valid' | 'moved' | 'missing' | 'version-changed';

export interface AgentValidation {
  agent: AgentConfig;
  status: AgentValidationStatus;
  newPath?: string;
  newFingerprint?: string;
}

export interface DriftReport {
  newAgents: AgentConfig[];
  missingAgents: AgentConfig[];
  movedAgents: AgentValidation[];
  versionChanges: AgentValidation[];
}

export interface IgnoredDrift {
  agentId: string;
  type: 'missing' | 'moved' | 'version-changed';
  fingerprint: string;
  ignoredAt: string;
}
```

**Settings type extension:**

```ts
// In settings type definition
export interface AppSettings {
  // ... existing fields
  ignoredDrifts: Record<string, IgnoredDrift>;
}
```

**No changes to `agents.json` or `projects.json` schema.** The existing `AgentConfig` and `AgentsStore` types remain unchanged. We only add new fields to settings for ignored drifts.

**IPC surface — no new handlers needed.** The existing `scan-agents`, `validate-agent`, `identify-agent`, `get-agents`, `save-agents` are sufficient. All diff/validation logic lives in the renderer hook.

## Error Handling

**Scan failures:**

| Scenario | Behavior |
|---|---|
| Scan timeout (>15s) | `onError` called, toast: "Scan timed out. Try again." |
| Scan throws | `onError` called, toast: "Scan failed. Check agent paths." |
| No agents found (incremental) | `result.newAgents` is empty, toast: "No new agents detected" |
| No agents found (initial) | Navigate to `no-agents` screen (existing behavior) |

**Validation failures:**

| Scenario | Behavior |
|---|---|
| Path doesn't exist | `status: 'missing'`, show inline "Remove" / "Ignore" |
| Path exists but binary not found | `status: 'missing'`, same as above |
| Path exists, binary found, fingerprint differs | `status: 'version-changed'`, show inline "Ignore" |
| Path doesn't exist, but binary found elsewhere | `status: 'moved'`, show inline "Update Path" / "Ignore" |
| Auto-fix fails (path update write error) | Toast: "Failed to update path. Try manually." |

**Background scan failures:**
- Silent — no toast, no modal
- Log to console for debugging
- Next app restart will retry

**User-facing error principles:**
1. **Never block the dashboard** — errors are informational, not modal
2. **Always offer a path forward** — every error has a retry or manual action
3. **Degrade gracefully** — if scan fails, show existing agent list unchanged

## Testing Strategy

**Unit tests for `useAgentScanner`:**

| Test | What it verifies |
|---|---|
| `initial` mode returns all scanned agents | Hook calls `scanAgents()`, returns full list |
| `incremental` mode computes correct diff | New agents = scanned − existing (by id) |
| `revalidate` mode checks each agent | Mock `validateAgent` per agent, verify status mapping |
| `background` mode produces drift report | Compare scanned vs existing, categorize into new/missing/moved/version-changed |
| Ignored drifts are filtered | Pass `ignoredDrifts` from settings, verify they're excluded from toast |
| Scan timeout triggers `onError` | Mock slow `scanAgents()`, verify error callback |
| Moved agent detection | Mock path not found + `findInPath` succeeds, verify `status: 'moved'` + `newPath` |

**Integration tests:**

| Test | What it verifies |
|---|---|
| Dashboard quick-scan adds agents | Click "Scan for Agents", select new agents, verify `saveAgents` called with merged list |
| Drift toast appears on startup | Mock drift in background scan, verify toast renders with action button |
| Settings re-validate updates status | Click "Re-validate All", verify status indicators update inline |
| Ignore drift persists | Click "Ignore", verify `settings.ignoredDrifts` updated, next scan skips it |

**What we don't test:**
- Main process scanner internals (already tested in `agent-scanner.test.ts`)
- IPC plumbing (covered by existing handler tests)

## Implementation Notes

**Files to create:**
- `renderer/src/hooks/useAgentScanner.ts` — the unified hook
- `renderer/src/components/dashboard/QuickScanModal.tsx` — modal for quick-scan
- `renderer/src/components/dashboard/DriftModal.tsx` — modal for drift review

**Files to modify:**
- `renderer/src/components/dashboard/FleetPanel.tsx` — add "Scan for Agents" button
- `renderer/src/components/settings/AgentsSettings.tsx` — integrate hook, add status indicators
- `renderer/src/App.tsx` — add background scan on mount
- `src/shared/types.ts` — add new types
- `renderer/src/types/settings.ts` — add `ignoredDrifts` field

**Dependencies:**
- None. Uses existing IPC surface.

**Migration:**
- None. Additive changes only.
