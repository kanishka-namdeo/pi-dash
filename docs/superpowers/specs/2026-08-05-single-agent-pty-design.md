# Single Agent Real PTY — Design Spec

**Date**: 2026-08-05  
**Feature**: Launch one agent (pi) in a real PTY, interact via xterm.js terminal  
**Goal**: Prove the core architecture for agent orchestration

## Overview

Replace the mocked terminal UI with a real PTY-backed agent session. Launch `pi` in a user-selected working directory, interact with it via a real terminal emulator (xterm.js), and manage the session lifecycle through a SessionManager abstraction.

**Scope**: Single agent, real PTY, user-selectable working directory, one session per agent, agent dies on app close.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Main Process (Electron)                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  SessionManager                                        │  │
│  │  - sessions: Map<agentId, Session>                    │  │
│  │  - createSession(agentId, cwd) → spawn node-pty       │  │
│  │  - getSession(agentId) → Session                      │  │
│  │  - listSessions() → Session[]                         │  │
│  │  - destroySession(agentId) → kill PTY                 │  │
│  │  - destroyAll() → cleanup on app quit                 │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Session                                               │  │
│  │  - agentId: string                                    │  │
│  │  - cwd: string                                        │  │
│  │  - pid: number                                        │  │
│  │  - pty: IPty (node-pty wrapper)                       │  │
│  │  - state: 'running' | 'exited'                        │  │
│  │  - exitCode?: number                                  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  IPC Handlers (singleton, registered once)            │  │
│  │  - session:spawn(agentId, cwd) → { pid }              │  │
│  │  - session:get(agentId) → Session | null              │  │
│  │  - session:list() → Session[]                         │  │
│  │  - session:write(agentId, data) → void                │  │
│  │  - session:resize(agentId, cols, rows) → void         │  │
│  │  - session:destroy(agentId) → void                    │  │
│  │  - Events: session:data, session:exit                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         ↕ IPC (invoke for commands, on for events)
┌─────────────────────────────────────────────────────────────┐
│  Renderer (React)                                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  useSession(agentId) hook                              │  │
│  │  - state: 'idle' | 'running' | 'exited'               │  │
│  │  - spawn(cwd) → invoke session:spawn                  │  │
│  │  - write(data) → invoke session:write                 │  │
│  │  - resize(cols, rows) → invoke session:resize         │  │
│  │  - destroy() → invoke session:destroy                 │  │
│  │  - Listens to session:data, session:exit events       │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  TerminalView component                                │  │
│  │  - xterm.js <Terminal />                              │  │
│  │  - Connects to useSession                             │  │
│  │  - Handles input → write, output → terminal.write     │  │
│  │  - ResizeObserver → session.resize                    │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Dashboard                                             │  │
│  │  - Agent cards with "Launch" button                   │  │
│  │  - Click → DirectoryPicker dialog                     │  │
│  │  - Pick → navigate to /agent/:agentId                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Key decisions**:
- SessionManager lives in main process (owns PTY lifecycle)
- Renderer never touches PTY directly (security, contextIsolation)
- IPC is request/response + events (invoke for commands, on for streaming)
- One session per agent enforced in SessionManager (reject duplicate create)
- Singleton IPC dispatcher routes all PTY traffic by agentId (matches Orca pattern)

## Data Flow

**Launch flow**:
```
User clicks "Launch" on agent card
  → Dashboard shows DirectoryPicker dialog (native Electron dialog)
  → User picks folder (e.g., C:\Users\kanis\projects\my-app)
  → Navigate to /agent/:agentId?cwd=C:\Users\kanis\projects\my-app
  → TerminalView mounts, calls useSession(agentId)
  → useSession.invoke('session:spawn', { agentId, cwd })
  → SessionManager spawns node-pty: pi, cwd: picked folder
  → Returns { pid, state: 'running' }
  → xterm.js connects, starts receiving output
```

**Input/output flow**:
```
User types in xterm.js
  → Terminal.onData(data) fires
  → useSession.write(data) → IPC session:write
  → SessionManager.getSession(agentId).pty.write(data)
  → pi receives input, processes it
  → pi writes output → PTY emits 'data' event
  → IPC sends session:data event to renderer
  → useSession receives event, calls terminal.write(data)
  → xterm.js renders output
```

**Cleanup flow**:
```
User closes app (or closes terminal tab)
  → TerminalView unmounts → useSession.destroy()
  → IPC session:destroy → SessionManager.destroySession(agentId)
  → PTY.kill() → process terminates
  → If app closing: SessionManager.destroyAll() in app.on('before-quit')
```

## Components & File Structure

**New files to create:**

```
src/main/
├── session/
│   ├── session-manager.ts      # Manages all sessions, lifecycle
│   ├── session.ts              # Single session: wraps node-pty
│   └── types.ts                # SessionState, SessionInfo
└── ipc/
    └── session-handlers.ts     # IPC handlers for session:* channels

renderer/src/
├── hooks/
│   └── useSession.ts           # React hook for session management
├── components/
│   └── terminal/
│       └── TerminalView.tsx    # xterm.js wrapper (replace existing)
└── lib/
    └── directory-picker.ts     # Native directory dialog wrapper

src/shared/
└── types.ts                    # Add SessionInfo, SpawnParams
```

**Dependencies to add:**
- `node-pty` — PTY spawning (native module, needs rebuild)
- `@xterm/xterm` — Terminal emulator (v5+)
- `@xterm/addon-fit` — Auto-resize terminal to container

**What we're deleting:**
- `renderer/src/lib/mockPTY.ts` — Replace with real PTY
- `renderer/src/hooks/useAgentSession.ts` — Replace with `useSession`
- `renderer/src/components/terminal/CommandBlock.tsx` — Replace with xterm.js
- `renderer/src/components/terminal/AnsiText.tsx` — xterm.js handles ANSI

**What stays:**
- Onboarding flow — unchanged
- Agent scanner/store — unchanged
- Dashboard — add "Launch" button to agent cards
- `TerminalPane.tsx` — keep name, rewrite internals to use xterm.js

## UI Changes

**Dashboard (agent cards):**
- Add "Launch" button to each agent card (only if no active session)
- If session active, show "Resume" button (navigates to terminal) + status indicator (running/exited)
- Click "Launch" → open directory picker dialog

**Directory picker:**
- Native Electron dialog (`dialog.showOpenDialog`) — simplest, no custom UI
- Returns selected path → navigate to `/agent/:agentId?cwd=<path>`
- Cancel → stay on dashboard

**Terminal view UI:**
- Header bar: agent name, working directory, status badge (running/exited), kill button
- Terminal area: full xterm.js, fills remaining space
- No input field (xterm.js handles input natively)
- No command blocks (replaced by real terminal)

**Navigation:**
- Dashboard → click "Launch" → pick directory → navigate to `/agent/:agentId`
- Terminal view → back button → return to dashboard
- No tab bar yet (one session per agent, no multi-tab UI)

**Loading states:**
- Spawning PTY → show spinner in terminal area with "Starting agent..."
- PTY ready → show terminal
- PTY exited → show "Session ended" message, disable input

**Error UI:**
- Spawn failure → toast notification with error message
- IPC error → toast notification
- No inline errors (keep terminal clean)

**What we're NOT building (YAGNI):**
- Custom directory picker UI (use native dialog)
- Tab bar for multiple sessions (one session per agent)
- Terminal split views (deferred)
- Session history UI (no history in this feature)
- Agent status indicators on dashboard beyond "running/exited"

## Error Handling & Edge Cases

**PTY spawn failures:**
- Agent binary not found → return error to renderer, show toast "Failed to launch: agent not found"
- Permission denied → "Failed to launch: permission denied"
- Invalid working directory → "Failed to launch: directory does not exist"
- node-pty throws → catch, log, return generic error

**Session lifecycle edge cases:**
- Agent already running → `createSession` rejects with "Session already active"
- User tries to write to exited session → no-op, renderer shows "Session ended"
- Resize before PTY ready → queue resize, apply after spawn completes
- App crashes while session running → PTY dies (Option B), no cleanup needed

**IPC failures:**
- Renderer sends command to non-existent session → IPC handler returns error, renderer shows toast
- PTY emits data after session destroyed → drop silently (race condition, safe to ignore)
- Renderer disconnects (tab close) → main process keeps session alive until explicit kill or app quit

**Resource cleanup:**
- `app.on('before-quit')` → `SessionManager.destroyAll()` kills all PTYs
- Window close → same cleanup (Electron fires `before-quit` on window close)
- Unhandled exception in main → Electron will kill child processes automatically

**What we're NOT handling (YAGNI):**
- Reconnection after app crash (Option A — deferred)
- Session persistence across restarts (deferred)
- Zombie process detection (deferred — OS cleans up when parent dies)

## Testing Strategy

**Unit tests:**
- `session-manager.test.ts` — create/get/list/destroy sessions, reject duplicates, cleanup on destroyAll
- `session.test.ts` — spawn PTY, write data, resize, kill, state transitions (mock node-pty)
- `session-handlers.test.ts` — IPC routing (mock SessionManager)

**Integration testing:**
- Manual only for now — launch app, click "Launch" on agent card, pick directory, verify `pi` runs in terminal, type commands, see output, close app, verify PTY killed

**What we're NOT testing (YAGNI):**
- E2E tests with real `pi` binary — too flaky, depends on agent behavior
- xterm.js rendering tests — library handles that
- node-pty native module tests — upstream concern

**Test infrastructure:**
- Mock `node-pty` in tests (create fake IPty interface)
- Use existing vitest setup
- No new test dependencies needed

## Success Criteria

1. User can launch `pi` agent from dashboard
2. User can select working directory via native dialog
3. Terminal displays real PTY output with proper ANSI rendering
4. User can type commands and see output
5. Terminal resizes correctly when window resizes
6. Agent process is killed when app closes
7. One session per agent enforced (can't launch same agent twice)
8. Error states handled gracefully (spawn failures, IPC errors)

## Out of Scope

- Parallel agent execution (next feature)
- Git worktree integration (next feature)
- Session persistence across app restarts
- Session history/transcripts
- Mobile companion
- SSH worktrees
- Design mode / browser integration
- Multi-tab terminal UI

## Future Work

After this feature ships:
1. **Parallel execution** — Launch multiple agents simultaneously
2. **Git worktrees** — Each agent gets its own isolated worktree
3. **Session persistence** — Agent survives app restart (Option A from design discussion)
4. **Session history** — View past sessions, read-only transcripts
5. **Multi-tab UI** — Tab bar for managing multiple sessions
6. **Terminal splits** — Split terminal view for side-by-side agents
