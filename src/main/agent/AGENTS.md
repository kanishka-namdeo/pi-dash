# src/main/agent/

## Purpose

Agent-GitHub bridge operations. Connects agent worktrees to GitHub workflows: creating PRs from worktrees, commenting on issues, reading PR feedback, and assigning agents to worktrees.

## Ownership

Owned by the Electron main process domain. All agent-GitHub bridge logic lives here.

## Local Contracts

- **AgentGitBridge** (`agent-git-bridge.ts`): Bridges agent worktrees to GitHub. Provides create PR from worktree, comment on issue, read PR feedback, and assign agent to worktree operations.

### IPC Handlers

Agent-GitHub IPC handlers are registered in `src/main/ipc/agent-github-handlers.ts`:
- `agent-github:createPR` — Create a PR from an agent's worktree
- `agent-github:commentIssue` — Comment on a GitHub issue from an agent
- `agent-github:readFeedback` — Read PR review feedback for an agent
- `agent-github:assign` — Assign an agent to a worktree

## Work Guidance

- Bridge operations use the GitHubService singleton for API calls
- Worktree-to-PR mapping is tracked in electron-store
- PR feedback is polled and surfaced to the agent's terminal

## Verification

- `pnpm build:ts` must compile cleanly
- PR creation from worktree must work with valid GitHub auth

## Child DOX Index

No child docs needed. This directory is a single cohesive domain.
