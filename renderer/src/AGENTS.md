# renderer/src/

## Purpose

React 19 + TypeScript renderer for the Pi Dashboard Electron app. Implements the agent orchestration UI with live simulation, activity feed, plan tracking, Picture-in-Picture terminal overlays, onboarding flow for agent discovery, and GitHub integration (auth, repos, issues, PRs, branches, worktrees).

## Ownership

- Owned by the renderer domain. All UI, state management, and rendering logic lives here.
- Entry point: `renderer/src/main.tsx` mounting `App.tsx`.

## Local Contracts

- **Dark theme**: `#0a0a0a` background, `#1a1a1a` cards, `#2a2a2a` borders
- **Fonts**: Geist (UI text), Geist Mono (terminal, numbers/code). Loaded via Google Fonts in `renderer/index.html`
- **State architecture**: Hooks own all state and simulation logic; components are pure render functions receiving data via props
- **Styling**: Tailwind CSS v4 with shadcn/ui component primitives (`components/ui/`)
- **Icons**: lucide-react

## Work Guidance

### Directory layout

- `types/` — Shared TypeScript interfaces
  - `global.d.ts` — Electron preload API (`window.api`) declarations
  - `pip.ts` — PiP overlay types (`Overlay`, `OverlaySize`, `PiPState`, `PiPActions`, `SIZE_PRESETS`)
  - `session.ts` — Session types (`SessionState`, `CommandBlock`, `SessionData`, `AgentConfig`)
  - `dashboard.ts` — Dashboard types (`Agent`, `Activity`, `Mode`, `PlanStep`)
  - `index.ts` — Re-exports dashboard types and shared onboarding types from main process
- `index.css` — Global styles, Tailwind directives, theme variables, and terminal styling
- `hooks/` — All stateful logic
  - `usePiP` — PiP overlay state and actions (add, remove, promote, resize, drag)
  - `useSession` — Terminal session lifecycle (spawn, write, resize, destroy) per agent
  - `useSessionState` — Global session map with event subscriptions
  - `useAgents` — Agent list fetching via preload API
  - `useOnboardingState` — Onboarding screen navigation and agent selection
  - `useElapsedTimer` — Elapsed time counter with start/stop/reset
  - `useDashboardMode` — Dashboard mode state (`auto` | `supervised` | `manual`)
  - `useGitHubAuth` — GitHub authentication state and actions
  - `useRepos` — Repository list and active repo management
  - `useGitHubActivity` — GitHub activity feed (issues, PRs)
- `context/` — React context providers
  - `PiPContext.tsx` — Provides PiP state and actions to the overlay tree
  - `SessionContext.tsx` — Provides session state and actions
  - `GitHubContext.tsx` — Provides GitHub auth, repos, data, and auth-expired state to the tree
- `components/pip/` — Picture-in-picture terminal overlay system
  - `PiPContainer.tsx` — Grid container for main terminal + overlays
  - `MainTerminal.tsx` — Renders Dashboard or TerminalView based on main agent selection
  - `OverlayManager.tsx` — Renders all active agent overlays
  - `AgentOverlay.tsx` — Draggable, resizable xterm terminal window per agent
- `components/terminal/` — Terminal view component
  - `TerminalView.tsx` — xterm.js terminal with session binding, fit addon, and resize observer
- `components/dashboard/` — Dashboard layout components
  - `Dashboard.tsx` — Main dashboard orchestrator (combines all panels, hooks, navigation, and overlay states for agent disconnected / GitHub auth expired)
  - `Topbar.tsx` — Mode selector, pause/stop/new-task controls, worktrees link
  - `FleetPanel.tsx` — Agent list sidebar with launch and PiP actions
  - `AgentCard.tsx` — Individual agent card with status, progress, and action buttons
  - `AgentDetailPanel.tsx` — Slide-out panel with agent details, files, and messages
  - `ActivityFeed.tsx` — Live activity stream with action-colored badges
  - `BottomBar.tsx` — Persistent bottom bar with agent status, workspace context, metrics, and alerts (replaces MetricsFooter)
  - `PlanPanel.tsx` — Plan step timeline with progress bar
- `components/views/` — Detail views (routed pages)
  - `WorktreeView.tsx` — Worktree management page with empty state and conflict overlay
  - `CompletedWorkView.tsx` — Agent completed work with file changes and commits
  - `AgentDetailView.tsx` — Full-page terminal view for a single agent
- `components/onboarding/` — Onboarding flow screens
  - `OnboardingFlow.tsx` — Screen router driven by `useOnboardingState`
  - `WelcomeScreen.tsx` — Landing page with feature highlights
  - `ScanningScreen.tsx` — Agent scan with timeout and error handling
  - `ResultsScreen.tsx` — Detected agent selection with bulk select/deselect
  - `ReadyScreen.tsx` — Final confirmation before entering dashboard
  - `NoAgentsScreen.tsx` — Fallback when no agents detected, with popular agent links
  - `ManualAddScreen.tsx` — Path validation and agent identification flow
- `components/github/` — GitHub integration UI
  - `GitHubPanel.tsx` — Main GitHub panel orchestrator
  - `GitHubSettings.tsx` — Auth (PAT/OAuth) and repo configuration
  - `IssuesTab.tsx` — Issues list for active repo
  - `PRsTab.tsx` — Pull requests list for active repo
  - `BranchesTab.tsx` — Branches list for active repo
  - `CreateWorktreeDialog.tsx` — Create worktree from branch/issue
  - `PRComposer.tsx` — Create/update pull requests
  - `PRFeedbackPanel.tsx` — PR review comments and status
  - `GitHubAuthExpired.tsx` — Full-screen overlay for expired GitHub authentication with re-auth and PAT options
- `data/` — Static and mock data
  - `mockData.ts` — Mock data for development/testing
- `components/ui/` — shadcn/ui primitives + custom UI
  - **Layout**: `scroll-area`, `resizable`, `sidebar`, `accordion`, `collapsible`
  - **Navigation**: `tabs`, `breadcrumb`, `menubar`, `navigation-menu`
  - **Forms/Inputs**: `input`, `textarea`, `select`, `checkbox`, `switch`, `radio-group`, `slider`, `label`, `toggle`, `toggle-group`
  - **Overlays/Modals**: `dialog`, `sheet`, `drawer`, `alert-dialog`, `popover`, `dropdown-menu`, `context-menu`, `command`, `hover-card`
  - **Feedback**: `alert`, `progress`, `skeleton`, `spinner`, `sonner` (toast), `badge`, `tooltip`
  - **Data Display**: `table`, `avatar`, `card`, `separator`, `chart`
  - **Actions**: `button`
  - **Custom**: `PiLogo.tsx` (π logo), `AgentIcon.tsx` (gradient agent icons), `AgentDisconnected.tsx` (agent disconnected overlay), `WorktreeConflict.tsx` (worktree merge conflict overlay), `EmptyStatePanel.tsx` (reusable empty state)
  - **Hook**: `use-mobile.tsx` (responsive breakpoint detection)
- `lib/` — Utilities, persistence, parsers
  - `sessionStore.ts` — localStorage save/load for session history
  - `session-persistence.ts` — Session state (running/exited) persistence
  - `pip-persistence.ts` — PiP overlay state persistence
  - `ansiParser.ts` — ANSI escape code parser to styled spans
  - `mockResponses.ts` — Agent-specific mock terminal response templates
  - `utils.ts` — `cn()` class merger (clsx + tailwind-merge)

### Key rules

- Do not put state logic in components — delegate to hooks
- Do not import Electron APIs from renderer code; use the preload bridge
- Keep components small and focused; extract when a component exceeds ~150 lines

## Verification

- TypeScript must compile cleanly: `pnpm build:ts`
- Vite build must succeed: `pnpm build:renderer`

## Child DOX Index

- No child `AGENTS.md` files are needed. All renderer subdirectories are owned by this doc.
