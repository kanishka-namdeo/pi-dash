# src/main/worktree/

## Purpose

Git worktree lifecycle management. Provides create, list, remove, and status operations for git worktrees, integrated with the GitHub PR system for linked PR lookup.

## Ownership

Owned by the Electron main process domain. All worktree-related logic lives here.

## Local Contracts

- **WorktreeService** (`worktree-service.ts`): Git worktree lifecycle via simple-git. Provides create, list, remove, status, and linked-PR lookup operations. Persists worktree metadata in electron-store.

### IPC Handlers

Worktree IPC handlers are registered in `src/main/ipc/worktree-handlers.ts`:
- `worktree:create` — Create a new worktree from a branch or issue
- `worktree:list` — List all worktrees for the active project
- `worktree:remove` — Remove a worktree
- `worktree:getStatus` — Get worktree status and linked PR info

## Work Guidance

- Worktrees use simple-git for git operations
- Worktree metadata is persisted in electron-store
- Linked PR lookup connects worktrees to GitHub PRs
- Worktree conflicts are surfaced to the renderer for resolution

## Verification

- `pnpm build:ts` must compile cleanly
- Worktree create/list/remove must work with a valid git repository

## Child DOX Index

No child docs needed. This directory is a single cohesive domain.
