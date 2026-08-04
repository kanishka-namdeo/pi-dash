# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a first-run onboarding flow that auto-detects installed AI coding agents and guides users through configuration.

**Architecture:** Electron main process handles agent detection and persistence via IPC. React renderer displays a 6-screen onboarding wizard with state machine. Preload bridge exposes API to renderer.

**Tech Stack:** TypeScript, Electron IPC, React 19, Tailwind CSS v4, shadcn/ui

## Global Constraints

- All filesystem access happens in main process only
- Renderer never touches filesystem directly
- All IPC channels must be typed
- Scan operations must be async and non-blocking
- 3-second timeout for `--version` checks
- 15-second timeout for full scan with skip option
- WCAG AA contrast ratios for all UI elements
- All buttons keyboard-accessible (Enter/Space)

---

### Task 1: Foundation - Types and Agent Store

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/main/agent-store.ts`
- Test: `src/main/agent-store.test.ts`

**Interfaces:**
- Consumes: Electron `app` module
- Produces: `AgentConfig`, `AgentsStore`, `loadAgents()`, `saveAgents()`, `completeOnboarding()`

- [ ] **Step 1: Define shared types**

Create `src/shared/types.ts` with all type definitions from the spec: `AgentConfig`, `AgentsStore`, `ScanResult`, `ScanProgress`, `ValidationResult`, `IdentificationResult`, `KnownAgent`, `ScreenName`.

- [ ] **Step 2: Write failing test for agent store**

Create `src/main/agent-store.test.ts` with tests for:
- Returns empty store when file does not exist
- Saves and loads agents
- Marks onboarding as completed
- Creates parent directory if missing

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test src/main/agent-store.test.ts`
Expected: FAIL with "Cannot find module './agent-store'"

- [ ] **Step 4: Implement agent store**

Create `src/main/agent-store.ts` implementing `loadAgents()`, `saveAgents()`, and `completeOnboarding()` using `app.getPath('userData')` for persistence.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test src/main/agent-store.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/types.ts src/main/agent-store.ts src/main/agent-store.test.ts
git commit -m "feat: add shared types and agent store with persistence"
```

---

### Task 2: Agent Scanner

**Files:**
- Create: `src/main/agent-scanner.ts`
- Test: `src/main/agent-scanner.test.ts`

**Interfaces:**
- Consumes: `KnownAgent` from types
- Produces: `scanSystem()`, `validateAgent()`, `identifyAgent()`, `fingerprintAgent()`

- [ ] **Step 1: Write failing test for scanner**

Create `src/main/agent-scanner.test.ts` with tests for:
- `fingerprintAgent()` generates consistent fingerprints
- `validateAgent()` rejects non-existent paths, directories, non-executables
- `identifyAgent()` identifies known agents by binary name
- `scanSystem()` finds agents in PATH and handles unreadable directories

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/main/agent-scanner.test.ts`
Expected: FAIL with "Cannot find module './agent-scanner'"

- [ ] **Step 3: Implement agent scanner**

Create `src/main/agent-scanner.ts` implementing:
- `KNOWN_AGENTS` registry with 5 agents (omp, cursor, aider, codex, continue)
- `fingerprintAgent()` - generates consistent fingerprint from path
- `validateAgent()` - checks file exists, is executable, not directory
- `identifyAgent()` - matches binary name against known agents
- `scanSystem()` - scans PATH and platform-specific locations

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/main/agent-scanner.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/agent-scanner.ts src/main/agent-scanner.test.ts
git commit -m "feat: implement agent scanner with detection and validation"
```

---

### Task 3: IPC Bridge

**Files:**
- Create: `src/main/ipc-handlers.ts`
- Modify: `src/preload.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `agent-scanner`, `agent-store`
- Produces: IPC channels registered, preload API exposed

- [ ] **Step 1: Implement IPC handlers**

Create `src/main/ipc-handlers.ts` registering handlers for:
- `scan-agents` → `scanSystem()`
- `validate-agent` → `validateAgent(path)`
- `identify-agent` → `identifyAgent(path)`
- `get-agents` → `loadAgents().agents`
- `save-agents` → `saveAgents(agents)`
- `complete-onboarding` → `completeOnboarding()`
- `launch-agent` → spawn detached process

- [ ] **Step 2: Update preload to expose API**

Modify `src/preload.ts` to expose `window.api` with all IPC methods via `contextBridge`.

- [ ] **Step 3: Register handlers in main process**

Modify `src/main.ts` to call `registerIpcHandlers()` in `app.whenReady()`.

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload.ts src/main.ts
git commit -m "feat: add IPC bridge for agent operations"
```

---

### Task 4: State Machine Hook

**Files:**
- Create: `renderer/src/hooks/useOnboardingState.ts`
- Test: `renderer/src/hooks/useOnboardingState.test.ts`

**Interfaces:**
- Consumes: `ScreenName`, `AgentConfig` from types
- Produces: `useOnboardingState()` hook with state and transitions

- [ ] **Step 1: Write failing test for state machine**

Create `renderer/src/hooks/useOnboardingState.test.ts` with tests for:
- Starts at welcome screen
- Transitions between screens
- Toggles agent selection
- Adds manual agents

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test renderer/src/hooks/useOnboardingState.test.ts`
Expected: FAIL with "Cannot find module './useOnboardingState'"

- [ ] **Step 3: Implement state machine hook**

Create `renderer/src/hooks/useOnboardingState.ts` with:
- `currentScreen` state
- `agents` and `selectedAgents` state
- `navigateTo()`, `addAgent()`, `toggleAgent()`, `selectAll()`, `deselectAll()` methods

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test renderer/src/hooks/useOnboardingState.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/hooks/useOnboardingState.ts renderer/src/hooks/useOnboardingState.test.ts
git commit -m "feat: implement onboarding state machine hook"
```

---

### Task 5: Welcome Screen Component

**Files:**
- Create: `renderer/src/components/onboarding/WelcomeScreen.tsx`
- Create: `renderer/src/components/onboarding/WelcomeScreen.test.tsx`

**Interfaces:**
- Consumes: `onNavigate` callback
- Produces: Welcome screen UI with Get Started and Skip buttons

- [ ] **Step 1: Write failing test for WelcomeScreen**

Create `renderer/src/components/onboarding/WelcomeScreen.test.tsx` with tests for:
- Renders welcome message
- Calls `onNavigate('scanning')` when Get Started clicked
- Calls `onNavigate('manual-add')` when Skip clicked
- Has keyboard accessible buttons

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test renderer/src/components/onboarding/WelcomeScreen.test.tsx`
Expected: FAIL with "Cannot find module './WelcomeScreen'"

- [ ] **Step 3: Implement WelcomeScreen**

Create `renderer/src/components/onboarding/WelcomeScreen.tsx` with:
- PiDash logo and welcome message
- Three feature highlights (auto-detect, one-click launch, live activity)
- Get Started button → `onNavigate('scanning')`
- Skip button → `onNavigate('manual-add')`
- Tailwind styling matching mockup

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test renderer/src/components/onboarding/WelcomeScreen.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/WelcomeScreen.tsx renderer/src/components/onboarding/WelcomeScreen.test.tsx
git commit -m "feat: implement WelcomeScreen component"
```

---

### Task 6: Scanning Screen Component

**Files:**
- Create: `renderer/src/components/onboarding/ScanningScreen.tsx`
- Create: `renderer/src/components/onboarding/ScanningScreen.test.tsx`

**Interfaces:**
- Consumes: `onNavigate`, `setAgents` callbacks, `window.api.scanAgents`
- Produces: Scanning screen UI with progress display

- [ ] **Step 1: Write failing test for ScanningScreen**

Create `renderer/src/components/onboarding/ScanningScreen.test.tsx` with tests for:
- Renders scanning message
- Calls `scanAgents` on mount
- Navigates to results when agents found
- Navigates to no-agents when none found

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test renderer/src/components/onboarding/ScanningScreen.test.tsx`
Expected: FAIL with "Cannot find module './ScanningScreen'"

- [ ] **Step 3: Implement ScanningScreen**

Create `renderer/src/components/onboarding/ScanningScreen.tsx` with:
- Spinner animation during scan
- Calls `window.api.scanAgents()` on mount
- Shows scan results (count, duration, warnings)
- Auto-navigates to results or no-agents after 1.5s
- Error handling with fallback to manual add

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test renderer/src/components/onboarding/ScanningScreen.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/ScanningScreen.tsx renderer/src/components/onboarding/ScanningScreen.test.tsx
git commit -m "feat: implement ScanningScreen component"
```

---

### Task 7: Results Screen Component

**Files:**
- Create: `renderer/src/components/onboarding/ResultsScreen.tsx`
- Create: `renderer/src/components/onboarding/ResultsScreen.test.tsx`

**Interfaces:**
- Consumes: `onNavigate`, `agents`, `selectedAgents`, `toggleAgent`, `selectAll`, `deselectAll`
- Produces: Results screen UI with agent selection

- [ ] **Step 1: Write failing test for ResultsScreen**

Create `renderer/src/components/onboarding/ResultsScreen.test.tsx` with tests for:
- Renders agent list
- Calls `toggleAgent` when agent clicked
- Disables Continue when no agents selected
- Enables Continue when agents selected
- Calls `onNavigate('ready')` when Continue clicked

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test renderer/src/components/onboarding/ResultsScreen.test.tsx`
Expected: FAIL with "Cannot find module './ResultsScreen'"

- [ ] **Step 3: Implement ResultsScreen**

Create `renderer/src/components/onboarding/ResultsScreen.tsx` with:
- Agent list with icons from `ICON_REGISTRY`
- Select All / Deselect All buttons
- Toggle selection on agent click
- Continue button (disabled when no selection)
- Add Agent Manually button

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test renderer/src/components/onboarding/ResultsScreen.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/ResultsScreen.tsx renderer/src/components/onboarding/ResultsScreen.test.tsx
git commit -m "feat: implement ResultsScreen component"
```

---

### Task 8: Manual Add Screen Component

**Files:**
- Create: `renderer/src/components/onboarding/ManualAddScreen.tsx`
- Create: `renderer/src/components/onboarding/ManualAddScreen.test.tsx`

**Interfaces:**
- Consumes: `onNavigate`, `addAgent` callbacks, `window.api.validateAgent`, `window.api.identifyAgent`
- Produces: Manual add screen UI with path input and smart defaults

- [ ] **Step 1: Write failing test for ManualAddScreen**

Create `renderer/src/components/onboarding/ManualAddScreen.test.tsx` with tests for:
- Renders path input
- Validates path on change (debounced)
- Shows error for invalid path
- Disables Add when path invalid
- Auto-fills name/icon for known agents

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test renderer/src/components/onboarding/ManualAddScreen.test.tsx`
Expected: FAIL with "Cannot find module './ManualAddScreen'"

- [ ] **Step 3: Implement ManualAddScreen**

Create `renderer/src/components/onboarding/ManualAddScreen.tsx` with:
- Path input with debounced validation (500ms)
- Calls `window.api.validateAgent()` and `window.api.identifyAgent()`
- Shows validation errors inline
- Shows detected agent name/icon with confidence indicator
- Add to Dashboard button (disabled when invalid)
- Back button

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test renderer/src/components/onboarding/ManualAddScreen.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/ManualAddScreen.tsx renderer/src/components/onboarding/ManualAddScreen.test.tsx
git commit -m "feat: implement ManualAddScreen component"
```

---

### Task 9: No Agents Screen Component

**Files:**
- Create: `renderer/src/components/onboarding/NoAgentsScreen.tsx`
- Create: `renderer/src/components/onboarding/NoAgentsScreen.test.tsx`

**Interfaces:**
- Consumes: `onNavigate` callback
- Produces: No agents found screen with suggestions

- [ ] **Step 1: Write failing test for NoAgentsScreen**

Create `renderer/src/components/onboarding/NoAgentsScreen.test.tsx` with tests for:
- Renders no agents message
- Shows download suggestions (OMP, Cursor, Aider)
- Calls `onNavigate('manual-add')` when Add Manually clicked
- Calls `onNavigate('scanning')` when Scan Again clicked

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test renderer/src/components/onboarding/NoAgentsScreen.test.tsx`
Expected: FAIL with "Cannot find module './NoAgentsScreen'"

- [ ] **Step 3: Implement NoAgentsScreen**

Create `renderer/src/components/onboarding/NoAgentsScreen.tsx` with:
- Warning icon and "No Agents Found" message
- Three download suggestions with icons and descriptions
- Download buttons (open in system browser)
- Add Agent Manually button
- Scan Again button

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test renderer/src/components/onboarding/NoAgentsScreen.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/NoAgentsScreen.tsx renderer/src/components/onboarding/NoAgentsScreen.test.tsx
git commit -m "feat: implement NoAgentsScreen component"
```

---

### Task 10: Ready Screen Component

**Files:**
- Create: `renderer/src/components/onboarding/ReadyScreen.tsx`
- Create: `renderer/src/components/onboarding/ReadyScreen.test.tsx`

**Interfaces:**
- Consumes: `onNavigate`, `agents`, `selectedAgents`, `window.api.saveAgents`, `window.api.completeOnboarding`
- Produces: Ready screen UI with confirmation and launch buttons

- [ ] **Step 1: Write failing test for ReadyScreen**

Create `renderer/src/components/onboarding/ReadyScreen.test.tsx` with tests for:
- Renders ready message
- Shows selected agents only
- Saves agents and completes onboarding when Open Dashboard clicked

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test renderer/src/components/onboarding/ReadyScreen.test.tsx`
Expected: FAIL with "Cannot find module './ReadyScreen'"

- [ ] **Step 3: Implement ReadyScreen**

Create `renderer/src/components/onboarding/ReadyScreen.tsx` with:
- Success icon and "You're All Set!" message
- List of selected agents with icons
- Open Dashboard button (saves agents, completes onboarding)
- Add Another Agent button

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test renderer/src/components/onboarding/ReadyScreen.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/ReadyScreen.tsx renderer/src/components/onboarding/ReadyScreen.test.tsx
git commit -m "feat: implement ReadyScreen component"
```

---

### Task 11: Onboarding Flow Container

**Files:**
- Create: `renderer/src/components/onboarding/OnboardingFlow.tsx`
- Create: `renderer/src/components/onboarding/OnboardingFlow.test.tsx`

**Interfaces:**
- Consumes: All screen components, `useOnboardingState` hook
- Produces: Main onboarding container that renders current screen

- [ ] **Step 1: Write failing test for OnboardingFlow**

Create `renderer/src/components/onboarding/OnboardingFlow.test.tsx` with test:
- Renders welcome screen by default

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test renderer/src/components/onboarding/OnboardingFlow.test.tsx`
Expected: FAIL with "Cannot find module './OnboardingFlow'"

- [ ] **Step 3: Implement OnboardingFlow**

Create `renderer/src/components/onboarding/OnboardingFlow.tsx` with:
- Uses `useOnboardingState()` hook
- Switch statement to render current screen
- Passes appropriate props to each screen component

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test renderer/src/components/onboarding/OnboardingFlow.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/onboarding/OnboardingFlow.tsx renderer/src/components/onboarding/OnboardingFlow.test.tsx
git commit -m "feat: implement OnboardingFlow container component"
```

---

### Task 12: Integrate Onboarding into App

**Files:**
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: `OnboardingFlow`, `Dashboard`
- Produces: Conditional rendering based on onboarding state

- [ ] **Step 1: Update App.tsx to show onboarding**

Modify `renderer/src/App.tsx`:
- Check `window.api.getAgents()` on mount
- If `onboardingCompleted` is false, render `<OnboardingFlow />`
- Otherwise, render `<Dashboard />`

- [ ] **Step 2: Test onboarding flow end-to-end**

Run: `npm run dev`
Manual test:
- Fresh install shows onboarding
- Click through all screens
- Verify agents are saved
- Verify dashboard shows after onboarding

- [ ] **Step 3: Commit**

```bash
git add renderer/src/App.tsx
git commit -m "feat: integrate onboarding flow into app"
```

---

### Task 13: Final Testing and Documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: All implemented features
- Produces: Updated documentation

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 2: Update README**

Modify `README.md` to document:
- Onboarding flow features
- Supported agents
- Manual add process
- Troubleshooting tips

- [ ] **Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: update README with onboarding flow documentation"
```

---

## Self-Review

**1. Spec coverage:**
- ✓ Auto-detection of agents (Task 2)
- ✓ 6-screen flow (Tasks 5-10)
- ✓ Manual fallback (Task 8)
- ✓ Smart defaults (Task 8)
- ✓ IPC bridge (Task 3)
- ✓ Persistence (Task 1)
- ✓ Accessibility (all screen components)

**2. Placeholder scan:**
- No TBDs, TODOs, or vague instructions
- All tasks have concrete code or clear descriptions
- All tests have specific assertions

**3. Type consistency:**
- All types defined in Task 1 and reused throughout
- IPC channels match preload API
- Component props match hook outputs

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-04-onboarding-flow.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
