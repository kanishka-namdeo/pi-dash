# src/main/session/

## Purpose

PTY session lifecycle management for AI coding agents. Owns spawning, event forwarding, and cleanup of concurrent agent terminal sessions via node-pty.

## Ownership

Owned by the Electron main process domain. All session-related logic lives here.

## Local Contracts

- **Session** (`session.ts`): PTY session wrapper using node-pty. Spawns agent shell process, forwards data/exit events, supports write and resize operations.
- **SessionManager** (`session-manager.ts`): Manages multiple concurrent sessions keyed by agentId. Creates/destroys sessions, lists session info, destroys all on app quit.

### IPC Handlers

Session IPC handlers are registered in `src/main/ipc/session-handlers.ts`:
- `session:create` — Spawn a new PTY session for an agent
- `session:get` — Get session info by agentId
- `session:list` — List all active sessions
- `session:write` — Write data to a session's PTY
- `session:resize` — Resize a session's terminal
- `session:destroy` — Destroy a session and its PTY

## Work Guidance

- Sessions use node-pty for live terminal I/O
- Each agent gets one session keyed by agentId
- Session exit events are forwarded to renderer windows
- All sessions are destroyed on app quit
- Session state (running/exited) is persisted via `session-persistence.ts` in the renderer

## Verification

- `pnpm start` must allow launching and interacting with agent terminals
- Session create/write/resize/destroy must work without memory leaks

## Child DOX Index

No child docs needed. This directory is a single cohesive domain.
