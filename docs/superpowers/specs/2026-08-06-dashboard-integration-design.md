# Dashboard Integration Design

> **Feature:** Wire real PTY session data into the dashboard and fix the navigation model  
> **Date:** 2026-08-06  
> **Status:** Approved for implementation

## Overview

Integrate the Dashboard with live PTY session data and fix the navigation model so users can seamlessly move between the fleet overview and focused agent terminals. Replace simulated agent data with real session state, add a toggle button to switch between Dashboard and Terminal views, and restructure the fleet panel into Running/Available sections.

## Design Decisions

### Architecture: Global Session Context

**Decision:** Create a `SessionContext` at the App level that tracks all active PTY sessions as a single source of truth.

**Rationale:**
- Single source of truth for session state across Dashboard, overlays, and main terminal
- Clean separation — components query context, don't manage their own session tracking
- Activity feed gets consistent data from one stream
- More refactoring than alternatives, but worth it for consistency and maintainability

**Alternatives considered:**
- Session Manager Hook: less refactoring but multiple sources of truth
- Event Bus Pattern: minimal changes but potential for inconsistency

### Navigation: Toggle Button

**Decision:** Add a toggle button in the topbar to switch between Dashboard and Terminal views.

**Rationale:**
- Keeps the PiP layout as the primary workspace
- Dashboard is always one click away, even when an agent is focused
- Simpler than sidebar or overlay approaches
- Preserves the cockpit aesthetic

### Fleet Panel: Two Sections

**Decision:** Split the fleet panel into "Running" (active sessions) and "Available" (detected but not started) sections.

**Rationale:**
- Clear visual distinction between active and idle agents
- Running section shows live data (elapsed time, command count, status)
- Available section shows detected agents ready to launch
- Matches the mental model: "what's running" vs "what can I start"

### Activity Feed: Commands + Lifecycle

**Decision:** Show command executions (parsed from PTY output) plus lifecycle events (session started/exited).

**Rationale:**
- More detailed than lifecycle-only, less noisy than live output snippets
- Commands are the primary unit of work in a terminal
- Lifecycle events provide context (when sessions start/stop)
- Collapsible output previews keep the feed scannable

### Topbar Controls: Feed-Only

**Decision:** Pause/resume only affects the activity feed display, not the actual PTY sessions. Stop clears the feed buffer.

**Rationale:**
- Users need to control the information display, not the running agents
- Sessions are managed individually from agent cards or overlay controls
- Prevents accidental mass-kill of running agents
- Clearer mental model: feed controls are about viewing, not controlling

## Architecture

### Component Hierarchy

```
App
└── PiPProvider (existing — manages overlays + mainAgentId)
    └── SessionProvider (NEW — tracks all active PTY sessions)
        └── BrowserRouter
            └── PiPContainer
                ├── MainTerminal (or Dashboard, toggled)
                │   ├── Dashboard (subscribes to SessionContext)
                │   │   ├── Topbar (toggle button, activity feed controls)
                │   │   ├── FleetPanel (Running / Available sections)
                │   │   ├── ActivityFeed (commands + lifecycle from SessionContext)
                │   │   └── MetricsFooter (real elapsed time, active count)
                │   └── TerminalView (when mainAgentId is set)
                └── OverlayManager
                    └── AgentOverlay[] (each uses useSession, registers with SessionContext)
```

### SessionContext Design

```ts
type SessionInfo = {
  agentId: string;
  state: 'idle' | 'running' | 'exited';
  pid: number | null;
  cwd: string;
  createdAt: number;
  lastActiveAt: number;
  commandHistory: CommandBlock[];  // Parsed from PTY output
};

type SessionContextType = {
  sessions: Map<string, SessionInfo>;
  registerSession: (agentId: string, pid: number, cwd: string) => void;
  unregisterSession: (agentId: string) => void;
  updateSessionState: (agentId: string, state: 'running' | 'exited') => void;
  appendCommand: (agentId: string, command: CommandBlock) => void;
  getSession: (agentId: string) => SessionInfo | undefined;
  getActiveSessions: () => SessionInfo[];
};
```

### Integration with Existing useSession

The existing `useSession` hook stays mostly the same, but now it:
1. Calls `registerSession()` after successful spawn
2. Calls `unregisterSession()` on exit
3. Calls `updateSessionState()` on state changes
4. Parses PTY output and calls `appendCommand()` for each command block

This way, every terminal (main, overlays) automatically registers with the global context, and the Dashboard can query it.

### Toggle Button State

```ts
type ViewMode = 'dashboard' | 'terminal';

// In PiPContext or separate UIContext
const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
```

When `mainAgentId` is null, always show Dashboard. When `mainAgentId` is set, toggle between Dashboard and TerminalView.

## Navigation Model

### View Toggle

The topbar gets a toggle button that switches between Dashboard and the main terminal view.

```
┌─────────────────────────────────────────────────────┐
│  [PiDash]  [Dashboard | Terminal]  [⏸] [■]  [...]  │
└─────────────────────────────────────────────────────┘
```

**Toggle behavior:**
- When `mainAgentId === null`: toggle is disabled (Dashboard is the only view)
- When `mainAgentId` is set: toggle switches between Dashboard and TerminalView
- Default view when an agent is focused: TerminalView
- Dashboard button always accessible to jump back to fleet overview

### Setting Main Agent

From the Dashboard's FleetPanel, agent cards get a new action:

**"Focus as Main"** — sets the agent as `mainAgentId` and switches view to TerminalView
- If agent has no active session → prompts for working directory, then spawns session
- If agent already has a session → just focuses it

**Existing actions remain:**
- "Open as Overlay" → adds PiP overlay (unchanged)
- "View Details" → navigates to `/agent/:agentId` route (unchanged)

### Navigation Flow

```
Dashboard (default view)
  ├─ Click agent card "Focus as Main" → setMainAgent(id) → TerminalView
  │   └─ Toggle "Dashboard" → Dashboard (session keeps running)
  │   └─ Toggle "Terminal" → TerminalView
  ├─ Click "Open as Overlay" → addOverlay(id) → overlay appears
  │   └─ Click overlay "Promote" → promoteToMain(id) → TerminalView
  └─ Click "View Details" → navigate('/agent/:id') → AgentDetailView (separate route)
```

### Route Cleanup

The current `/agent/:agentId` route for AgentDetailView remains for deep-dive views. But the primary workflow stays within the PiP layout:
- `/` → PiPContainer (Dashboard + TerminalView toggle + Overlays)
- `/agent/:agentId` → AgentDetailView (separate page, back button returns to `/`)

### State Persistence

- `viewMode` persisted in localStorage (restore last view on app restart)
- `mainAgentId` already persisted via PiP persistence
- When app restarts with a `mainAgentId` but the session is dead → fall back to Dashboard

## Dashboard Fleet Panel

### Two-Section Layout

```
┌─────────────────────────────────┐
│  RUNNING (3)                    │
│  ┌───────────────────────────┐  │
│  │ ● pi           00:12:34   │  │
│  │   Working · 3 cmds        │  │
│  │   [Focus] [Overlay]       │  │
│  ├───────────────────────────┤  │
│  │ ● claude        00:05:12  │  │
│  │   Waiting · 1 cmd         │  │
│  │   [Focus] [Overlay]       │  │
│  ├───────────────────────────┤  │
│  │ ● gemini        00:00:45  │  │
│  │   Working · 8 cmds        │  │
│  │   [Focus] [Overlay]       │  │
│  └───────────────────────────┘  │
│                                 │
│  AVAILABLE (5)                  │
│  ┌───────────────────────────┐  │
│  │ ○ codex                   │  │
│  │   Detected · /usr/bin/... │  │
│  │   [Launch] [Overlay]      │  │
│  ├───────────────────────────┤  │
│  │ ○ cursor                  │  │
│  │   Detected · /usr/bin/... │  │
│  │   [Launch] [Overlay]      │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Running Section

Shows agents with active PTY sessions. Data from `SessionContext`:

- **Status indicator:** colored dot (blue=working, yellow=waiting, red=exited)
- **Elapsed time:** from `SessionInfo.createdAt`, live-updating
- **Session state:** mapped from PTY state — "Working" (actively producing output), "Waiting" (idle, no output for >5s), "Exited"
- **Command count:** `commandHistory.length` from SessionInfo
- **Actions:**
  - "Focus" → `setMainAgent(id)` + switch to TerminalView
  - "Overlay" → `addOverlay(id)`

### Available Section

Shows detected agents without active sessions. Data from `useAgents()` (existing hook that reads from main process agent store):

- **Status indicator:** gray dot (idle)
- **Path:** truncated agent binary path
- **Actions:**
  - "Launch" → opens directory picker, spawns session, sets as main
  - "Overlay" → opens directory picker, spawns session as overlay

### Data Flow

```
Main Process                    SessionContext               Dashboard
────────────                    ──────────────               ─────────
agent-scanner ──────────────►  useAgents() ──────────────►  Available section
                                (detected agents)

node-pty sessions ──────────►  sessions Map ─────────────►  Running section
  ├─ registerSession()          (active sessions)            (live data)
  ├─ appendCommand()
  └─ unregisterSession()
```

### Agent Card Component

Split the existing `AgentCard` into two variants:
- `RunningAgentCard` — shows live session data, Focus/Overlay actions
- `AvailableAgentCard` — shows detected agent info, Launch/Overlay actions

Both share the same visual language but different data sources and actions.

## Activity Feed

### Feed Design

The activity feed shows a chronological stream of commands and lifecycle events from all active sessions.

```
┌───────────────────────────────────┐
│  ACTIVITY FEED              [⏸]   │
│                                   │
│  09:14:22  pi                     │
│  ● Session started                │
│  cwd: /home/user/project          │
│                                   │
│  09:14:25  pi                     │
│  ▶ ls -la                         │
│  ┌─────────────────────────────┐  │
│  │ total 48                    │  │
│  │ drwxr-xr-x  6 user user 4096│  │
│  │ -rw-r--r--  1 user user 2.1K│  │
│  └─────────────────────────────┘  │
│                                   │
│  09:14:30  claude                 │
│  ● Session started                │
│  cwd: /home/user/other-project    │
│                                   │
│  09:15:01  pi                     │
│  ▶ npm install react              │
│  ┌─────────────────────────────┐  │
│  │ added 1 package in 3s       │  │
│  └─────────────────────────────┘  │
│                                   │
│  09:15:45  gemini                 │
│  ✕ Session exited (code 0)        │
│                                   │
└───────────────────────────────────┘
```

### Event Types

**Lifecycle events:**
- `session:started` — agent name, cwd, timestamp
- `session:exited` — agent name, exit code, duration

**Command events:**
- Agent name, command text, timestamp
- Collapsed output preview (first 3 lines, expandable)
- Output stored in `CommandBlock.output` (raw ANSI)

### Data Source

Activity feed subscribes to `SessionContext`:
- Listens for new sessions (registerSession → lifecycle event)
- Listens for session exits (unregisterSession → lifecycle event)
- Listens for new commands (appendCommand → command event)

Events are stored in a feed buffer (last 100 events) in the SessionContext or a dedicated `useActivityFeed` hook that reads from SessionContext.

### Pause/Resume

The topbar pause button controls the feed display:
- **Paused:** feed stops rendering new events (events still captured in buffer)
- **Resume:** feed catches up with all buffered events
- Sessions keep running regardless

### Stop/Clear

The stop button clears the activity feed buffer (not the sessions).

### Command Parsing

Commands are parsed from PTY output in the `useSession` hook:
- Detect command input (user typing + Enter)
- Capture output until next prompt
- Store as `CommandBlock` with timestamp
- Push to SessionContext via `appendCommand()`

The existing `ansiParser.ts` utility handles ANSI stripping for display.

## Topbar Controls & Data Flow

### Topbar Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [⚡ PiDash]   [Dashboard | Terminal]   [⏸ Feed] [■ Clear]  │
│                                              mode: [auto ▼] │
└─────────────────────────────────────────────────────────────┘
```

**Controls:**
- **View toggle:** Dashboard | Terminal (disabled when no main agent)
- **Feed pause:** ⏸ toggles activity feed rendering (sessions unaffected)
- **Feed clear:** ■ clears the activity feed buffer
- **Mode selector:** auto | manual | review (existing `useDashboardMode`, kept for future use)

### Data Flow: Main Process → Renderer

```
Main Process                          Renderer Process
─────────────                         ────────────────

agent-scanner.ts                      SessionContext (global)
  └─ scanAgents() ─────────────────►   - sessions: Map<agentId, SessionInfo>
                                       - availableAgents: AgentConfig[]
session/                               
  ├─ SessionManager                    useSession() hook (per terminal)
  │   ├─ create(agentId, cwd) ──────►   - registerSession(agentId, pid, cwd)
  │   ├─ onData(agentId, chunk) ────►   - parseCommand(chunk)
  │   │                                  - appendCommand(agentId, block)
  │   ├─ onExit(agentId, code) ─────►   - updateSessionState(agentId, 'exited')
  │   └─ destroy(agentId) ──────────►   - unregisterSession(agentId)
  │                                      
  └─ IPC handlers                        Dashboard subscribes to SessionContext
                                         ├─ FleetPanel: sessions + availableAgents
                                         ├─ ActivityFeed: commandHistory + lifecycle events
                                         └─ MetricsFooter: activeSessions.length, elapsed
```

### IPC Additions

One new IPC channel needed:
- `agents:list` → returns `AgentConfig[]` from agent store (detected agents)

Everything else uses existing IPC:
- `session:create`, `session:write`, `session:resize`, `session:destroy`
- `session:onData`, `session:onExit` (events)

### Metrics Footer

Real data from SessionContext:
- **Active agents:** `getActiveSessions().length`
- **Elapsed:** aggregate time across all sessions (or per-session if one is focused)
- **Commands:** sum of `commandHistory.length` across all sessions
- **Progress:** removed (was simulated) — or repurposed as "tasks completed" when we have task tracking

## Edge Cases & Error Handling

### Session Lifecycle Edge Cases

**1. App restart with stale mainAgentId**
- On startup, check if `mainAgentId` session is still alive
- If session is dead → clear `mainAgentId`, show Dashboard
- If session is alive → restore TerminalView

**2. Agent binary not found**
- `session:create` fails → show error toast in Dashboard
- Agent stays in "Available" section, not "Running"
- User can retry "Launch" after fixing path

**3. Multiple sessions for same agent**
- Prevented by design: `addOverlay` and `setMainAgent` check if session already exists
- If session exists → just focus it, don't spawn a new one
- One session per agent, enforced at SessionContext level

**4. Session crashes unexpectedly**
- `session:onExit` fires → `unregisterSession(agentId)`
- Agent moves from "Running" to "Available" in FleetPanel
- Activity feed shows "Session exited (code X)" event
- If it was the main agent → `mainAgentId` cleared, fall back to Dashboard

**5. Overlay promoted to main while session is dead**
- `promoteToMain` checks session state first
- If session is dead → show error, don't promote
- User must re-launch the agent

### Activity Feed Edge Cases

**6. Feed buffer overflow**
- Keep last 100 events in memory
- Oldest events dropped when buffer fills
- Paused feed still captures events (just doesn't render them)

**7. Rapid command output**
- Commands with large output → collapse by default (show first 3 lines)
- User can expand to see full output
- ANSI codes stripped for display, preserved in storage

**8. Feed pause + session exit**
- Paused feed still captures lifecycle events
- On resume, show all missed events in chronological order
- Timestamps ensure correct ordering

### Performance Considerations

**9. Many active sessions**
- 10+ overlays + dashboard all subscribing to SessionContext
- SessionContext uses React Context with selective subscriptions
- Each component only re-renders when its watched data changes
- Activity feed virtualizes if >50 events visible

**10. Large command output**
- CommandBlock.output stores raw ANSI (can be large)
- Activity feed only renders preview (first 3 lines)
- Full output available in AgentDetailView

### Error Recovery

**11. SessionContext desync**
- If SessionContext state doesn't match actual PTY state
- Periodic health check: compare `sessions.keys()` with `SessionManager.getActiveSessions()`
- If mismatch → log warning, attempt to reconcile

**12. IPC connection lost**
- If main process crashes → renderer shows error banner
- "Reconnect" button attempts to re-establish IPC
- SessionContext cleared on reconnect (sessions are dead)

## Visual Design

### Design Read

**Reading this as:** Developer productivity tool for technical users orchestrating AI agents, with a dark tech / terminal aesthetic, leaning toward cockpit-style high-density UI with functional motion.

### Design Dials

- **DESIGN_VARIANCE: 6** — Structured but allows offset layouts for visual interest
- **MOTION_INTENSITY: 4** — Functional motion only (toggle transitions, state changes), no decorative animation
- **VISUAL_DENSITY: 7** — Cockpit density, tight paddings, data-focused

### Fleet Panel Visual Language

**Running Section:**
- Section header: 12px uppercase, tracking-wide, `--dashboard-text-secondary` (#737373)
- Agent cards: existing card style with live data overlay
- Status indicators: 8px circular dots, no glow effects
  - Working: `--dashboard-accent` (#3b82f6)
  - Waiting: #f59e0b (amber)
  - Exited: `--color-destructive` (red)
- Elapsed time: 14px monospace, `--dashboard-text-primary` (#e5e5e5)
- Command count: 12px, `--dashboard-text-secondary`

**Available Section:**
- Section header: same style as Running
- Agent cards: slightly muted (opacity 0.7) to de-emphasize
- Status indicators: gray dot (#737373)
- Path: 11px, truncated with ellipsis, `--dashboard-text-secondary`

**Actions:**
- Buttons: existing button style (small, icon + text)
- Focus/Launch: primary action, `--dashboard-accent` background
- Overlay: secondary action, transparent background with border

### Activity Feed Visual Language

**Event Cards:**
- Timestamp: 11px monospace, `--dashboard-text-secondary`
- Agent name: 12px bold, `--dashboard-text-primary`
- Event type icon:
  - Session started: ● (blue dot)
  - Session exited: ✕ (red X)
  - Command: ▶ (green play icon)
- Command text: 13px monospace, `--dashboard-text-primary`
- Output preview: 12px monospace, `--dashboard-text-secondary`, max 3 lines

**Collapsed Output:**
- Preview shows first 3 lines
- "Show more" link to expand
- Expanded output: scrollable container, max height 300px

**Pause Indicator:**
- When feed is paused, show "PAUSED" badge in topbar
- Feed content slightly dimmed (opacity 0.6)

### Topbar Visual Language

**Toggle Button:**
- Segmented control style (two buttons, connected)
- Active segment: `--dashboard-accent` background
- Inactive segment: transparent background
- Disabled state: opacity 0.4, no hover effect

**Feed Controls:**
- Pause button: icon + text ("⏸ Feed" / "▶ Feed")
- Clear button: icon only ("■")
- Hover state: background shifts to #2a2a2a

### Accessibility

**Reduced Motion:**
- Toggle transitions: 150ms ease (functional motion, kept)
- No infinite animations on status indicators

**Keyboard Navigation:**
- Tab order: Topbar → FleetPanel → ActivityFeed → MetricsFooter
- Toggle button: keyboard accessible (Enter/Space to switch)
- Agent cards: focusable, Enter to focus, Shift+Enter to open as overlay

**Contrast:**
- All text meets WCAG AA (4.5:1 for body, 3:1 for large text)
- Status indicators have sufficient contrast against surface
- Section headers provide clear visual hierarchy

## Testing Strategy

### Unit Tests

**SessionContext:**
- `registerSession` adds session to map
- `unregisterSession` removes session from map
- `appendCommand` adds command to session history
- `getActiveSessions` returns only running sessions
- State updates trigger re-renders in subscribed components

**useSession integration:**
- Hook calls `registerSession` after spawn
- Hook calls `unregisterSession` on exit
- Hook calls `appendCommand` for each parsed command
- Hook handles errors gracefully (failed spawn)

**FleetPanel:**
- Renders Running section with active sessions
- Renders Available section with detected agents
- "Focus" button calls `setMainAgent`
- "Launch" button spawns session and sets as main
- "Overlay" button calls `addOverlay`

**ActivityFeed:**
- Renders lifecycle events (started, exited)
- Renders command events with output preview
- Pause/resume toggles rendering
- Clear button empties feed buffer
- Buffer overflow drops oldest events

### Integration Tests

**End-to-end flow:**
1. Launch agent from Available section → session starts, appears in Running
2. Focus agent as main → TerminalView shows, toggle works
3. Open agent as overlay → overlay appears, can promote to main
4. Activity feed shows commands and lifecycle events
5. Pause feed → feed stops updating, sessions keep running
6. Kill session → agent moves to Available, feed shows exit event

**State persistence:**
1. Set mainAgentId + viewMode → restart app → state restored
2. Session dies between restarts → mainAgentId cleared, Dashboard shown

### Manual Testing

- [ ] Launch 3+ agents simultaneously
- [ ] Verify all appear in Running section with live data
- [ ] Toggle between Dashboard and Terminal views
- [ ] Open/close overlays, promote to main
- [ ] Pause/resume activity feed
- [ ] Kill sessions, verify they move to Available
- [ ] Restart app, verify state persistence
- [ ] Test with 10+ overlays for performance
- [ ] Verify keyboard navigation works
- [ ] Test with prefers-reduced-motion enabled

## Implementation Phases

### Phase 1: SessionContext Foundation
- Create `SessionContext` and `SessionProvider`
- Define `SessionInfo` type and context API
- Update `useSession` hook to register/unregister with context
- Add unit tests for SessionContext

### Phase 2: Navigation Model
- Add `viewMode` state to PiPContext
- Update `MainTerminal` to respect viewMode toggle
- Add toggle button to Topbar
- Update `MainTerminal` to show Dashboard or TerminalView based on viewMode
- Add "Focus as Main" action to agent cards
- Add integration tests for navigation flow

### Phase 3: Fleet Panel Restructure
- Split `FleetPanel` into Running and Available sections
- Create `RunningAgentCard` component (live data)
- Create `AvailableAgentCard` component (detected agents)
- Wire FleetPanel to SessionContext for Running section
- Wire FleetPanel to `useAgents()` for Available section
- Add unit tests for FleetPanel

### Phase 4: Activity Feed
- Create `useActivityFeed` hook that subscribes to SessionContext
- Define event types (lifecycle + command)
- Implement feed buffer (last 100 events)
- Update `ActivityFeed` component to render real events
- Add pause/resume and clear controls
- Add unit tests for ActivityFeed

### Phase 5: Topbar & Metrics
- Update Topbar with toggle button and feed controls
- Update `MetricsFooter` to use real data from SessionContext
- Remove simulated data hooks (`useAgentSimulation`)
- Add integration tests for topbar controls

### Phase 6: Edge Cases & Polish
- Handle app restart with stale mainAgentId
- Handle session crashes and unexpected exits
- Prevent duplicate sessions for same agent
- Add error toasts for failed operations
- Performance optimization (virtualization, selective subscriptions)
- Accessibility audit (keyboard nav, contrast, reduced motion)

## Acceptance Criteria

- [ ] Dashboard shows real PTY session data, not simulated data
- [ ] Fleet panel has two sections: Running (active sessions) and Available (detected agents)
- [ ] Running section shows live elapsed time, command count, status
- [ ] Users can focus an agent as main terminal from the dashboard
- [ ] Toggle button switches between Dashboard and Terminal views
- [ ] Activity feed shows commands and lifecycle events from all active sessions
- [ ] Feed pause/resume only affects display, not sessions
- [ ] Feed clear button empties the buffer
- [ ] Topbar controls work as specified
- [ ] Metrics footer shows real data (active agents, elapsed time, commands)
- [ ] Session state persists across navigation (PiP layout stays intact)
- [ ] App restart restores viewMode and mainAgentId (if session is alive)
- [ ] Edge cases handled (stale sessions, crashes, duplicates, errors)
- [ ] Keyboard navigation works (tab order, toggle, agent cards)
- [ ] Performance acceptable with 10+ active sessions
- [ ] All unit and integration tests pass
