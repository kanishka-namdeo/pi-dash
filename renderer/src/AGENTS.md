# renderer/src/

## Purpose

React 19 + TypeScript renderer for the Pi Dashboard Electron app. Implements the agent orchestration UI with live terminal sessions, activity feed, plan tracking, Picture-in-Picture terminal overlays, onboarding flow for agent discovery, project setup flow, and GitHub integration (auth, repos, issues, PRs, branches, worktrees).

## Ownership

- Owned by the renderer domain. All UI, state management, and rendering logic lives here.
- Entry point: `renderer/src/main.tsx` mounting `App.tsx`.

## Local Contracts

- **Dark theme**: `#0a0a0a` background, `#1a1a1a` cards, `#2a2a2a` borders
- **Fonts**: System fonts (no external font imports in current build)
- **State architecture**: Hooks own all state and logic; components are pure render functions receiving data via props
- **Styling**: Tailwind CSS v4 with shadcn/ui component primitives (`components/ui/`)
- **Icons**: lucide-react
- **Routing**: react-router-dom with 6 routes (/, /agent/:id, /settings/*, /completed/:id, /pr/:prNumber, /worktrees)

## Work Guidance

### Directory layout

- `types/` — Shared TypeScript interfaces
  - `global.d.ts` — Electron preload API (`window.api`) declarations
  - `pip.ts` — PiP overlay types (`Overlay`, `OverlaySize`, `PiPState`, `PiPActions`, `SIZE_PRESETS`)
  - `session.ts` — Session types (`SessionState`, `CommandBlock`, `SessionData`, `AgentConfig`)
  - `dashboard.ts` — Dashboard types (`Agent`, `Activity`, `FeedEvent`, `Mode`, `PlanStep`)
  - `project-setup.ts` — Project setup flow types (`ScreenName`, `ProjectSetupState`, `CloneError`, `Project`)
  - `settings.ts` — App settings interface (8 sections: general, notifications, keyboard, search, terminal, worktrees, advanced, ignoredDrifts)
  - `index.ts` — Re-exports dashboard types and shared onboarding types from main process
- `index.css` — Global styles, Tailwind directives, theme variables, and terminal styling
- `hooks/` — All stateful logic
  - `usePiP` — PiP overlay state machine (add, remove, promote, resize, drag, z-index management)
  - `useSession` — Per-agent terminal session lifecycle (spawn, write, resize, destroy)
  - `useAgents` — Agent list fetching via preload API
  - `useOnboardingState` — Onboarding screen navigation and agent selection
  - `useElapsedTimer` — Elapsed time counter with start/stop/reset
  - `useProjectSetupState` — Project setup flow state machine (17 screens, full/condensed modes)
  - `useResponsiveLayout` — Responsive breakpoint detection (`sm`/`md`/`lg`/`xl`) with `isCompact` and `isDesignViewport` flags
  - `useSettings` — Settings read/write via preload bridge
  - `useBottomBarAlerts` — Bottom bar alert state management
  - `useCommandPalette` — Command palette search (Fuse.js), navigation, keyboard shortcuts
  - `useRealActivityFeed` — Activity feed from session state changes
  - `useDashboardMode` — Dashboard mode state (auto/supervised/manual)
  - `useAgentScanner` — Agent scanning with background/drift modes
- `context/` — React context providers
  - `PiPContext.tsx` — Provides PiP state and actions to the overlay tree
  - `SessionContext.tsx` — Provides session state, actions, per-agent annotations (working/waiting/paused)
  - `GitHubContext.tsx` — Provides GitHub auth, repos, data, polling state, and auth-expired state to the tree
  - `SettingsContext.tsx` — Provides settings read/write/reset via `useSettings` hook
- `components/pip/` — Picture-in-picture terminal overlay system
  - `OverlayManager.tsx` — Renders all active agent overlays
  - `AgentOverlay.tsx` — Draggable, resizable xterm terminal window per agent
- `components/terminal/` — Terminal view component
  - `TerminalView.tsx` — xterm.js terminal with FitAddon and ResizeObserver
- `components/dashboard/` — Dashboard layout components
  - `Dashboard.tsx` — Main orchestrator (combines all panels, hooks, navigation, overlay states)
  - `Topbar.tsx` — Pause-Stop/New-task controls, worktrees link
  - `FleetPanel.tsx` — Agent list sidebar with launch and PiP actions
  - `AgentCard.tsx` — Individual agent card with status, progress, action buttons, annotation badges
  - `ActivityFeed.tsx` — Live activity stream with action-colored badges
  - `BottomBar.tsx` — Persistent bottom bar with agent status, workspace context, metrics, alerts
  - `ConfigureAgentsDialog.tsx` — Modal to toggle agents on/off for active project
  - `TerminalPanel.tsx` — Terminal view panel
  - `PlanPanel.tsx` — Plan step tracking panel
  - `StepItem.tsx` — Individual plan step item
  - `DriftModal.tsx` — Agent drift detection modal
  - `QuickScanModal.tsx` — Quick scan modal
  - `AddAgentDialog.tsx` — Add agent dialog
- `components/views/` — Detail views (routed pages)
  - `WorktreeView.tsx` — Worktree management page
  - `CompletedWorkView.tsx` — Agent completed work with file changes and commits
  - `AgentDetailView.tsx` — Full-page terminal view for a single agent
- `components/project-setup/` — Project setup flow
  - `ProjectSetupFlow.tsx` — Screen router driven by `useProjectSetupState`
  - `AgentScopeDialog.tsx` — Agent scope selection (global vs project)
  - `screens/` — Individual screens: project selection, recent projects, clone repository/progress/errors, GitHub repo picker, agent scanning/selection, loading states
- `components/onboarding/` — Onboarding flow screens
  - `OnboardingFlow.tsx` — Screen router driven by `useOnboardingState`
  - `WelcomeScreen.tsx` — Landing page with feature highlights
  - `ScanningScreen.tsx` — Agent scan with timeout and error handling
  - `ResultsScreen.tsx` — Detected agent selection with bulk select/deselect
  - `ReadyScreen.tsx` — Final confirmation before entering dashboard
  - `NoAgentsScreen.tsx` — Fallback when no agents detected
  - `ManualAddScreen.tsx` — Path validation and agent identification flow
  - `ScanErrorScreen.tsx` — Scan error handling
- `components/github/` — GitHub integration UI
  - `GitHubPanel.tsx` — Main GitHub panel orchestrator
  - `GitHubSettings.tsx` — Auth (PAT/OAuth) and repo configuration
  - `IssuesTab.tsx` — Issues list for active repo
  - `PRsTab.tsx` — Pull requests list for active repo
  - `BranchesTab.tsx` — Branches list for active repo
  - `CreateWorktreeDialog.tsx` — Create worktree from branch/issue
  - `PRComposer.tsx` — Create/update pull requests
  - `PRFeedbackPanel.tsx` — PR review comments and status
  - `GitHubAuthExpired.tsx` — Full-screen overlay for expired GitHub auth
  - `RateLimitAlert.tsx` — Rate limit warning alert
  - `IssueCommentForm.tsx` — Issue comment composition
- `pages/` — Routed page components
  - `IssuesPage.tsx` — GitHub issues list with search, split-view detail panel
- `components/ui/` — shadcn/ui primitives + custom UI
  - **Layout**: `scroll-area`, `resizable`, `collapsible`
  - **Navigation**: `tabs`, `breadcrumb`, `command`
  - **Forms/Inputs**: `input`, `textarea`, `select`, `checkbox`, `switch`, `radio-group`, `label`, `toggle`, `toggle-group`
  - **Overlays/Modals**: `dialog`, `sheet`, `popover`, `dropdown-menu`, `context-menu`, `hover-card`
  - **Feedback**: `alert`, `progress`, `skeleton`, `spinner`, `sonner` (toast), `badge`, `tooltip`
  - **Data Display**: `avatar`, `card`, `separator`
  - **Actions**: `button`
  - **Custom**: `PiLogo.tsx` (π logo), `AgentIcon.tsx` (gradient agent icons), `AgentDisconnected.tsx`, `EmptyStatePanel.tsx`
  - **Hook**: `use-mobile.tsx` (responsive breakpoint detection)
- `utils/` — Utility functions
  - `agentPathResolver.ts` — Cross-platform agent binary path resolution
  - `agentMapper.ts` — Maps scanned agent data to UI-friendly AgentConfig objects
  - `agentScope.ts` — findNewAgents and mergeAgents utilities
- `lib/` — Utilities, persistence, parsers
  - `sessionStore.ts` — localStorage save/load for session history
  - `session-persistence.ts` — Session state (running/exited) persistence
  - `pip-persistence.ts` — PiP overlay state persistence
  - `searchIndex.ts` — Fuse.js search index for command palette
  - `logger.ts` — Structured logger utility
  - `utils.ts` — `cn()` class merger (clsx + tailwind-merge)

### Key rules

- Do not put state logic in components — delegate to hooks
- Do not import Electron APIs from renderer code; use the preload bridge
- Keep components small and focused; extract when a component exceeds ~150 lines
- **Agent launch guard**: Agents cannot launch without an active project. `handleLaunch`, Ctrl+L shortcut, and `handleReconnect` in `Dashboard.tsx` all check `activeProject !== null` and show a toast error if missing.

## Verification

- TypeScript must compile cleanly: `pnpm build:ts`
- Vite build must succeed: `pnpm build:renderer`

## Child DOX Index

No child `AGENTS.md` files are needed. All renderer subdirectories are owned by this doc.
