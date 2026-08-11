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
- **DataService** (`data-service.ts`): Fetches issues, PRs, and branches from GitHub. Implements in-memory caching with TTLs (60s for issues/PRs, 5min for branches) plus etag conditional requests. Also fetches issue and PR detail with reviews/CI status.
- **IssueService** (`issue-service.ts`): Write operations — create/update/close/reopen issues, comments, labels, assignees.
- **PRService** (`pr-service.ts`): Write operations — create/merge/close PRs, submit reviews, comments, fetch PR comments, fetch CI status.
- **PollingManager** (`polling-manager.ts`): Interval-based polling with rate-limit awareness; exposes PollingState.
- **RateLimitTracker** (`rate-limit-tracker.ts`): Tracks x-ratelimit-* headers; gates requests when remaining <= 10.
- **OAuthServer** (`oauth-server.ts`): Express server on port 9876 capturing GitHub OAuth callback; Promise-based code delivery.

### IPC Handlers

All IPC handlers are registered in `src/main/ipc/` and exposed to the renderer:

- `github:auth:pat` — Authenticate with PAT
- `github:auth:oauth` — Start OAuth flow
- `github:auth:getUser` — Get authenticated user
- `github:auth:logout` — Clear authentication
- `github:auth:getState` — Get current auth state
- `github:repo:list` — List configured repositories
- `github:repo:add` — Add a repository
- `github:repo:remove` — Remove a repository
- `github:repo:getActive` — Get active repository
- `github:repo:setActive` — Set active repository
- `github:data:issues` — Fetch issues for a repo
- `github:data:prs` — Fetch PRs for a repo
- `github:data:branches` — Fetch branches for a repo
- `github:issues:create` — Create an issue
- `github:issues:comment` — Comment on an issue
- `github:issues:update` — Update an issue
- `github:issues:close` — Close an issue
- `github:issues:reopen` — Reopen an issue
- `github:issues:labels` — Manage issue labels
- `github:issues:assignees` — Manage issue assignees
- `github:prs:create` — Create a PR
- `github:prs:review` — Submit a PR review
- `github:prs:comment` — Comment on a PR
- `github:prs:merge` — Merge a PR
- `github:prs:close` — Close a PR
- `github:prs:comments` — Fetch PR comments
- `github:prs:ci` — Fetch CI status for a PR

### Types

Shared types are defined in `src/shared/github-types.ts`:
- `Repo` — Repository configuration
- `RepoConfig` — Repo list and active repo
- `Worktree` — Git worktree metadata
- `GitHubIssue` — GitHub issue data
- `GitHubPR` — GitHub pull request data
- `GitHubComment` — Comment data
- `GitHubReview` — PR review data
- `PollingState` — Polling manager state

## Work Guidance

### Security

- All GitHub API calls must go through `GitHubService.getOctokit()`
- Tokens are stored in electron-store with encryption
- Tokens never exposed to renderer process
- OAuth credentials read from environment variables with fallback placeholders

### Caching

- DataService uses in-memory cache with TTLs
- Cache is instance-level (not module-level) for test isolation
- TTLs: issues 60s, PRs 60s, branches 5min, details 30s
- Etag conditional requests for cache validation

### Testing

- All services have unit tests with mocked dependencies
- electron-store is mocked in tests to avoid file system side effects
- Octokit methods are mocked to avoid real API calls
- Test coverage target: 90%+
- Strong coverage: auth-service, repo-service, polling-manager, rate-limit-tracker, oauth-server
- Moderate coverage: data-service (detail/etag paths untested), issue-service and pr-service (write-side methods partially untested)

### Dependencies

- `@octokit/rest` — GitHub API client
- `electron-store` — Persistent storage with encryption
- `express` — OAuth callback server
- `simple-git` — Git operations (used by WorktreeService, not here)

## Verification

- TypeScript compiles cleanly: `pnpm build:ts`
- All tests pass: `pnpm test`
- No `any` types in service implementations (use proper TypeScript types)

## Child DOX Index

No child docs needed. This directory is a single cohesive domain.
