# GitHub Integration Design

> **Feature:** Full GitHub integration for monitoring, worktree management, and bi-directional agent communication  
> **Date:** 2026-08-06  
> **Status:** Approved for implementation

## Overview

Integrate PiDash with GitHub to enable monitoring of issues/PRs, manual worktree creation from issues, and bi-directional communication between agents and GitHub (PR creation, commenting, reading feedback). Support OAuth and PAT authentication, multiple repositories, and real-time or polling-based updates.

## Design Decisions

### Architecture: Full Electron Implementation

**Decision:** Build all GitHub integration in the Electron main process with REST/GraphQL API calls, OAuth flow, and worktree management via git CLI.

**Rationale:**
- Full control over UX and error handling
- Works offline for cached data
- No external dependencies beyond Node.js
- Enables complex workflows (annotate diffs → send to agent)
- Can always extract a service later if building a team version

**Alternatives considered:**
- Hybrid with GitHub CLI: less code but requires `gh` installed, less control
- Backend service: overkill for single-user desktop app, adds complexity

### Authentication: OAuth + PAT

**Decision:** Support both OAuth app flow and Personal Access Tokens, stored securely in electron-store with encryption.

**Rationale:**
- OAuth provides better UX (no manual token creation)
- PAT provides fallback for users who prefer manual control
- Encrypted storage keeps tokens secure
- Main process owns all GitHub operations (tokens never exposed to renderer)

### Repository Scope: Multiple Repositories

**Decision:** Allow users to configure multiple repositories, switch between them via RepoSwitcher, with data scoped to active repo.

**Rationale:**
- Matches how developers work (multiple projects)
- Prevents data overload (only fetch active repo data)
- Simple to implement (just filter by repoId)

### Worktree Management: Manual Creation

**Decision:** Users manually create worktrees from issues/PRs via "Create Worktree" button. Agents work in worktrees but don't auto-create them.

**Rationale:**
- Gives users control over worktree lifecycle
- Simpler than auto-creation (no branch naming logic, no conflict detection)
- Agents can still request worktrees via commands if needed later

### Agent-GitHub Interaction: Bi-Directional

**Decision:** Agents can create PRs, comment on issues, read PR feedback, and respond. Users can also comment on issues/PRs from the dashboard.

**Rationale:**
- Matches Orca's level of integration
- Enables true autonomous workflows
- Users can review and guide agents from dashboard
- Bi-directional communication is table stakes for agent dashboards

### Data Display: Design Taste Compliance

**Decision:** All GitHub UI follows design-taste-frontend skill principles: no emojis (use lucide-react icons), consistent color palette (emerald/amber/rose/blue), Geist fonts, rounded-lg cards, rounded-md buttons, skeletal loaders, composed empty states.

**Rationale:**
- Prevents AI design slop (no emojis, no AI purple)
- Consistent with existing project conventions
- Professional, scannable interface
- Accessible (proper contrast, icon + text labels)

## Architecture

### Component Hierarchy

```
Main Process
├── GitHubService (singleton)
│   ├── AuthService (OAuth + PAT management)
│   ├── RepoService (multi-repo queries, caching)
│   ├── PRService (create, update, comment, review)
│   ├── IssueService (create, update, comment, assign)
│   └── WebhookServer (optional, for real-time updates)
├── WorktreeService
│   ├── create(repoPath, issue/branch) → worktreePath
│   ├── list(repoPath) → Worktree[]
│   └── remove(worktreePath)
├── AgentGitBridge
│   ├── assignAgent(worktreePath, agentId)
│   ├── getAgentStatus(worktreePath) → AgentStatus
│   └── syncToGitHub(worktreePath) → push, create PR
└── IPC Handlers
    ├── github:* (auth, repos, PRs, issues)
    ├── worktree:* (create, list, remove)
    └── agent-github:* (assign, sync, status)

Renderer
├── GitHubContext (global state for GitHub data)
│   ├── auth: { method: 'oauth' | 'pat', token, user }
│   ├── repos: Repo[] (configured repos)
│   ├── activeRepo: Repo | null
│   └── refresh() → refetch all data
├── Components
│   ├── GitHubSettings (auth setup, repo management)
│   ├── RepoSwitcher (topbar dropdown)
│   ├── GitHubPanel (dashboard sidebar)
│   │   ├── IssuesTab (filtered by agent/status)
│   │   ├── PRsTab (filtered by agent/status)
│   │   └── BranchesTab (active worktrees)
│   ├── WorktreeCard (per worktree, shows agent + status)
│   ├── PRComposer (create PR from worktree)
│   └── DiffAnnotator (review PR, send comments to agent)
```

### Data Flow

```
GitHub API ←→ GitHubService (main) ←→ IPC ←→ GitHubContext (renderer)
                                              ↓
                                         Components
                                              ↓
User actions → IPC → WorktreeService → git CLI → worktrees
                                              ↓
                              AgentGitBridge → agent sessions
                                              ↓
                              syncToGitHub → GitHubService → GitHub API
```

### Key Design Principles

**1. Main process owns all GitHub operations**
- Renderer never talks to GitHub directly
- Easier to handle auth, rate limiting, caching in one place
- Security: tokens stay in main process, never exposed to renderer

**2. WorktreeService is separate from GitHubService**
- Worktrees are local git operations, not GitHub-specific
- Can be used independently (e.g., manual worktree creation without issues)
- AgentGitBridge connects worktrees to agents and GitHub

**3. GitHubContext is global, but scoped to active repo**
- User switches repos via RepoSwitcher
- Context refetches data for new repo
- Prevents data overload from multiple repos

**4. Optional webhook server**
- Default: poll GitHub every 30s for updates
- Optional: start webhook server on localhost for real-time updates
- User can enable in settings if they want instant updates

## Authentication

### OAuth Flow

```
1. User clicks "Connect with GitHub" in Settings
2. Main process spawns BrowserWindow → GitHub OAuth authorization URL
3. User authorizes app on GitHub
4. GitHub redirects to http://localhost:9876/callback?code=XXX
5. Main process Express server (temporary, one-shot) receives code
6. Exchange code for access token via GitHub API
7. Store token in electron-store (encrypted with app-secret)
8. Close BrowserWindow, notify renderer of success
9. Fetch user profile, display in settings
```

### PAT Flow

```
1. User clicks "Use Personal Access Token"
2. Renderer shows input field + link to GitHub token creation
3. User pastes token, clicks "Save"
4. Main process validates token via GitHub API (GET /user)
5. If valid: store in electron-store (encrypted)
6. If invalid: show error, don't save
7. Notify renderer of success/failure
```

### Token Storage

```ts
// electron-store schema
{
  github: {
    authMethod: 'oauth' | 'pat' | null,
    accessToken: string, // encrypted
    refreshToken?: string, // OAuth only, encrypted
    tokenExpiresAt?: number, // OAuth only
    user: {
      id: number,
      login: string,
      avatarUrl: string
    } | null
  }
}
```

**Encryption:** Use `electron-store`'s built-in encryption with a machine-specific key (derived from hostname + username). Tokens never leave the main process.

### Token Refresh (OAuth)

```ts
// Before each API call
if (Date.now() > tokenExpiresAt - 5min) {
  await refreshAccessToken(refreshToken);
  // Update stored token
}
```

GitHub OAuth tokens don't expire by default, but if the user revokes access or enables token expiration, we handle refresh.

### Scopes Requested

**OAuth:**
- `repo` (full control of private repositories)
- `write:discussion` (create comments)
- `read:discussion` (read comments)
- `workflow` (update GitHub Actions workflows, if needed later)

**PAT:**
- User manually selects scopes when creating token
- App validates minimum required scopes on save
- Show warning if scopes are insufficient

## Repository Management

### Multi-Repo Model

```ts
type Repo = {
  id: number;           // GitHub repo ID
  owner: string;        // e.g., "stablyai"
  name: string;         // e.g., "orca"
  fullName: string;     // "stablyai/orca"
  localPath: string;    // absolute path to local clone
  defaultBranch: string; // e.g., "main"
  isPrivate: boolean;
  lastSyncedAt: number; // timestamp
};

type RepoConfig = {
  repos: Repo[];
  activeRepoId: number | null;
};
```

### Adding Repos

```
1. User clicks "Add Repository" in GitHub Settings
2. Dialog shows:
   - Search field (queries GitHub API: GET /user/repos)
   - List of user's repos (paginated, filterable)
   - "Or enter repo URL" text input for manual entry
3. User selects repo or enters URL
4. App checks if repo is already cloned locally:
   - If yes: use existing path
   - If no: prompt for clone destination, then `git clone`
5. Store repo config in electron-store
6. Fetch initial data (issues, PRs, branches) in background
```

### Switching Repos

```
RepoSwitcher (topbar dropdown):
┌─────────────────────────────┐
│  stablyai/orca         ●    │
│  myorg/frontend        ●    │
│  personal/blog         ●    │
│  ─────────────────────────  │
│  + Add Repository           │
└─────────────────────────────┘

Click repo → GitHubContext.setActiveRepo(repoId)
  → Refetch issues, PRs, branches for new repo
  → Update GitHubPanel, WorktreeCards
  → Persist activeRepoId
```

### Data Caching

```ts
// Main process cache (in-memory, persisted to disk)
class RepoCache {
  private cache = new Map<string, {
    data: any;
    fetchedAt: number;
    etag?: string; // for conditional requests
  }>();

  async get(key: string, fetcher: () => Promise<any>, ttlMs: number) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.fetchedAt < ttlMs) {
      return cached.data;
    }
    const data = await fetcher();
    this.cache.set(key, { data, fetchedAt: Date.now() });
    return data;
  }
}

// TTLs
const CACHE_TTLS = {
  issues: 60_000,      // 1 min
  pullRequests: 60_000, // 1 min
  branches: 5 * 60_000, // 5 min
  repoInfo: 60 * 60_000 // 1 hour
};
```

### Sync Strategy

**Default: Polling**
- Every 30s: fetch updated issues/PRs since `lastSyncedAt`
- Use `If-None-Match` (ETag) headers to avoid rate limits
- Update cache, notify renderer via IPC

**Optional: Webhooks**
- User enables in Settings → "Real-time updates"
- Main process starts Express server on `localhost:9877`
- Register webhook on GitHub (requires public URL or ngrok)
- Receive `push`, `issues`, `pull_request` events
- Update cache immediately, notify renderer

## Worktree Management

### Worktree Model

```ts
type Worktree = {
  id: string;              // UUID
  repoId: number;          // GitHub repo ID
  path: string;            // absolute path to worktree
  branch: string;          // branch name
  baseBranch: string;      // e.g., "main"
  issueNumber?: number;    // linked GitHub issue (optional)
  agentId?: string;        // assigned agent (optional)
  status: 'active' | 'paused' | 'completed' | 'error';
  createdAt: number;
  lastCommitAt?: number;
  uncommittedChanges: boolean;
};
```

### Manual Creation Flow

```
User workflow:
1. Browse issues in GitHubPanel → IssuesTab
2. Click issue card → expand details
3. Click "Create Worktree" button
4. Dialog appears:
   ┌─────────────────────────────────────┐
   │  Create Worktree for Issue #123     │
   │                                     │
   │  Branch name:                       │
   │  [fix/123-agent-authentication  ]   │
   │                                     │
   │  Base branch:                       │
   │  [main                         ▼]   │
   │                                     │
   │  Location:                          │
   │  [/home/user/projects/orca      ]   │
   │  [Browse...]                        │
   │                                     │
   │  [Cancel]  [Create Worktree]        │
   └─────────────────────────────────────┘
5. User confirms → main process executes:
   a. git worktree add /path/to/worktree -b fix/123-agent-authentication main
   b. Store worktree metadata in electron-store
   c. Return worktree object to renderer
6. WorktreeCard appears in dashboard
7. User can now "Assign Agent" to start working
```

### Worktree Lifecycle

```
Created → Active → Completed/Removed
         ↓
      Paused (agent exited, worktree preserved)
         ↓
      Active (re-assign agent)
```

**Actions per worktree:**
- **Assign Agent** → opens agent picker, spawns session in worktree path
- **Open Terminal** → focus main terminal or open overlay in worktree
- **Pause** → kill agent session, keep worktree
- **Resume** → re-assign agent to existing worktree
- **Create PR** → opens PR composer (see Agent-GitHub Interaction section)
- **Sync to GitHub** → push branch, update PR if exists
- **Remove** → `git worktree remove`, delete metadata

### WorktreeService API

```ts
// Main process
class WorktreeService {
  async create(params: {
    repoPath: string;
    branch: string;
    baseBranch: string;
    destination: string;
    issueNumber?: number;
  }): Promise<Worktree>;

  async list(repoPath: string): Promise<Worktree[]>;

  async remove(worktreePath: string): Promise<void>;

  async getStatus(worktreePath: string): Promise<{
    uncommittedChanges: boolean;
    aheadOfRemote: number;
    behindRemote: number;
    lastCommitHash: string;
  }>;
}
```

### Agent Assignment

```ts
// When user clicks "Assign Agent" on WorktreeCard
async function assignAgent(worktree: Worktree, agentId: string) {
  // 1. Update worktree metadata
  await worktreeService.assignAgent(worktree.id, agentId);

  // 2. Spawn agent session in worktree path
  await sessionManager.spawn({
    agentId,
    cwd: worktree.path,
    env: {
      ...process.env,
      GIT_WORKTREE: worktree.path,
      GITHUB_ISSUE: worktree.issueNumber?.toString(),
    }
  });

  // 3. Update UI
  worktree.status = 'active';
  worktree.agentId = agentId;
}
```

## GitHub Data Display

### Dashboard Integration

```
Dashboard
├── Topbar
│   ├── RepoSwitcher (dropdown, rounded-md)
│   └── GitHub status indicator (icon + tooltip)
├── FleetPanel (left sidebar)
│   ├── Running (agents with active sessions)
│   ├── Available (detected agents)
│   └── GitHubPanel (collapsible, border-t separator)
│       ├── Tabs (Issues / PRs / Branches)
│       └── FilterBar (dropdowns, rounded-md)
├── MainTerminal / Dashboard view
└── ActivityFeed (GitHub events with icons)
```

### Design Principles

**Applied from design-taste skill:**
- **No emojis** — use lucide-react icons for all status indicators
- **Color consistency** — single accent color per context (emerald for success, amber for warnings, rose for errors, blue for info)
- **Typography** — Geist for UI, Geist Mono for numbers/code
- **Shape consistency** — all cards use `rounded-lg` (8px), buttons use `rounded-md` (6px), badges use `rounded-full`
- **Loading states** — skeletal loaders matching final layout
- **Empty states** — composed with icon + message + action
- **Error states** — inline with clear recovery path

### Issues Tab

**Data source:** `GET /repos/{owner}/{repo}/issues?state=open&sort=updated`

**Display:**
- Issue number (Geist Mono, `text-sm text-muted-foreground`)
- Title (Geist, `text-base font-medium`)
- Labels (colored badges, `rounded-full px-2 py-0.5 text-xs`)
- Assignee (agent icon if assigned, or `text-muted-foreground` if unassigned)
- Linked worktree (lucide-git-branch icon + branch name in Geist Mono)
- Actions: buttons with `rounded-md`, `bg-secondary hover:bg-secondary/80`

**Status indicators (icons, not emojis):**
- Open: `lucide-circle` (outline, `text-muted-foreground`)
- In progress: `lucide-dot` (filled, `text-emerald-500`)
- Closed: `lucide-check-circle-2` (`text-muted-foreground`)

**Filtering:**
- State: open / closed / all (dropdown, `rounded-md`)
- Labels: multi-select (badges with `rounded-full`)
- Assignee: unassigned / specific agent / any
- Search: input with `rounded-md`, `bg-background border`

### PRs Tab

**Data source:** `GET /repos/{owner}/{repo}/pulls?state=open&sort=updated`

**Display:**
- PR number, title
- Branch → base branch (Geist Mono)
- Author (agent or user)
- Time since creation
- Diff stats (+/- lines, emerald/rose)
- CI status (passing/failing/pending)
- Review status (approvals, changes requested)
- Actions: "View" (open in browser), "Merge" (if passing), "Retry CI"

**CI status (icons):**
- Passing: `lucide-check-circle-2` (`text-emerald-500`)
- Failing: `lucide-x-circle` (`text-rose-500`)
- Pending: `lucide-clock` (`text-amber-500`)

### Branches Tab (Worktrees)

**Display:**
- Branch name (Geist Mono)
- Linked issue (if any)
- Assigned agent
- Time since creation
- Commit count, diff stats
- Uncommitted changes indicator
- Actions: "Open" (focus terminal), "PR" (create PR), "Sync" (push), "Remove"

**Status indicators:**
- Clean: no indicator
- Uncommitted changes: `lucide-alert-circle` (`text-amber-500`)
- Ahead of remote: `lucide-arrow-up` (`text-emerald-500`)
- Behind remote: `lucide-arrow-down` (`text-amber-500`)

### Activity Feed Integration

GitHub events appear in the activity feed with icons:

**Event icons:**
- PR created/merged: `lucide-git-merge` (`text-emerald-500`)
- PR closed: `lucide-git-pull-request-close` (`text-rose-500`)
- Issue assigned: `lucide-user-plus` (`text-blue-500`)
- Issue closed: `lucide-check-circle-2` (`text-emerald-500`)
- Comment: `lucide-message-circle` (`text-muted-foreground`)
- CI status: `lucide-check-circle-2` / `lucide-x-circle` / `lucide-clock`

### Color Palette

**Consistent with existing project:**
- Background: `#0a0a0a`
- Cards: `#1a1a1a`
- Borders: `#2a2a2a`
- Text: `#ffffff` (primary), `#a0a0a0` (muted)

**Accent colors (locked, no fluctuation):**
- Success/merged: `emerald-500` (`#10b981`)
- Warning/pending: `amber-500` (`#f59e0b`)
- Error/failing: `rose-500` (`#f43f5e`)
- Info/open: `blue-500` (`#3b82f6`)

## Agent-GitHub Interaction

### Bi-Directional Communication Model

```
Agent Session ←→ AgentGitBridge ←→ GitHubService ←→ GitHub API
                     ↓
              WorktreeContext
              (tracks agent ↔ worktree ↔ PR/issue)
```

### PR Creation Flow

**Manual (user-initiated):**
```
1. User clicks "PR" button on WorktreeCard
2. PRComposer dialog opens
3. User fills form (title, description, base branch, reviewers, labels)
4. User clicks "Create PR"
5. Main process:
   a. git push origin <branch>
   b. POST /repos/{owner}/{repo}/pulls
   c. Store PR metadata in worktree context
   d. Notify renderer: PR created
6. WorktreeCard updates: shows PR number, status
```

**Agent-initiated:**
```
1. Agent detects work is complete
2. Agent calls IPC: agent-github:create-pr
3. Main process:
   a. Validate worktree has commits ahead
   b. git push origin <branch>
   c. POST /repos/{owner}/{repo}/pulls
   d. Return PR URL to agent
4. Agent receives PR URL, can continue working or exit
5. UI updates: PR appears in PRsTab, WorktreeCard shows PR status
```

### Issue Commenting

**Agent-initiated:**
```
1. Agent needs clarification or wants to report progress
2. Agent calls IPC: agent-github:comment-issue
3. Main process: POST /repos/{owner}/{repo}/issues/{number}/comments
4. Comment appears in GitHub issue
5. ActivityFeed shows comment event
```

**User-initiated (from dashboard):**
```
1. User clicks issue in IssuesTab
2. IssueDetail panel slides out
3. User types comment, clicks "Send"
4. Main process: POST /repos/{owner}/{repo}/issues/{number}/comments
5. Comment appears in panel, synced to GitHub
```

### Reading PR Feedback

**Polling (default):**
```
1. Every 60s: fetch PR comments + review comments
2. Compare with cached comments
3. New comments → notify agent session via IPC
4. Agent receives feedback, can respond or act on it
5. ActivityFeed shows review event
```

**Webhooks (optional):**
```
1. Webhook receives `pull_request_review` event
2. Main process parses review comments
3. Notify agent session immediately (no polling delay)
4. Agent can respond in real-time
```

### Diff Annotation (Orca-style)

```
1. User opens PR in dashboard
2. DiffViewer panel opens with file list
3. User clicks line in diff
4. "Add comment on line X" input appears
5. User types comment, clicks "Send to agent"
6. Main process:
   a. POST /repos/{owner}/{repo}/pulls/{number}/comments
   b. Notify agent session: agent-github:pr-feedback
7. Agent receives annotation, can respond
```

### Agent Status Updates

**Automatic (agent-initiated):**
```
1. Agent starts working on issue
2. Agent calls IPC: agent-github:update-issue
3. Main process:
   a. PATCH /repos/{owner}/{repo}/issues/{number} (add label: "in progress")
   b. POST comment: "Starting implementation now."
4. GitHub issue shows agent is working
5. UI updates: IssuesTab shows "in progress" badge
```

## Error Handling & Rate Limiting

### Rate Limiting Strategy

**GitHub API limits:**
- Authenticated: 5,000 requests/hour
- Secondary rate limits: 100 requests/minute for REST

**Tracking:**
```ts
class RateLimitTracker {
  private remaining: number = 5000;
  private resetAt: number = 0;

  updateFromHeaders(headers: Headers) {
    this.remaining = parseInt(headers.get('x-ratelimit-remaining') || '0');
    this.resetAt = parseInt(headers.get('x-ratelimit-reset') || '0') * 1000;
  }

  canMakeRequest(): boolean {
    return this.remaining > 10; // buffer
  }

  getWaitTime(): number {
    if (this.canMakeRequest()) return 0;
    return Math.max(0, this.resetAt - Date.now());
  }
}
```

**Behavior:**
- Before each request: check `canMakeRequest()`
- If rate limited: queue request, wait until `resetAt`, then retry
- Show toast: "Rate limited. Retrying in Xs." with countdown
- UI indicator: GitHubPanel header shows "Rate limited" badge with reset time

### Error Categories

**1. Authentication errors:**
- Invalid token: Show "Re-authenticate" button in Settings
- Token expired (OAuth): Auto-refresh, or prompt for re-auth
- Insufficient scopes: Show "Update token scopes" with link

**2. Network errors:**
- Offline: Show "No internet connection" banner, queue operations
- Timeout: Retry 3x with exponential backoff, then show error

**3. Permission errors:**
- 403 Forbidden: Show "Insufficient permissions"
- 404 Not Found: Show "Repository not found"

**4. Validation errors:**
- Branch already exists: Show "Branch already exists"
- PR already exists: Show "PR already exists" with link

**5. Rate limit errors:**
- Primary rate limit: Queue request, wait until reset
- Secondary rate limit: Back off 60s, retry

### Error UI Patterns

**Toast notifications (transient errors):**
```ts
toast.error("Rate limited", {
  description: "Retrying in 45s",
  duration: 5000
});
```

**Inline errors (form submissions):**
- Red border on input
- Error text below input with `lucide-alert-circle` icon

**Banner errors (persistent issues):**
- Top of dashboard: "No internet connection. GitHub features disabled. [Retry]"

**Badge errors (status indicators):**
- GitHubPanel header: "Rate limited · 45s" (amber badge)
- GitHubPanel header: "Sync error" (rose badge)

### Graceful Degradation

**Offline mode:**
- Cache last known state (issues, PRs, worktrees)
- Allow viewing cached data (read-only)
- Queue write operations
- When back online: flush queue, show "Synced X operations" toast

**Partial failures:**
- If GitHub API is slow: show loading skeletons, don't block UI
- If webhook server fails to start: fall back to polling, show warning
- If worktree creation fails: clean up partial state, show error

## Testing Strategy

### Unit Tests

**GitHubService:**
- authenticate: validates OAuth token, validates PAT, rejects invalid tokens
- fetchIssues: returns open issues, filters by label/assignee, handles pagination, caches results
- createPR: creates PR, throws if branch has PR, retries on network error
- rateLimitTracker: updates from headers, returns wait time, queues requests

**WorktreeService:**
- create: creates worktree, throws if branch exists, stores metadata
- list: returns all worktrees, includes status
- remove: removes worktree, cleans up metadata

**AgentGitBridge:**
- assignAgent: spawns agent session, sets env vars, updates metadata
- syncToGitHub: pushes branch, creates PR, throws if no commits

### Integration Tests

- OAuth flow end-to-end
- PR creation flow (worktree → commit → push → PR)
- Agent feedback loop (receive comment → notify agent → agent responds)

### Component Tests

- GitHubPanel: renders tabs, shows loading/empty states, filters issues
- PRComposer: validates form, shows errors, creates PR
- WorktreeCard: displays branch/issue/agent, handles actions

### Test Coverage Goals

- GitHubService: 90%+
- WorktreeService: 85%+
- AgentGitBridge: 80%+
- Components: 70%+
- Overall: 80%+