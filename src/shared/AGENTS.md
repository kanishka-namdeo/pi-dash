# src/shared/

## Purpose

Shared type contracts between the Electron main process and renderer. All TypeScript interfaces that cross the IPC boundary are defined here to ensure type safety on both sides.

## Ownership

Owned by the root project. These types are imported by both main and renderer processes.

## Local Contracts

- **types.ts** — Core shared types: `AgentConfig`, `AgentsStore`, `ScanResult`, `SessionInfo`, `SessionState`, `SpawnParams`, validation/drift/export types
- **github-types.ts** — GitHub domain types: `Repo`, `RepoConfig`, `Worktree`, `GitHubIssue`, `GitHubPR`, `GitHubComment`, `GitHubReview`, `PollingState`
- **project-setup-types.ts** — Project setup flow types: `Project`, `ProjectSetupState`, `CloneError`, `ProjectSetupScreenName`

## Work Guidance

- Types here must be importable by both main and renderer
- Do not import Electron or Node-specific types in shared types
- Changes to shared types require updating both sides of the IPC boundary
- Use these types for all IPC channel payloads and responses

## Verification

- `pnpm build:ts` must compile cleanly for both main and renderer

## Child DOX Index

No child docs needed. This directory is a single cohesive domain.
