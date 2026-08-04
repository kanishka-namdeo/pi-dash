# Onboarding Flow Design Spec

**Date:** 2026-08-04  
**Status:** Draft  
**Author:** PiDash Team

---

## Overview & Goals

PiDash is a unified dashboard for AI coding agents. This spec defines the first-run onboarding flow that helps users discover and configure agents installed on their system.

### Goals

1. **Zero-config when possible** — auto-detect installed agents without user intervention
2. **Helpful when nothing found** — guide users to popular tools with download links
3. **Manual fallback** — let power users add agents by path
4. **Smart defaults** — auto-fill name/icon from executable, allow overrides
5. **Non-blocking** — scanning runs async, user can skip at any time

### Non-Goals

- Installing agents on behalf of the user (out of scope for v1)
- Deep configuration of agent settings (API keys, models, etc.)
- Agent marketplace or plugin system

---

## Architecture

### Approach: Electron Main Process Detection

The Electron main process handles all agent scanning using Node.js APIs. Detected agents are passed to the renderer via IPC.

```
┌─────────────────────────────────────────────────────────────┐
│  Main Process (Node.js)                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ agent-scanner.ts                                       │  │
│  │  • scanSystem() → Agent[]                              │  │
│  │  • Platform-specific path resolution                   │  │
│  │  • Known agent registry (name, icon, binary patterns)  │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │ IPC: invoke('scan-agents')        │
│                         ▼                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ agent-store.ts                                         │  │
│  │  • loadAgents() / saveAgents()                         │  │
│  │  • Persists to app.getPath('userData')/agents.json     │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │ IPC: invoke('get-agents', etc.)   │
└─────────────────────────┼───────────────────────────────────┘
                          │ contextBridge (preload.ts)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Renderer (React)                                            │
│  • OnboardingFlow component (6 screens)                      │
│  • Dashboard with launch buttons                             │
│  • Calls window.api.scanAgents() / window.api.getAgents()    │
└─────────────────────────────────────────────────────────────┘
```

### Why This Approach

- **Direct filesystem access** — fast scanning without blocking UI
- **Platform-specific logic** — Windows registry, macOS .app bundles, Linux PATH all belong in main
- **Security** — renderer never touches filesystem directly
- **Standard Electron pattern** — main process handles system-level work

---

## Detection Strategy

### Platform-Specific Scan Locations

| Platform | Locations |
|---|---|
| **Windows** | `%LOCALAPPDATA%\Programs`, `%APPDATA%\npm`, `scoop\shims`, `chocolatey\bin`, system PATH |
| **macOS** | `/Applications`, `/usr/local/bin`, `~/Applications`, Homebrew `/opt/homebrew/bin` |
| **Linux** | `/usr/bin`, `/usr/local/bin`, `~/.local/bin`, `~/bin`, system PATH |

### Known Agent Registry

Built into the scanner:

```ts
const KNOWN_AGENTS = [
  { id: 'omp',      name: 'Oh My Pi',    binaries: ['omp', 'omp.exe'],       icon: 'omp'      },
  { id: 'cursor',   name: 'Cursor',      binaries: ['cursor', 'cursor.exe'], icon: 'cursor'   },
  { id: 'aider',    name: 'Aider',       binaries: ['aider', 'aider.exe'],   icon: 'aider'    },
  { id: 'codex',    name: 'Codex CLI',   binaries: ['codex', 'codex.exe'],   icon: 'codex'    },
  { id: 'continue', name: 'Continue',    binaries: ['continue'],             icon: 'continue' },
];
```

### Detection Algorithm

For each known agent:

1. **Check PATH** — use `which` (Unix) or `where` (Windows) to find binary
2. **Check common locations** — scan platform-specific directories
3. **Check Windows registry** — enumerate uninstall entries for installed programs
4. **Deduplicate** — if found in multiple locations, prefer PATH match, then first found

### Smart Defaults for Manual Add

When user adds an agent manually:

1. Extract filename from path
2. Match against known agent patterns (binary name, parent directory)
3. Check for config files in known locations (e.g., `~/.cursor/config`)
4. If match found → auto-fill name + icon
5. If ambiguous → show dropdown of likely matches
6. If unknown → use filename as name, generic icon

---

## Onboarding Flow

### State Machine

```
                    ┌──────────┐
                    │ Welcome  │
                    └────┬─────┘
                         │ Get Started
                         ▼
                    ┌──────────┐
              ┌─────│ Scanning │─────┐
              │     └──────────┘     │
              │ agents found         │ no agents
              ▼                      ▼
         ┌─────────┐           ┌──────────┐
         │ Results │           │ NoAgents │
         └────┬────┘           └────┬─────┘
              │                     │
              │ Continue            │ Add manually
              │                     │
              ▼                     ▼
         ┌─────────┐          ┌───────────┐
         │  Ready  │◄─────────│ ManualAdd │
         └─────────┘          └───────────┘
              │                     ▲
              │ Open Dashboard      │ Add to dashboard
              ▼                     │
         ┌───────────┐              │
         │ Dashboard │              │
         └───────────┘              │
                                    │
              ┌─────────────────────┘
              │ (also reachable from Results via "Add manually")
```

### Screen Components

```
OnboardingFlow.tsx
├── useOnboardingState() hook — manages state machine transitions
├── WelcomeScreen.tsx
├── ScanningScreen.tsx
├── ResultsScreen.tsx
├── ManualAddScreen.tsx
├── ReadyScreen.tsx
└── NoAgentsScreen.tsx
```

### Key Design Decisions

1. **Single container component** — `OnboardingFlow` owns the state machine, passes current screen + transition callbacks to each screen component. Screens are dumb presentational components.

2. **Scanning is async with real-time progress** — `ScanningScreen` calls `window.api.scanAgents()` on mount, shows progress as each location is scanned. When the promise resolves, the container transitions to `Results` or `NoAgents` based on the result.

3. **Agent selection is local state** — on the `ResultsScreen`, which agents are selected/deselected lives in the container's state. Only confirmed agents get persisted when the user clicks "Continue".

4. **Manual add validates thoroughly** — before transitioning to `Ready`, the `ManualAddScreen` calls `window.api.validateAgent(path)` to:
   - Check file exists and is executable
   - Check it's not a directory or symlink loop
   - Platform-specific checks (Windows: .exe/.bat/.cmd; Unix: binary or script)
   - Try running `--version` or `--help` to confirm it's actually an agent (3-second timeout)
   - If invalid, show inline error, don't transition

5. **Skip flow** — "Skip setup" on Welcome goes directly to `ManualAdd`, bypassing scan.

6. **Flexible state machine** — allow backward navigation (Back button on ManualAdd returns to Results), allow re-scanning from dashboard.

### Props Interface

```ts
type OnboardingScreenProps = {
  onNavigate: (screen: ScreenName) => void;
  agents: AgentConfig[];
  selectedAgents: string[];
  onToggleAgent: (id: string) => void;
  onAddAgent: (agent: AgentConfig) => void;
};
```

---

## Data Model

### AgentConfig

```ts
type AgentConfig = {
  id: string;           // unique (uuid for manual, known id for detected)
  name: string;         // display name
  icon: string;         // icon key → maps to color/gradient
  path: string;         // absolute path to executable
  source: 'detected' | 'manual';
  fingerprint?: string; // binary name + version hash for deduplication
};
```

### AgentsStore (persisted)

```ts
type AgentsStore = {
  version: 1;  // for future migrations
  agents: AgentConfig[];
  lastScan: number;  // timestamp
  onboardingCompleted: boolean;
};
```

**Persistence location:** `app.getPath('userData')/agents.json`

**Migration strategy:** Check `version` field on load. If older than current, run migration functions in sequence.

---

## Error Handling

| Failure | Behavior |
|---|---|
| **Directory unreadable** (permissions, broken symlink) | Skip it, add warning to scan results: *"Couldn't read ~/scoop/shims — permission denied"* |
| **PATH is empty or broken** | Fall back to known install locations only. Show: *"System PATH appears empty, scanning common locations instead."* |
| **Scan takes > 15 seconds** | Show elapsed time, offer "Skip scan — add manually" button |
| **Scan crashes entirely** | Catch at top level, transition to ManualAdd with message: *"Automatic detection failed. You can add agents manually."* |
| **Executable validation fails** | Inline error on ManualAdd: *"This file doesn't appear to be a valid executable"* — don't transition |
| **`--version` check hangs** | 3-second timeout, treat as "unknown agent" — still allow add but mark as unverified |

---

## Edge Cases

### Duplicate Agents

**Scenario:** User adds `omp.exe` manually at path A. Later, scan finds `omp.exe` at path B.

**Resolution:** Fingerprint match (same binary name + version) → show merge prompt: *"We found another copy of Oh My Pi. Update the path?"*

If no fingerprint match → add as separate agent.

### Agent Removed After Onboarding

**Scenario:** User completes onboarding, then uninstalls an agent.

**Resolution:** Dashboard shows agent with "not found" status. Launch button disabled, tooltip: *"Executable not found at C:\..."*. "Fix" button → opens ManualAdd pre-filled with old path.

### Multiple Instances of Same Tool

**Scenario:** User has OMP installed in two locations (work + personal).

**Resolution:** Both detected → show both with distinct names: *"Oh My Pi (work)"*, *"Oh My Pi (personal)"*. User can rename via dashboard.

### Agent Binary Renamed

**Scenario:** User renames `cursor.exe` to `my-cursor.exe`.

**Resolution:** Smart defaults won't match → falls back to generic icon + filename as name. User can fix via "Manage Agents".

---

## Re-entry Points

### From Dashboard

- **"Manage Agents" button** in header → opens agent list with add/edit/remove
- Reuses `ManualAddScreen` and `ResultsScreen` components
- Can trigger re-scan: *"Scan for new agents"* button

### From Settings (Future)

- Agent configuration page → same components
- Import/export agent configs (JSON file)

### Programmatic Re-onboarding

- Delete `agents.json` or set `onboardingCompleted: false`
- Next launch shows full onboarding flow

---

## First-Run Detection

```ts
// In main process, before creating window:
const store = await loadAgentsStore();
const showOnboarding = !store.onboardingCompleted;

// Pass to renderer via IPC
mainWindow.webContents.send('app-state', { showOnboarding });
```

Renderer checks this on mount:
- `showOnboarding === true` → render `OnboardingFlow`
- `showOnboarding === false` → render `Dashboard`

---

## Launch Strategy

When user clicks "Launch" on an agent:

1. Main process spawns detached child process: `child_process.spawn(agent.path, [], { detached: true, stdio: 'ignore' })`
2. Store process ID in agent config: `agent.pid = child.pid`
3. Dashboard monitors process status via PID
4. If process exits, update UI: agent status → "stopped"

**Future:** For agents with UIs (Cursor, VS Code), use `shell.openPath()` instead of spawn.

---

## Testing Strategy

### Unit Tests

**agent-scanner.ts:**
- `scanSystem()` finds known agents in mock filesystem
- `scanSystem()` handles unreadable directories gracefully
- `scanSystem()` deduplicates agents found in multiple locations
- `validateAgent()` rejects non-existent paths
- `validateAgent()` rejects directories
- `validateAgent()` accepts valid executables
- `fingerprintAgent()` generates consistent IDs from binary name + version

**agent-store.ts:**
- `loadAgents()` returns empty array if file doesn't exist
- `loadAgents()` migrates old schema versions
- `saveAgents()` creates parent directory if missing
- `saveAgents()` handles concurrent writes

### Integration Tests

**Onboarding flow:**
- Welcome → Get Started → Scanning → Results → Ready → Dashboard
- Welcome → Skip → ManualAdd → Ready → Dashboard
- Scanning finds 0 agents → NoAgents screen shown
- Results with 0 selected → "Continue" disabled
- ManualAdd with invalid path → error shown, no transition

### Manual Testing Checklist

- [ ] Fresh install: onboarding shows, scan finds agents
- [ ] Fresh install: onboarding shows, scan finds nothing → NoAgents screen
- [ ] Fresh install: skip setup → ManualAdd works
- [ ] Existing install: onboarding skipped, dashboard shows directly
- [ ] Manual add: valid path → agent added, appears in dashboard
- [ ] Manual add: invalid path → error shown
- [ ] Dashboard: launch button spawns process
- [ ] Dashboard: agent removed externally → "not found" status
- [ ] Dashboard: "Manage Agents" → can add/edit/remove

### What We're NOT Testing

- UI pixel-perfection (visual regression tools handle that)
- Cross-platform path resolution (manual test matrix covers it)
- Performance under thousands of agents (not a realistic scenario)

---

## Future Considerations

### Out of Scope for v1

- **Agent installation** — downloading and installing agents from within PiDash
- **Deep configuration** — managing API keys, model selection, agent-specific settings
- **Agent marketplace** — discovering and installing new agent types
- **Cloud sync** — sharing agent configs across machines
- **Agent templates** — pre-configured agent profiles for common workflows

### Potential v2 Features

- **Auto-update agents** — check for new versions, prompt to update
- **Agent health monitoring** — track resource usage, detect hangs
- **Workflow automation** — chain agents together, trigger sequences
- **Collaboration** — share agent configs with team members

---

## Success Criteria

The onboarding flow is successful if:

1. **>80% of users** with installed agents complete onboarding without manual intervention
2. **<5% of users** abandon onboarding mid-flow
3. **<10% of users** need to re-run onboarding due to configuration errors
4. **User feedback** indicates the flow is "helpful" or "intuitive" (not "confusing" or "frustrating")

---

## Open Questions

1. **Should we offer to install agents from the NoAgents screen?**  
   - Pro: Reduces friction, keeps users in the app  
   - Con: Adds complexity, potential security concerns with auto-installers  
   - **Decision:** Out of scope for v1. Revisit based on user feedback.

2. **Should we support agent profiles (work vs personal)?**  
   - Pro: Useful for users with multiple setups  
   - Con: Adds UI complexity, most users won't need it  
   - **Decision:** Out of scope for v1. Can be added as a "Manage Agents" feature later.

3. **Should we validate agents by running them?**  
   - Pro: Catches broken installs, confirms agent type  
   - Con: Slows down scanning, potential side effects  
   - **Decision:** Yes, but with a 3-second timeout and graceful fallback.

---

## Appendix: Mockup

A clickable HTML mockup demonstrating the full onboarding flow is available at:  
`D:/test_misc/pi-dash/onboarding-mockup.html`

Open in any browser to walk through all 6 screens.
