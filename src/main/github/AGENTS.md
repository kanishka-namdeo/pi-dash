# src/main/github/

## Purpose

GitHub integration for PiDash. Provides authentication (PAT + OAuth), repository management, and data fetching for issues, PRs, and branches. All GitHub API operations are isolated in this directory and exposed to the renderer via IPC handlers.

## Ownership

Owned by the GitHub integration domain. All GitHub-related state, API calls, and authentication logic lives here.

## Local Contracts

### Services

- **GitHubService** (`github-service.ts`): Singleton wrapper around Octokit. Manages authentication token and provides the Octokit instance for API calls. Tokens never leave the main process.
- **AuthService** (`auth-service.ts`): Handles PAT and OAuth authentication flows. Persists tokens and user data to electron-store with encryption.
- **RepoService** (`repo-service.ts`): Manages multiple repository configurations. Persists repo list and active repo selection to electron-store.
- **DataService** (`data-service.ts`): Fetches issues, PRs, and branches from GitHub. Implements in-memory caching with TTLs (60s for issues/PRs, 5min for branches).

### IPC Handlers

All IPC handlers are registered in `src/main/ipc/` and exposed to the renderer:

- `github:auth:pat` — Authenticate with PAT
- `github:auth:oauth` — Start OAuth flow
- `github:auth:getUser` — Get authenticated user
- `github:auth:logout` — Clear authentication
- `github:repo:list` — List configured repositories
- `github:repo:add` — Add a repository
- `github:repo:remove` — Remove a repository
- `github:repo:getActive` — Get active repository
- `github:repo:setActive` — Set active repository
- `github:data:issues` — Fetch issues for a repo
- `github:data:prs` — Fetch PRs for a repo
- `github:data:branches` — Fetch branches for a repo

### Types

Shared types are defined in `src/shared/github-types.ts`:
- `Repo` — Repository configuration
- `RepoConfig` — Repo list and active repo
- `Worktree` — Git worktree metadata
- `GitHubIssue` — GitHub issue data
- `GitHubPR` — GitHub pull request data

## Work Guidance

### Security

- All GitHub API calls must go through `GitHubService.getOctokit()`
- Tokens are stored in electron-store with encryption
- Tokens never exposed to renderer process
- OAuth credentials read from environment variables with fallback placeholders

### Caching

- DataService uses in-memory cache with TTLs
- Cache is instance-level (not module-level) for test isolation
- TTLs: issues 60s, PRs 60s, branches 5min

### Testing

- All services have unit tests with mocked dependencies
- electron-store is mocked in tests to avoid file system side effects
- Octokit methods are mocked to avoid real API calls
- Test coverage target: 90%+

### Dependencies

- `@octokit/rest` — GitHub API client
- `electron-store` — Persistent storage with encryption
- `express` — OAuth callback server (Task 3)
- `simple-git` — Git operations (used by WorktreeService, not here)

## Verification

- TypeScript compiles cleanly: `pnpm build:ts`
- All tests pass: `pnpm test`
- No `any` types in service implementations (use proper TypeScript types)

## Child DOX Index

No child docs needed. This directory is a single cohesive domain.
