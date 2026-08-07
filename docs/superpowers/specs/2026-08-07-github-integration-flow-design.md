# GitHub Integration Flow — Design Spec

**Date:** 2026-08-07
**Status:** Approved
**Design file:** `design/pidash-ui.pen` (GitHub Integration Flow frame, id: `g30OX8`)

## Summary

Full GitHub integration for PiDash: authentication (OAuth + PAT), multi-repo management, issue/PR browsing and creation, worktree management, bi-directional agent↔GitHub linking (agent works in worktree, PiDash streams PR review comments to agent terminal, agent can create PRs), and full read/write GitHub operations.

The design covers 20+ screens in the Pencil design file. This spec translates those screens into a concrete implementation plan.

## Key Decisions

- **Architecture:** Separated concerns — extend existing service structure (GitHubService, AuthService, RepoService, DataService, + new IssueService, PRService)
- **UI:** Hybrid — full pages (Settings, Issues, Worktrees, PRs, Multi-Repo Overview) + panels/modals (issue detail, PR detail, worktree cards, agent assignment)
- **Data fetching:** Polling only (configurable interval: 15s/30s/60s/5m/15m), with ETags for conditional requests
- **Repo model:** One active repo at a time, with multi-repo overview aggregating across all
- **Worktree location:** Inside repo directory (`<repo>/.worktrees/<branch>`)
- **Agent linking:** Full bi-directional — agent spawned in worktree gets GitHub env vars, PiDash polls PR comments and injects to agent PTY, agent can create PRs
- **GitHub operations:** Full read/write (issues, PRs, comments, reviews, labels, assignees)
- **Feedback delivery:** Poll PR comments, inject to agent terminal as stdin

---

## 1. Architecture Overview

### Component Hierarchy

```
Main Process
├── GitHubService (core Octokit wrapper, rate limiting)
│   ├── setToken(token) / clearToken()
│   ├── makeRequest(fn) — wraps all API calls with rate limit handling
│   └── getOctokit() — returns configured Octokit instance
│
├── AuthService (OAuth + PAT flows)
│   ├── startOAuth() — spawns BrowserWindow, handles callback
│   ├── loginWithPAT(token) — validates and stores
│   ├── logout() — clears token and user data
│   ├── getToken() / getUser() — reads from electron-store
│   └── refreshToken() — refreshes OAuth token if expiring
│
├── RepoService (multi-repo management)
│   ├── addRepo(owner, name, localPath) — clones if needed, stores config
│   ├── removeRepo(id) — removes config (doesn't delete local clone)
│   ├── setActiveRepo(id) — switches active repo, triggers data refresh
│   ├── getRepos() / getActiveRepo()
│   └── searchRepos(query) — queries GitHub for user's repos
│
├── DataService (fetch issues/PRs/branches with caching)
│   ├── fetchIssues(owner, repo, filters) — with TTL cache + ETags
│   ├── fetchPRs(owner, repo, filters) — with TTL cache + ETags
│   ├── fetchBranches(owner, repo) — with TTL cache
│   ├── fetchIssueDetail(owner, repo, number) — includes comments
│   ├── fetchPRDetail(owner, repo, number) — includes reviews, CI status
│   └── invalidateCache(key) — force refresh
│
├── IssueService (issue CRUD)
│   ├── createIssue(owner, repo, title, body, labels?, assignees?)
│   ├── updateIssue(owner, repo, number, updates)
│   ├── commentOnIssue(owner, repo, number, body)
│   ├── addLabels / removeLabels / addAssignees / removeAssignees
│   └── closeIssue / reopenIssue
│
├── PRService (PR CRUD, reviews, CI)
│   ├── createPR(owner, repo, title, body, head, base, reviewers?, labels?)
│   ├── updatePR / mergePR / closePR
│   ├── commentOnPR(owner, repo, number, body)
│   ├── submitReview(owner, repo, number, event, body) — approve/request changes/comment
│   ├── fetchCIStatus(owner, repo, ref) — check runs + status checks
│   └── fetchPRComments(owner, repo, number) — includes review comments
│
├── WorktreeService (git worktree operations)
│   ├── create(repoPath, branch, baseBranch, issueNumber?) — creates in <repo>/.worktrees/<branch>
│   ├── list(repoPath) — returns Worktree[] with status
│   ├── remove(worktreePath) — git worktree remove
│   ├── getStatus(worktreePath) — uncommitted changes, ahead/behind
│   └── getLinkedPR(worktreePath) — finds PR for worktree's branch
│
├── AgentGitBridge (agent↔GitHub linking)
│   ├── assignAgent(worktree, agentId, issueNumber?) — spawns agent in worktree
│   ├── unassignAgent(worktree) — kills agent session
│   ├── createPRForWorktree(worktree) — pushes branch, creates PR
│   ├── pollPRFeedback(worktree) — checks for new comments since last poll
│   └── injectFeedbackToTerminal(worktree, comment) — writes to agent's PTY stdin
│
└── IPC Handlers
    ├── github:auth:* — login, logout, getUser
    ├── github:repos:* — add, remove, setActive, search
    ├── github:issues:* — list, detail, create, comment
    ├── github:prs:* — list, detail, create, comment, review, CI
    ├── worktree:* — create, list, remove, status
    └── agent-github:* — assign, unassign, createPR, pollFeedback
```

### Data Flow

```
GitHub API ←→ GitHubService ←→ DataService/IssueService/PRService
                    ↓
              IPC handlers ←→ Renderer (GitHubContext)
                                    ↓
                              Components (IssuesTab, PRsTab, etc.)
                                    ↓
User actions → IPC → WorktreeService → git CLI → worktrees on disk
                                    ↓
                          AgentGitBridge → spawn agent in worktree
                                    ↓
                          Poll PR comments → inject to agent PTY
                                    ↓
                          Agent pushes → PR updates → UI refreshes
```

### Renderer State

```ts
interface GitHubContextType {
  // Auth
  isAuthenticated: boolean;
  user: { id: number; login: string; avatarUrl: string } | null;
  authMethod: 'oauth' | 'pat' | null;

  // Repos
  repos: Repo[];
  activeRepo: Repo | null;

  // Data (scoped to activeRepo)
  issues: GitHubIssue[];
  prs: GitHubPR[];
  branches: string[];

  // Worktrees (scoped to activeRepo)
  worktrees: Worktree[];

  // Polling
  polling: PollingState;

  // Actions
  login(method: 'oauth' | 'pat', token?: string): Promise<void>;
  logout(): Promise<void>;
  addRepo(owner: string, name: string, localPath: string): Promise<void>;
  removeRepo(id: number): Promise<void>;
  setActiveRepo(id: number | null): Promise<void>;
  refresh(): Promise<void>;
  createWorktree(params: CreateWorktreeParams): Promise<Worktree>;
  assignAgent(worktreeId: string, agentId: string): Promise<void>;
  createPR(worktreeId: string, params: CreatePRParams): Promise<GitHubPR>;
}
```

---

## 2. Authentication & Token Management

### OAuth Flow

1. User clicks "Connect with GitHub" in Settings
2. Main process: `AuthService.startOAuth()`
   - Generate random state parameter (CSRF protection)
   - Start temporary HTTP server on `localhost:9876`
   - Open BrowserWindow → `https://github.com/login/oauth/authorize?client_id=<ID>&redirect_uri=http://localhost:9876/callback&scope=repo,write:discussion,read:discussion&state=<STATE>`
   - User authorizes on GitHub
   - GitHub redirects to `http://localhost:9876/callback?code=<CODE>&state=<STATE>`
   - Validate state matches
   - Exchange code for `access_token` via POST `https://github.com/login/oauth/access_token`
   - Store token + user profile in electron-store (encrypted)
   - Close BrowserWindow, stop HTTP server
   - Notify renderer: auth success
3. Renderer: `GitHubContext.login()` updates state, fetches initial data

### PAT Flow

1. User clicks "Use Personal Access Token"
2. Renderer shows input field + link to `https://github.com/settings/tokens`
3. User pastes token, clicks "Connect"
4. Main process: `AuthService.loginWithPAT(token)`
   - Validate token: `GET /user` with `Authorization: token <TOKEN>`
   - If valid: store token + user profile in electron-store (encrypted)
   - If invalid (401): return error, don't store
   - Check scopes: token must have `repo` scope minimum
   - Warn if scopes insufficient
5. Renderer: success → update state, fetch data; error → show message

### Token Storage

```ts
// electron-store schema (encrypted)
{
  github: {
    authMethod: 'oauth' | 'pat' | null,
    accessToken: string,        // encrypted
    refreshToken?: string,      // OAuth only, encrypted
    tokenExpiresAt?: number,    // OAuth only (usually null)
    user: {
      id: number,
      login: string,
      avatarUrl: string
    } | null,
    scopes: string[]
  }
}
```

**Encryption:** electron-store built-in encryption with machine-specific key (hostname + username). Tokens never leave main process.

### Scopes Requested

**OAuth:** `repo`, `write:discussion`, `read:discussion`
**PAT:** User selects manually; app validates minimum `repo` scope

### Logout

1. User clicks "Disconnect" in Settings
2. `AuthService.logout()` — clear token, user, cached data
3. Renderer resets state, shows connect screen

---

## 3. Repository Management

### Repo Model

```ts
interface Repo {
  id: number;              // GitHub repo ID
  owner: string;
  name: string;
  fullName: string;        // "owner/name"
  localPath: string;       // absolute path to local clone
  defaultBranch: string;
  isPrivate: boolean;
  lastSyncedAt: number;
}
```

### Adding a Repository

1. User clicks "Add Repository" → dialog opens
2. Two modes:
   - **Search:** queries `GET /user/repos?sort=updated`, paginated results
   - **Manual:** paste URL, parse owner/name, validate with `GET /repos/{owner}/{name}`
3. Check if already cloned locally (scan `~/projects`, `~/code`, `~/repos`)
4. If not found: prompt for clone destination (default `~/projects/<repo-name>`)
5. Clone if needed: `git clone <url> <dest>`
6. Store config, set as active if first repo, trigger initial data fetch

### Removing a Repository

1. Confirmation dialog: "Remove stablyai/orca? Won't delete local clone."
2. Remove from electron-store, clear cached data
3. If was active: set `activeRepoId` to null or first remaining repo

### Switching Active Repository

1. User clicks repo chip → dropdown
2. Select different repo → `RepoService.setActiveRepo(id)`
3. Renderer clears current data, fetches for new repo

### Multi-Repo Overview

1. User clicks "All Repos" in top nav
2. `GitHubContext.setActiveRepo(null)` — special "all repos" mode
3. Fetch open issues + PRs (last 7 days) for each repo
4. Aggregate counts, group by repo for display

---

## 4. Data Fetching & Caching (Polling)

### Polling Architecture

```
PollingManager
├── startPolling(intervalMs)
├── stopPolling()
├── setInterval(ms)
├── poll() — fetches updated data since lastSync
└── getState() — { isPolling, interval, lastSync }
```

### Polling Intervals

User-configurable: 15s / 30s (default) / 60s / 5m / 15m

### Conditional Requests (ETags)

```ts
// Use If-None-Match headers to minimize rate limit usage
const headers: Record<string, string> = {};
const etag = this.etags.get(cacheKey);
if (etag) headers['If-None-Match'] = etag;

const response = await octokit.rest.issues.listForRepo({ ...headers });

// 304 Not Modified — use cached data
if (response.status === 304) return cachedData;

// 200 OK — new data, store ETag
this.etags.set(cacheKey, response.headers.etag);
```

### Incremental Polling

Only fetch data changed since `lastSyncedAt`:

```ts
const issues = await octokit.rest.issues.listForRepo({
  owner, repo, state: 'all',
  since: new Date(lastSync).toISOString()
});
```

### Cache TTLs

```ts
const CACHE_TTLS = {
  issues: 60_000,        // 1 min
  prs: 60_000,           // 1 min
  branches: 5 * 60_000,  // 5 min
  prDetail: 30_000,      // 30 sec
  ciStatus: 30_000,      // 30 sec
  repoInfo: 60 * 60_000  // 1 hour
};
```

### Rate Limit Tracking

```ts
class RateLimitTracker {
  remaining: number;
  limit: number;
  resetAt: number;

  canMakeRequest(): boolean { return this.remaining > 100; }
  getWaitTime(): number { return Math.max(0, this.resetAt - Date.now()); }
  getState(): { remaining, limit, resetAt, isLow, isExhausted };
}
```

---

## 5. Worktree Management

### Worktree Model

```ts
interface Worktree {
  id: string;
  repoId: number;
  path: string;                  // <repo>/.worktrees/<branch>
  branch: string;
  baseBranch: string;
  issueNumber?: number;
  agentId?: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  createdAt: number;
  lastCommitAt?: number;
  uncommittedChanges: boolean;
  aheadOfRemote: number;
  behindRemote: number;
  linkedPR?: { number: number; state: 'open' | 'closed' | 'merged' };
}
```

### Worktree Location

All worktrees inside repo: `<repo>/.worktrees/<branch>/`

### Creating a Worktree

1. Dialog: branch name (auto-generated from issue title), base branch
2. `WorktreeService.create()`:
   - Validate branch doesn't exist
   - Create `.worktrees/` directory if needed
   - `git worktree add <path> -b <branch> <baseBranch>`
   - Store metadata in electron-store
3. Return Worktree object

### Branch Name Generation

```ts
function generateBranchName(issue: { number: number; title: string }): string {
  const slug = issue.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
  return `fix/${issue.number}-${slug}`;
}
```

### Worktree Actions

- **Assign Agent** → Agent Assignment Modal
- **Open Terminal** → focus terminal in worktree path
- **Create PR** → PR Composer (if no PR exists)
- **Sync** → `git push origin <branch>`
- **Pause** → kill agent, keep worktree
- **Resume** → re-assign agent
- **Remove** → `git worktree remove` (with confirmation)

### Worktree ↔ PR Linking

```ts
async getLinkedPR(worktree: Worktree) {
  const prs = await octokit.rest.pulls.list({
    owner, repo, state: 'all',
    head: `${owner}:${worktree.branch}`
  });
  return prs.data.length > 0 ? { number: prs.data[0].number, state: prs.data[0].state } : null;
}
```

---

## 6. Agent↔GitHub Linking (Bi-Directional)

### Agent Assignment Flow

1. User clicks "Assign Agent" → modal opens
2. Select agent + worktree (or create new)
3. `AgentGitBridge.assignAgent()`:
   - Create worktree if "create new" selected
   - Update worktree metadata: `agentId`, `issueNumber`, `status → 'active'`
   - Spawn agent session in worktree path with env vars
   - Start PR feedback polling
4. UI updates: issue row gets agent badge, worktree shows agent name

### Agent Environment Variables

```ts
env: {
  GIT_WORKTREE: '/path/to/repo/.worktrees/fix-123-agent-auth',
  GITHUB_ISSUE: '123',
  GITHUB_REPO: 'stablyai/orca',
  GITHUB_BRANCH: 'fix/123-agent-authentication',
  GITHUB_BASE_BRANCH: 'main',
  PIDASH_AGENT_ID: 'claude-code',
  PIDASH_SESSION_ID: 'abc-123-def'
}
```

### Agent Creates PR

1. Agent calls IPC: `agent-github:create-pr`
2. `AgentGitBridge.createPRForWorktree()`:
   - Validate worktree has commits ahead
   - `git push origin <branch>`
   - Generate PR title/description from issue + commits
   - `POST /repos/{owner}/{repo}/pulls`
   - Store PR number in worktree metadata
3. UI updates: worktree shows PR number, PR appears in PRsTab

### PR Feedback Streaming (Poll → Inject)

```ts
class AgentGitBridge {
  private feedbackPollers = new Map<string, NodeJS.Timeout>();
  private lastCommentIds = new Map<string, Set<number>>();

  startFeedbackPolling(worktree: Worktree) {
    const interval = setInterval(() => this.pollAndInjectFeedback(worktree), 30_000);
    this.feedbackPollers.set(worktree.id, interval);
  }

  async pollAndInjectFeedback(worktree: Worktree) {
    const comments = await prService.fetchPRComments(repo.owner, repo.name, worktree.linkedPR!.number);
    const seenIds = this.lastCommentIds.get(worktree.id)!;
    const newComments = comments.filter(c => !seenIds.has(c.id));

    for (const comment of newComments) {
      await this.injectFeedbackToTerminal(worktree, comment);
      seenIds.add(comment.id);
    }
  }

  async injectFeedbackToTerminal(worktree: Worktree, comment: PRComment) {
    const session = sessionManager.getSessionByWorktree(worktree.id);
    if (!session) return;

    const feedback = [
      '',
      '━━━ GitHub PR Feedback ━━━',
      `From: ${comment.author}`,
      `Type: ${comment.type}`,
      `File: ${comment.path || 'general'}`,
      `Line: ${comment.line || 'N/A'}`,
      '',
      comment.body,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━',
      ''
    ].join('\n');

    session.write(feedback);
  }
}
```

### Agent Unassignment

1. Kill agent session
2. Stop feedback polling
3. Update worktree: `agentId = null`, `status → 'paused'`

---

## 7. UI Structure

### Navigation

```
Sidebar: Dashboard | Issues | Worktrees | PRs | Multi-Repo | Settings
TopBar: Logo | Repo chip | GitHub status | User avatar
```

### Full Pages

| Page | Component | Description |
|---|---|---|
| Dashboard | `Dashboard.tsx` | FleetPanel + GitHubPanel + ActivityFeed |
| Issues | `IssuesPage.tsx` | Split view: list + detail |
| Worktrees | `WorktreesPage.tsx` | Metrics + worktree cards |
| PRs | `PRsPage.tsx` | PR list with search/filter |
| PR Detail | `PRDetailPage.tsx` | Summary + feedback panel |
| New Issue | `NewIssuePage.tsx` | Title + markdown + sidebar metadata |
| Multi-Repo | `MultiRepoOverviewPage.tsx` | Metrics + grouped lists |
| Settings | `SettingsScreen.tsx` | Sidebar + GitHub Settings panel |

### Modals

| Modal | Component | Trigger |
|---|---|---|
| Agent Assignment | `AgentAssignmentModal.tsx` | "Assign Agent" button |
| Create Worktree | `CreateWorktreeDialog.tsx` | "Create Worktree" button |
| PR Composer | `PRComposer.tsx` | "Create PR" button |
| Add Repository | `AddRepositoryDialog.tsx` | "+ Add Repository" |
| Rate Limit Banner | `RateLimitBanner.tsx` | Auto-show when limit low |

### Design Screen → Component Mapping

| Design Screen | Component |
|---|---|
| GitHub Settings — Connect | `GitHubSettings.tsx` (unauth state) |
| GitHub Settings (connected) | `GitHubSettings.tsx` (auth state) |
| Dashboard — GitHub Connected | `Dashboard.tsx` + `GitHubPanel.tsx` |
| GitHub Issues | `IssuesPage.tsx` |
| Git Worktrees — GitHub | `WorktreesPage.tsx` |
| GitHub PRs | `PRsPage.tsx` |
| Pull Request Detail | `PRDetailPage.tsx` |
| New Issue | `NewIssuePage.tsx` |
| Multi-Repo Overview | `MultiRepoOverviewPage.tsx` |
| Agent Assignment Modal | `AgentAssignmentModal.tsx` |
| PR Composer Dialog | `PRComposer.tsx` |
| Add Repository Dialog | `AddRepositoryDialog.tsx` |
| GitHub Panel — States | `GitHubPanel.tsx` (variants) |
| PR Detail — Changes Requested | `PRDetailPage.tsx` (variant) |
| PR Detail — Checks Expanded | `PRDetailPage.tsx` (expanded) |
| PR Detail — Review Mode | `PRDetailPage.tsx` (review composer) |
| PR Detail — Agent Session | `PRDetailPage.tsx` (agent tab) |
| Rate Limit Warning | `RateLimitBanner.tsx` |

---

## 8. Error Handling

### Error Types

```ts
type GitHubError =
  | AuthError           // token invalid, expired, revoked
  | RateLimitError      // API limit exceeded
  | NetworkError        // no internet, timeout
  | NotFoundError       // repo/issue/PR doesn't exist
  | PermissionError     // insufficient scopes
  | ValidationError     // invalid input
  | GitError;           // git command failed
```

### Error Handling

| Error | Detection | Response |
|---|---|---|
| Auth expired | 401 response | Clear token, show re-auth screen, cached data read-only |
| Rate limit | 403 + "rate limit" | Pause polling, show banner with countdown, auto-resume on reset |
| Network error | Fetch failure | Retry 3x with backoff, show offline banner, cached data visible |
| Not found | 404 response | Remove from config/cache, show toast |
| Insufficient scopes | 403 + "scope" | Show warning with link to update scopes, read-only fallback |
| Git errors | Git command failure | Parse error, show specific message (branch-exists, path-occupied) |

### Edge Cases

- **Agent session dies:** worktree → paused, stop polling, show "Resume" button
- **Worktree removed while agent running:** confirmation dialog, kill session first
- **PR merged while agent working:** show "Merged" badge, agent can continue
- **Multiple agents on same issue:** not allowed, UI disables button
- **Repo deleted on GitHub:** auto-remove from config, notify user
- **Token scopes changed:** detect 403, notify, read-only until re-auth

### Loading States

- **Loading:** skeleton placeholders
- **Empty:** icon + message + action button
- **Error:** inline error + retry button

### Optimistic Updates

For create/comment/merge: immediately update UI, rollback on error with toast.

---

## Shared Types

```ts
interface Repo {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  localPath: string;
  defaultBranch: string;
  isPrivate: boolean;
  lastSyncedAt: number;
}

interface Worktree {
  id: string;
  repoId: number;
  path: string;
  branch: string;
  baseBranch: string;
  issueNumber?: number;
  agentId?: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  createdAt: number;
  lastCommitAt?: number;
  uncommittedChanges: boolean;
  aheadOfRemote: number;
  behindRemote: number;
  linkedPR?: { number: number; state: 'open' | 'closed' | 'merged' };
}

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  assignee?: { login: string };
  author: { login: string; avatarUrl: string };
  createdAt: string;
  updatedAt: string;
  comments: GitHubComment[];
}

interface GitHubPR {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  head: { ref: string; sha: string };
  base: { ref: string };
  user: { login: string; avatarUrl: string };
  createdAt: string;
  updatedAt: string;
  additions: number;
  deletions: number;
  commits: number;
  changedFiles: number;
  ciStatus: 'passing' | 'failing' | 'pending' | 'none';
  reviews: GitHubReview[];
  comments: GitHubComment[];
}

interface GitHubComment {
  id: number;
  author: { login: string; avatarUrl: string };
  body: string;
  createdAt: string;
  path?: string;      // for PR review comments
  line?: number;       // for PR review comments
  type: 'issue' | 'pr' | 'review';
}

interface GitHubReview {
  id: number;
  author: { login: string; avatarUrl: string };
  body: string;
  state: 'approved' | 'changes_requested' | 'commented' | 'pending';
  submittedAt: string;
}

interface PollingState {
  isPolling: boolean;
  interval: number;
  lastSync: number;
  remaining: number;
  limit: number;
  resetAt: number;
}
```
