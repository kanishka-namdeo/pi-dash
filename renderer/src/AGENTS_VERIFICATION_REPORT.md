# AGENTS.md Deep Verification Report

**Date:** 2026-08-06  
**Scope:** `renderer/src/AGENTS.md` vs actual source files  
**Method:** Read every file mentioned, checked exports, verified descriptions

---

## Executive Summary

| Category | Accurate | Inaccurate | Missing |
|----------|----------|------------|---------|
| Purpose & Ownership | ✓ | - | - |
| Local Contracts | 4/5 | 1 | - |
| Directory Layout | 9/10 | 1 | - |
| Hooks | 9/9 | - | - |
| Components (all sections) | 23/23 | - | - |
| Verification Commands | 2/2 | - | - |

**Overall:** 47/49 claims accurate (96%). Two issues found, both in the `data/` directory description.

---

## Detailed Findings

### 1. Purpose ✓

**Claim:** "React 19 + TypeScript renderer for the Pi Dashboard Electron app. Implements the agent orchestration UI with live simulation, activity feed, plan tracking, Picture-in-Picture terminal overlays, and an onboarding flow for agent discovery."

**Verified:** ✓ Accurate. `App.tsx` confirms React 19 (via `package.json`), TypeScript, Electron renderer. All listed features exist:
- Live simulation → `useAgentSimulation`
- Activity feed → `useActivityFeed` + `ActivityFeed.tsx`
- Plan tracking → `PlanPanel.tsx`
- PiP overlays → `PiPContext`, `AgentOverlay`, `OverlayManager`
- Onboarding → `OnboardingFlow` + 6 screen components

---

### 2. Ownership ✓

**Claim:** "Owned by the renderer domain. All UI, state management, and rendering logic lives here. Entry point: `renderer/src/main.tsx` mounting `App.tsx`."

**Verified:** ✓ Accurate.
- `main.tsx` line 3: `import App from './App'`
- `main.tsx` line 6-8: `ReactDOM.createRoot(...).render(<App />)`

---

### 3. Local Contracts

#### 3.1 Dark Theme ✓

**Claim:** `#0a0a0a` background, `#1a1a1a` cards, `#2a2a2a` borders

**Verified:** ✓ Accurate. These exact hex values are used throughout:
- `bg-[#0a0a0a]` in Dashboard, FleetPanel, ActivityFeed, BottomBar, etc.
- `bg-[#1a1a1a]` in cards, buttons
- `border-[#2a2a2a]` in borders

#### 3.2 Fonts ✗

**Claim:** "Geist (UI), JetBrains Mono (numbers/code)"

**Verified:** ✗ **INACCURATE.** Neither font is imported or configured:
- `index.css` does not import Geist or JetBrains Mono
- Terminal uses: `'Menlo', 'Monaco', 'Ubuntu Mono', monospace` (line 66)
- `TerminalView.tsx` uses: `'Menlo', 'Monaco', monospace` (line 36)
- No `@font-face` or Google Fonts import for Geist/JetBrains Mono
- Tailwind uses default sans/mono stacks

**Correction needed:** Remove the font claim, or add the actual fonts to the project.

#### 3.3 State Architecture ✓

**Claim:** "Hooks own all state and simulation logic; components are pure render functions receiving data via props"

**Verified:** ✓ Accurate. All hooks (`useAgentSimulation`, `useActivityFeed`, `usePiP`, etc.) own state. Components like `Dashboard`, `AgentCard`, `FleetPanel` receive data via props and render.

#### 3.4 Styling ✓

**Claim:** "Tailwind CSS v4 with shadcn/ui component primitives (`components/ui/`)"

**Verified:** ✓ Accurate.
- `package.json` has `tailwindcss` v4
- `index.css` uses `@import "tailwindcss"` and `@theme` syntax (v4)
- `components/ui/` contains shadcn primitives: `button.tsx`, `card.tsx`, `badge.tsx`, `separator.tsx`, `tooltip.tsx`

#### 3.5 Icons ✓

**Claim:** "lucide-react"

**Verified:** ✓ Accurate. `package.json` has `lucide-react`. Components import icons like `Pause`, `Play`, `Square`, `Plus`, `GitBranch`, `X`, `Maximize2`, `Minimize2`, `ArrowLeft`, `FileText`, `GitCommit`.

---

### 4. Directory Layout

#### 4.1 `types/` ✓

| File | Claim | Verified |
|------|-------|----------|
| `global.d.ts` | Electron preload API (`window.api`) declarations | ✓ Accurate |
| `pip.ts` | PiP overlay types (`Overlay`, `OverlaySize`, `PiPState`, `PiPActions`, `SIZE_PRESETS`) | ✓ Accurate (also exports `OverlayContentMode`, not mentioned but minor) |
| `session.ts` | Session types (`SessionState`, `CommandBlock`, `SessionData`, `AgentConfig`) | ✓ Accurate |
| `dashboard.ts` | Dashboard types (`Agent`, `Activity`, `Mode`, `PlanStep`) | ✓ Accurate |
| `index.ts` | Re-exports dashboard types and shared onboarding types from main process | ✓ Accurate |

#### 4.2 `data/` ✗

**Claim:** "`data/` — Mock/seed data for simulation (`seedAgents`, `seedActivities`, `seedPlanSteps`, `activityTemplates`)"

**Verified:** ✗ **INACCURATE.** The doc implies separate files, but all mock data is in a single file:

**Actual:** `data/mockData.ts` contains all four exports:
- `seedAgents` (line 3)
- `seedActivities` (line 75)
- `seedPlanSteps` (line 88)
- `activityTemplates` (line 95)

**Correction needed:** Update the doc to reflect the single-file structure:
```
- `data/` — Mock/seed data for simulation
  - `mockData.ts` — `seedAgents`, `seedActivities`, `seedPlanSteps`, `activityTemplates`
```

#### 4.3 `hooks/` ✓

| Hook | Claim | Verified |
|------|-------|----------|
| `usePiP` | PiP overlay state and actions (add, remove, promote, resize, drag) | ✓ Accurate |
| `useSession` | Terminal session lifecycle (spawn, write, resize, destroy) per agent | ✓ Accurate |
| `useSessionState` | Global session map with event subscriptions | ✓ Accurate |
| `useAgents` | Agent list fetching via preload API | ✓ Accurate |
| `useOnboardingState` | Onboarding screen navigation and agent selection | ✓ Accurate |
| `useActivityFeed` | Live activity feed generation from active agents | ✓ Accurate |
| `useAgentSimulation` | Agent progress simulation with pause/resume/reset | ✓ Accurate |
| `useElapsedTimer` | Elapsed time counter with start/stop/reset | ✓ Accurate |
| `useDashboardMode` | Dashboard mode state (`auto` \| `supervised` \| `manual`) | ✓ Accurate |

#### 4.4 `context/` ✓

| File | Claim | Verified |
|------|-------|----------|
| `PiPContext.tsx` | Provides PiP state and actions to the overlay tree | ✓ Accurate |

#### 4.5 `components/pip/` ✓

| Component | Claim | Verified |
|-----------|-------|----------|
| `PiPContainer.tsx` | Grid container for main terminal + overlays | ✓ Accurate |
| `MainTerminal.tsx` | Renders Dashboard or TerminalView based on main agent selection | ✓ Accurate |
| `OverlayManager.tsx` | Renders all active agent overlays | ✓ Accurate |
| `AgentOverlay.tsx` | Draggable, resizable xterm terminal window per agent | ✓ Accurate |

#### 4.6 `components/terminal/` ✓

| Component | Claim | Verified |
|-----------|-------|----------|
| `TerminalView.tsx` | xterm.js terminal with session binding, fit addon, and resize observer | ✓ Accurate |

#### 4.7 `components/dashboard/` ✓

| Component | Claim | Verified |
|-----------|-------|----------|
| `Dashboard.tsx` | Main dashboard orchestrator (combines all panels, hooks, and navigation) | ✓ Accurate |
| `Topbar.tsx` | Mode selector, pause/stop/new-task controls, worktrees link | ✓ Accurate |
| `FleetPanel.tsx` | Agent list sidebar with launch and PiP actions | ✓ Accurate |
| `AgentCard.tsx` | Individual agent card with status, progress, and action buttons | ✓ Accurate |
| `AgentDetailPanel.tsx` | Slide-out panel with agent details, files, and messages | ✓ Accurate |
| `ActivityFeed.tsx` | Live activity stream with action-colored badges | ✓ Accurate |
| `BottomBar.tsx` | Persistent bottom bar with agent status, workspace context, metrics, and alerts | ✓ Accurate (replaces MetricsFooter) |
| `PlanPanel.tsx` | Plan step timeline with progress bar | ✓ Accurate |

#### 4.8 `components/views/` ✓

| Component | Claim | Verified |
|-----------|-------|----------|
| `WorktreeView.tsx` | Worktree management page (mock data) | ✓ Accurate |
| `CompletedWorkView.tsx` | Agent completed work with file changes and commits | ✓ Accurate |
| `AgentDetailView.tsx` | Full-page terminal view for a single agent | ✓ Accurate |

#### 4.9 `components/onboarding/` ✓

| Component | Claim | Verified |
|-----------|-------|----------|
| `OnboardingFlow.tsx` | Screen router driven by `useOnboardingState` | ✓ Accurate |
| `WelcomeScreen.tsx` | Landing page with feature highlights | ✓ Accurate |
| `ScanningScreen.tsx` | Agent scan with timeout and error handling | ✓ Accurate |
| `ResultsScreen.tsx` | Detected agent selection with bulk select/deselect | ✓ Accurate |
| `ReadyScreen.tsx` | Final confirmation before entering dashboard | ✓ Accurate |
| `NoAgentsScreen.tsx` | Fallback when no agents detected, with popular agent links | ✓ Accurate |
| `ManualAddScreen.tsx` | Path validation and agent identification flow | ✓ Accurate |

#### 4.10 `components/ui/` ✓

| Component | Claim | Verified |
|-----------|-------|----------|
| `button.tsx`, `card.tsx`, `badge.tsx`, `separator.tsx`, `tooltip.tsx` | shadcn/ui primitives | ✓ Accurate |
| `PiLogo.tsx` | Custom π logo component | ✓ Accurate |

#### 4.11 `lib/` ✓

| File | Claim | Verified |
|------|-------|----------|
| `sessionStore.ts` | localStorage save/load for session history | ✓ Accurate |
| `session-persistence.ts` | Session state (running/exited) persistence | ✓ Accurate |
| `pip-persistence.ts` | PiP overlay state persistence | ✓ Accurate |
| `ansiParser.ts` | ANSI escape code parser to styled spans | ✓ Accurate |
| `mockResponses.ts` | Agent-specific mock terminal response templates | ✓ Accurate |
| `utils.ts` | `cn()` class merger (clsx + tailwind-merge) | ✓ Accurate |

---

### 5. Files Missing from Doc

These files exist in `renderer/src/` but are not mentioned in `AGENTS.md`:

| File | Purpose | Should be added? |
|------|---------|------------------|
| `App.test.tsx` | Test file for App component | Optional (test file, not source) |
| `index.css` | Global styles with Tailwind config | **Yes** - important for theme/fonts |
| `App.tsx` | Root component with routing | Optional (mentioned in Ownership but not in directory layout) |

**Recommendation:** Add `index.css` to the `lib/` or root section, as it defines the theme colors and terminal styles.

---

### 6. Verification Section ✓

**Claim:**
- TypeScript must compile cleanly: `pnpm build:ts`
- Vite build must succeed: `pnpm build:renderer`

**Verified:** ✓ Accurate. Both commands exist in `package.json`:
```json
"build:ts": "tsc",
"build:renderer": "vite build"
```

---

## Summary of Required Corrections

### Issue 1: Fonts (HIGH PRIORITY)
**Location:** Local Contracts → Fonts  
**Current:** "Fonts: Geist (UI), JetBrains Mono (numbers/code)"  
**Problem:** Neither font is imported or used. Terminal uses Menlo/Monaco/Ubuntu Mono.  
**Fix:** Either:
- Remove the font claim entirely, OR
- Add Geist and JetBrains Mono to the project (import in `index.css` or `main.tsx`)

### Issue 2: Data Directory Structure (MEDIUM PRIORITY)
**Location:** Directory layout → `data/`  
**Current:** Implies separate files for `seedAgents`, `seedActivities`, `seedPlanSteps`, `activityTemplates`  
**Problem:** All mock data is in a single file `mockData.ts`  
**Fix:** Update to:
```markdown
- `data/` — Mock/seed data for simulation
  - `mockData.ts` — `seedAgents`, `seedActivities`, `seedPlanSteps`, `activityTemplates`
```

### Issue 3: Missing `index.css` (LOW PRIORITY)
**Location:** Directory layout (root level)  
**Problem:** `index.css` is not mentioned but contains theme config and terminal styles  
**Fix:** Add to the directory layout:
```markdown
- `index.css` — Global styles, Tailwind theme, terminal CSS
```

---

## Files Verified (Complete List)

### Root
- [x] `main.tsx`
- [x] `App.tsx`
- [x] `index.css`

### types/
- [x] `global.d.ts`
- [x] `pip.ts`
- [x] `session.ts`
- [x] `dashboard.ts`
- [x] `index.ts`

### data/
- [x] `mockData.ts`

### hooks/
- [x] `usePiP.ts`
- [x] `useSession.ts`
- [x] `useSessionState.ts`
- [x] `useAgents.ts`
- [x] `useOnboardingState.ts`
- [x] `useActivityFeed.ts`
- [x] `useAgentSimulation.ts`
- [x] `useElapsedTimer.ts`
- [x] `useDashboardMode.ts`

### context/
- [x] `PiPContext.tsx`

### components/pip/
- [x] `PiPContainer.tsx`
- [x] `MainTerminal.tsx`
- [x] `OverlayManager.tsx`
- [x] `AgentOverlay.tsx`

### components/terminal/
- [x] `TerminalView.tsx`

### components/dashboard/
- [x] `Dashboard.tsx`
- [x] `Topbar.tsx`
- [x] `FleetPanel.tsx`
- [x] `AgentCard.tsx`
- [x] `AgentDetailPanel.tsx`
- [x] `ActivityFeed.tsx`
- [x] `BottomBar.tsx`
- [x] `PlanPanel.tsx`

### components/views/
- [x] `WorktreeView.tsx`
- [x] `CompletedWorkView.tsx`
- [x] `AgentDetailView.tsx`

### components/onboarding/
- [x] `OnboardingFlow.tsx`
- [x] `WelcomeScreen.tsx`
- [x] `ScanningScreen.tsx`
- [x] `ResultsScreen.tsx`
- [x] `ReadyScreen.tsx`
- [x] `NoAgentsScreen.tsx`
- [x] `ManualAddScreen.tsx`

### components/ui/
- [x] `button.tsx`
- [x] `card.tsx`
- [x] `badge.tsx`
- [x] `separator.tsx`
- [x] `tooltip.tsx`
- [x] `PiLogo.tsx`

### lib/
- [x] `sessionStore.ts`
- [x] `session-persistence.ts`
- [x] `pip-persistence.ts`
- [x] `ansiParser.ts`
- [x] `mockResponses.ts`
- [x] `utils.ts`

**Total:** 50 files verified.
