# GitHub Integration Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full GitHub integration with authentication, multi-repo management, issue/PR CRUD, worktree management, and bi-directional agent↔GitHub linking.

**Architecture:** Separated concerns — extend existing service structure (GitHubService, AuthService, RepoService, DataService) with new IssueService and PRService. Hybrid UI with full pages (Issues, Worktrees, PRs, Multi-Repo) and modals (Agent Assignment, Create Worktree, PR Composer). Polling-only data fetching with ETags. Agent feedback injected to PTY stdin.

**Tech Stack:** TypeScript, Electron, Octokit, simple-git, React, electron-store, node-pty

## Global Constraints

- All GitHub API calls go through `GitHubService.makeRequest()` for rate limit handling
- Tokens stored encrypted in electron-store, never exposed to renderer
- Worktrees created inside repo: `<repo>/.worktrees/<branch>/`
- Polling interval configurable: 15s/30s/60s/5m/15m (default 30s)
- Use ETags for conditional requests to minimize rate limit usage
- Agent feedback injected to PTY as formatted stdin
- All UI follows design system: dark theme, lucide icons, monospace for code/paths
- Error handling: auth errors → re-auth screen, rate limit → banner, network → offline mode

---

## File Structure

### Main Process Services (extend existing)

```
src/main/github/
├── github-service.ts          (extend: add rate limit tracking)
├── auth-service.ts            (extend: add OAuth flow)
├── repo-service.ts            (extend: add search, clone)
├── data-service.ts            (extend: add ETags, incremental polling)
├── issue-service.ts           (new: issue CRUD)
├── pr-service.ts              (new: PR CRUD, reviews, CI)
├── rate-limit-tracker.ts      (extend: add getState, isLow, isExhausted)
├── oauth-server.ts            (existing: already implements OAuth callback)
└── polling-manager.ts         (new: polling orchestration)

src/main/worktree/
└── worktree-service.ts        (extend: add getLinkedPR)

src/main/agent/
└── agent-git-bridge.ts        (extend: add feedback polling, injection)

src/main/ipc/
├── github-auth-handlers.ts    (extend: add OAuth start)
├── github-repo-handlers.ts    (extend: add search, clone)
├── github-data-handlers.ts    (existing)
├── github-issues-handlers.ts  (new: issue CRUD handlers)
├── github-prs-handlers.ts     (new: PR CRUD handlers)
└── worktree-handlers.ts       (extend: add getLinkedPR)
```

### Shared Types

```
src/shared/
└── github-types.ts            (extend: add GitHubComment, GitHubReview, PollingState)
```

### Renderer Context & Hooks

```
renderer/src/context/
└── GitHubContext.tsx            (extend: add full state, actions)

renderer/src/hooks/
├── useGitHubAuth.ts             (existing)
├── useRepos.ts                  (existing)
├── useGitHubIssues.ts           (new)
├── useGitHubPRs.ts              (new)
├── useWorktrees.ts              (new)
└── usePolling.ts                (new)
```

### Renderer Pages

```
renderer/src/pages/
├── IssuesPage.tsx               (new: split view list + detail)
├── WorktreesPage.tsx            (new: metrics + cards)
├── PRsPage.tsx                  (new: list with search/filter)
├── PRDetailPage.tsx             (new: summary + feedback panel)
├── NewIssuePage.tsx             (new: title + markdown + sidebar)
└── MultiRepoOverviewPage.tsx    (new: metrics + grouped lists)
```

### Renderer Modals

```
renderer/src/components/github/
├── AgentAssignmentModal.tsx     (new)
├── CreateWorktreeDialog.tsx     (new)
├── PRComposer.tsx               (extend: make it a modal)
├── AddRepositoryDialog.tsx      (new)
└── RateLimitBanner.tsx          (new)
```

---

### Task 1: Extend GitHubService with Rate Limit Tracking

**Files:**
- Modify: `src/main/github/github-service.ts`
- Modify: `src/main/github/rate-limit-tracker.ts`
- Test: `src/main/github/__tests__/rate-limit-tracker.test.ts`

**Interfaces:**
- Consumes: existing `GitHubService`, `RateLimitTracker`
- Produces: `RateLimitTracker.getState()`, `isLow()`, `isExhausted()`

- [ ] **Step 1: Write failing test for RateLimitTracker.getState()**

```typescript
// src/main/github/__tests__/rate-limit-tracker.test.ts
import { RateLimitTracker } from '../rate-limit-tracker';

describe('RateLimitTracker', () => {
  it('returns state with remaining, limit, resetAt', () => {
    const tracker = new RateLimitTracker();
    tracker.updateFromHeaders({
      'x-ratelimit-remaining': '4500',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': '1700000000'
    });

    const state = tracker.getState();
    expect(state.remaining).toBe(4500);
    expect(state.limit).toBe(5000);
    expect(state.resetAt).toBe(1700000000000);
    expect(state.isLow).toBe(false);
    expect(state.isExhausted).toBe(false);
  });

  it('isLow when remaining < 500', () => {
    const tracker = new RateLimitTracker();
    tracker.updateFromHeaders({
      'x-ratelimit-remaining': '400',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': '1700000000'
    });

    expect(tracker.getState().isLow).toBe(true);
  });

  it('isExhausted when remaining === 0', () => {
    const tracker = new RateLimitTracker();
    tracker.updateFromHeaders({
      'x-ratelimit-remaining': '0',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': '1700000000'
    });

    expect(tracker.getState().isExhausted).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/main/github/__tests__/rate-limit-tracker.test.ts
```

Expected: FAIL — `getState` not defined

- [ ] **Step 3: Implement RateLimitTracker.getState()**

```typescript
// src/main/github/rate-limit-tracker.ts
export class RateLimitTracker {
  private remaining: number = 5000;
  private limit: number = 5000;
  private resetAt: number = 0;

  updateFromHeaders(headers: Record<string, string>) {
    this.remaining = parseInt(headers['x-ratelimit-remaining'] || '5000');
    this.limit = parseInt(headers['x-ratelimit-limit'] || '5000');
    this.resetAt = parseInt(headers['x-ratelimit-reset'] || '0') * 1000;
  }

  canMakeRequest(): boolean {
    return this.remaining > 100;
  }

  getWaitTime(): number {
    return Math.max(0, this.resetAt - Date.now());
  }

  getState(): {
    remaining: number;
    limit: number;
    resetAt: number;
    isLow: boolean;
    isExhausted: boolean;
  } {
    return {
      remaining: this.remaining,
      limit: this.limit,
      resetAt: this.resetAt,
      isLow: this.remaining < 500,
      isExhausted: this.remaining === 0
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/main/github/__tests__/rate-limit-tracker.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/github/rate-limit-tracker.ts src/main/github/__tests__/rate-limit-tracker.test.ts
git commit -m "feat: add getState to RateLimitTracker with isLow/isExhausted"
```

---

### Task 2: Create IssueService

**Files:**
- Create: `src/main/github/issue-service.ts`
- Test: `src/main/github/__tests__/issue-service.test.ts`

**Interfaces:**
- Consumes: `GitHubService`, `Repo`
- Produces: `IssueService.createIssue()`, `commentOnIssue()`, `updateIssue()`, etc.

- [ ] **Step 1: Write failing test for IssueService.createIssue()**

```typescript
// src/main/github/__tests__/issue-service.test.ts
import { IssueService } from '../issue-service';
import { GitHubService } from '../github-service';

describe('IssueService', () => {
  let githubService: GitHubService;
  let issueService: IssueService;

  beforeEach(() => {
    githubService = new GitHubService();
    githubService.setToken('test-token');
    issueService = new IssueService(githubService);
  });

  it('creates an issue and returns it', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      data: {
        number: 123,
        title: 'Test issue',
        body: 'Test body',
        state: 'open',
        labels: [],
        user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    });

    githubService.getOctokit = jest.fn().mockReturnValue({
      rest: { issues: { create: mockCreate } }
    }) as any;

    const issue = await issueService.createIssue('owner', 'repo', 'Test issue', 'Test body');

    expect(mockCreate).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      title: 'Test issue',
      body: 'Test body'
    });
    expect(issue.number).toBe(123);
    expect(issue.title).toBe('Test issue');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/main/github/__tests__/issue-service.test.ts
```

Expected: FAIL — `IssueService` not found

- [ ] **Step 3: Implement IssueService**

```typescript
// src/main/github/issue-service.ts
import { GitHubService } from './github-service';
import { GitHubIssue, GitHubComment } from '../../shared/github-types';

export class IssueService {
  constructor(private githubService: GitHubService) {}

  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
    labels?: string[],
    assignees?: string[]
  ): Promise<GitHubIssue> {
    const { data } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.create({
        owner,
        repo,
        title,
        body,
        labels,
        assignees
      })
    );

    return this.mapIssue(data);
  }

  async commentOnIssue(owner: string, repo: string, issueNumber: number, body: string): Promise<GitHubComment> {
    const { data } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body
      })
    );

    return {
      id: data.id,
      author: { login: data.user.login, avatarUrl: data.user.avatar_url },
      body: data.body,
      createdAt: data.created_at,
      type: 'issue'
    };
  }

  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    updates: { title?: string; body?: string; state?: 'open' | 'closed' }
  ): Promise<GitHubIssue> {
    const { data } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        ...updates
      })
    );

    return this.mapIssue(data);
  }

  async addLabels(owner: string, repo: string, issueNumber: number, labels: string[]): Promise<void> {
    await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.addLabels({
        owner,
        repo,
        issue_number: issueNumber,
        labels
      })
    );
  }

  async removeLabel(owner: string, repo: string, issueNumber: number, label: string): Promise<void> {
    await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.removeLabel({
        owner,
        repo,
        issue_number: issueNumber,
        name: label
      })
    );
  }

  async addAssignees(owner: string, repo: string, issueNumber: number, assignees: string[]): Promise<void> {
    await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.addAssignees({
        owner,
        repo,
        issue_number: issueNumber,
        assignees
      })
    );
  }

  async removeAssignees(owner: string, repo: string, issueNumber: number, assignees: string[]): Promise<void> {
    await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.removeAssignees({
        owner,
        repo,
        issue_number: issueNumber,
        assignees
      })
    );
  }

  async closeIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    return this.updateIssue(owner, repo, issueNumber, { state: 'closed' });
  }

  async reopenIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    return this.updateIssue(owner, repo, issueNumber, { state: 'open' });
  }

  private mapIssue(data: any): GitHubIssue {
    return {
      number: data.number,
      title: data.title,
      body: data.body || '',
      state: data.state,
      labels: data.labels.map((l: any) => ({ name: l.name, color: l.color })),
      assignee: data.assignee ? { login: data.assignee.login } : undefined,
      author: { login: data.user.login, avatarUrl: data.user.avatar_url },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      comments: []
    };
  }
}

export const issueService = new IssueService(githubService);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/main/github/__tests__/issue-service.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/github/issue-service.ts src/main/github/__tests__/issue-service.test.ts
git commit -m "feat: add IssueService for issue CRUD operations"
```

---

### Task 3: Create PRService

**Files:**
- Create: `src/main/github/pr-service.ts`
- Test: `src/main/github/__tests__/pr-service.test.ts`

**Interfaces:**
- Consumes: `GitHubService`
- Produces: `PRService.createPR()`, `submitReview()`, `fetchCIStatus()`, `fetchPRComments()`

- [ ] **Step 1: Write failing test for PRService.createPR()**

```typescript
// src/main/github/__tests__/pr-service.test.ts
import { PRService } from '../pr-service';
import { GitHubService } from '../github-service';

describe('PRService', () => {
  let githubService: GitHubService;
  let prService: PRService;

  beforeEach(() => {
    githubService = new GitHubService();
    githubService.setToken('test-token');
    prService = new PRService(githubService);
  });

  it('creates a PR and returns it', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      data: {
        number: 234,
        title: 'Test PR',
        body: 'Test body',
        state: 'open',
        head: { ref: 'feature-branch', sha: 'abc123' },
        base: { ref: 'main' },
        user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        additions: 10,
        deletions: 5,
        commits: 2,
        changed_files: 3
      }
    });

    githubService.getOctokit = jest.fn().mockReturnValue({
      rest: { pulls: { create: mockCreate } }
    }) as any;

    const pr = await prService.createPR('owner', 'repo', 'Test PR', 'Test body', 'feature-branch', 'main');

    expect(mockCreate).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      title: 'Test PR',
      body: 'Test body',
      head: 'feature-branch',
      base: 'main'
    });
    expect(pr.number).toBe(234);
    expect(pr.title).toBe('Test PR');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/main/github/__tests__/pr-service.test.ts
```

Expected: FAIL — `PRService` not found

- [ ] **Step 3: Implement PRService**

```typescript
// src/main/github/pr-service.ts
import { GitHubService } from './github-service';
import { GitHubPR, GitHubComment, GitHubReview } from '../../shared/github-types';

export class PRService {
  constructor(private githubService: GitHubService) {}

  async createPR(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string,
    reviewers?: string[],
    labels?: string[]
  ): Promise<GitHubPR> {
    const { data } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.pulls.create({
        owner,
        repo,
        title,
        body,
        head,
        base
      })
    );

    // Add reviewers if provided
    if (reviewers && reviewers.length > 0) {
      await this.githubService.getOctokit().rest.pulls.requestReviewers({
        owner,
        repo,
        pull_number: data.number,
        reviewers
      });
    }

    // Add labels if provided
    if (labels && labels.length > 0) {
      await this.githubService.getOctokit().rest.issues.addLabels({
        owner,
        repo,
        issue_number: data.number,
        labels
      });
    }

    return this.mapPR(data);
  }

  async submitReview(
    owner: string,
    repo: string,
    prNumber: number,
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
    body: string
  ): Promise<GitHubReview> {
    const { data } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        event,
        body
      })
    );

    return {
      id: data.id,
      author: { login: data.user.login, avatarUrl: data.user.avatar_url },
      body: data.body || '',
      state: data.state.toLowerCase().replace(' ', '_') as any,
      submittedAt: data.submitted_at
    };
  }

  async commentOnPR(owner: string, repo: string, prNumber: number, body: string): Promise<GitHubComment> {
    const { data } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body
      })
    );

    return {
      id: data.id,
      author: { login: data.user.login, avatarUrl: data.user.avatar_url },
      body: data.body,
      createdAt: data.created_at,
      type: 'pr'
    };
  }

  async fetchPRComments(owner: string, repo: string, prNumber: number): Promise<GitHubComment[]> {
    // Fetch issue comments
    const { data: issueComments } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
        per_page: 100
      })
    );

    // Fetch review comments
    const { data: reviewComments } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.pulls.listReviewComments({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100
      })
    );

    const comments: GitHubComment[] = [
      ...issueComments.map(c => ({
        id: c.id,
        author: { login: c.user.login, avatarUrl: c.user.avatar_url },
        body: c.body,
        createdAt: c.created_at,
        type: 'pr' as const
      })),
      ...reviewComments.map(c => ({
        id: c.id,
        author: { login: c.user.login, avatarUrl: c.user.avatar_url },
        body: c.body,
        createdAt: c.created_at,
        path: c.path,
        line: c.line,
        type: 'review' as const
      }))
    ];

    return comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async fetchCIStatus(owner: string, repo: string, ref: string): Promise<'passing' | 'failing' | 'pending' | 'none'> {
    const { data: checkRuns } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.checks.listForRef({
        owner,
        repo,
        ref,
        per_page: 100
      })
    );

    if (checkRuns.total_count === 0) return 'none';

    const hasFailure = checkRuns.check_runs.some(run => run.conclusion === 'failure');
    const hasPending = checkRuns.check_runs.some(run => run.status === 'in_progress' || run.status === 'queued');

    if (hasFailure) return 'failing';
    if (hasPending) return 'pending';
    return 'passing';
  }

  async mergePR(owner: string, repo: string, prNumber: number): Promise<void> {
    await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.pulls.merge({
        owner,
        repo,
        pull_number: prNumber
      })
    );
  }

  async closePR(owner: string, repo: string, prNumber: number): Promise<void> {
    await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.pulls.update({
        owner,
        repo,
        pull_number: prNumber,
        state: 'closed'
      })
    );
  }

  private mapPR(data: any): GitHubPR {
    return {
      number: data.number,
      title: data.title,
      body: data.body || '',
      state: data.state,
      head: { ref: data.head.ref, sha: data.head.sha },
      base: { ref: data.base.ref },
      user: { login: data.user.login, avatarUrl: data.user.avatar_url },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      additions: data.additions || 0,
      deletions: data.deletions || 0,
      commits: data.commits || 0,
      changedFiles: data.changed_files || 0,
      ciStatus: 'none',
      reviews: [],
      comments: []
    };
  }
}

export const prService = new PRService(githubService);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/main/github/__tests__/pr-service.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/github/pr-service.ts src/main/github/__tests__/pr-service.test.ts
git commit -m "feat: add PRService for PR CRUD, reviews, CI status"
```

---

### Task 4: Extend Shared Types

**Files:**
- Modify: `src/shared/github-types.ts`

**Interfaces:**
- Consumes: existing types
- Produces: `GitHubComment`, `GitHubReview`, `PollingState`

- [ ] **Step 1: Add new types to github-types.ts**

```typescript
// src/shared/github-types.ts (append)

export interface GitHubComment {
  id: number;
  author: { login: string; avatarUrl: string };
  body: string;
  createdAt: string;
  path?: string;      // for PR review comments
  line?: number;       // for PR review comments
  type: 'issue' | 'pr' | 'review';
}

export interface GitHubReview {
  id: number;
  author: { login: string; avatarUrl: string };
  body: string;
  state: 'approved' | 'changes_requested' | 'commented' | 'pending';
  submittedAt: string;
}

export interface PollingState {
  isPolling: boolean;
  interval: number;
  lastSync: number;
  remaining: number;
  limit: number;
  resetAt: number;
}
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/github-types.ts
git commit -m "feat: add GitHubComment, GitHubReview, PollingState types"
```

---

### Task 5: Create PollingManager

**Files:**
- Create: `src/main/github/polling-manager.ts`
- Test: `src/main/github/__tests__/polling-manager.test.ts`

**Interfaces:**
- Consumes: `DataService`, `RepoService`, `RateLimitTracker`
- Produces: `PollingManager.start()`, `stop()`, `setInterval()`, `getState()`

- [ ] **Step 1: Write failing test for PollingManager**

```typescript
// src/main/github/__tests__/polling-manager.test.ts
import { PollingManager } from '../polling-manager';

describe('PollingManager', () => {
  it('starts and stops polling', () => {
    const manager = new PollingManager(async () => {}, 30000);
    
    expect(manager.getState().isPolling).toBe(false);
    
    manager.start();
    expect(manager.getState().isPolling).toBe(true);
    
    manager.stop();
    expect(manager.getState().isPolling).toBe(false);
  });

  it('updates interval', () => {
    const manager = new PollingManager(async () => {}, 30000);
    manager.setInterval(60000);
    expect(manager.getState().interval).toBe(60000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/main/github/__tests__/polling-manager.test.ts
```

Expected: FAIL — `PollingManager` not found

- [ ] **Step 3: Implement PollingManager**

```typescript
// src/main/github/polling-manager.ts
import { PollingState } from '../../shared/github-types';
import { rateLimitTracker } from './rate-limit-tracker';

export class PollingManager {
  private interval: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private lastSync: number = 0;
  private pollFn: () => Promise<void>;

  constructor(pollFn: () => Promise<void>, intervalMs: number = 30000) {
    this.pollFn = pollFn;
    this.intervalMs = intervalMs;
  }

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => this.poll(), this.intervalMs);
    this.poll(); // immediate first poll
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  setInterval(ms: number) {
    this.intervalMs = ms;
    if (this.interval) {
      this.stop();
      this.start();
    }
  }

  getState(): PollingState {
    const rateLimitState = rateLimitTracker.getState();
    return {
      isPolling: this.interval !== null,
      interval: this.intervalMs,
      lastSync: this.lastSync,
      remaining: rateLimitState.remaining,
      limit: rateLimitState.limit,
      resetAt: rateLimitState.resetAt
    };
  }

  private async poll() {
    if (!rateLimitTracker.canMakeRequest()) {
      console.warn('Rate limit too low, skipping poll');
      return;
    }

    try {
      await this.pollFn();
      this.lastSync = Date.now();
    } catch (error) {
      console.error('Poll failed:', error);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/main/github/__tests__/polling-manager.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/github/polling-manager.ts src/main/github/__tests__/polling-manager.test.ts
git commit -m "feat: add PollingManager for periodic data refresh"
```

---

### Task 6: Create GitHub Issues IPC Handlers

**Files:**
- Create: `src/main/ipc/github-issues-handlers.ts`
- Modify: `src/main/ipc-handlers.ts` (register new handlers)

**Interfaces:**
- Consumes: `IssueService`
- Produces: IPC channels `github:issues:create`, `github:issues:comment`, `github:issues:update`

- [ ] **Step 1: Create github-issues-handlers.ts**

```typescript
// src/main/ipc/github-issues-handlers.ts
import { ipcMain } from 'electron';
import { issueService } from '../github/issue-service';

export function registerGitHubIssuesHandlers() {
  ipcMain.handle('github:issues:create', async (_event, args: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    labels?: string[];
    assignees?: string[];
  }) => {
    return issueService.createIssue(args.owner, args.repo, args.title, args.body, args.labels, args.assignees);
  });

  ipcMain.handle('github:issues:comment', async (_event, args: {
    owner: string;
    repo: string;
    issueNumber: number;
    body: string;
  }) => {
    return issueService.commentOnIssue(args.owner, args.repo, args.issueNumber, args.body);
  });

  ipcMain.handle('github:issues:update', async (_event, args: {
    owner: string;
    repo: string;
    issueNumber: number;
    updates: { title?: string; body?: string; state?: 'open' | 'closed' };
  }) => {
    return issueService.updateIssue(args.owner, args.repo, args.issueNumber, args.updates);
  });

  ipcMain.handle('github:issues:addLabels', async (_event, args: {
    owner: string;
    repo: string;
    issueNumber: number;
    labels: string[];
  }) => {
    return issueService.addLabels(args.owner, args.repo, args.issueNumber, args.labels);
  });

  ipcMain.handle('github:issues:removeLabel', async (_event, args: {
    owner: string;
    repo: string;
    issueNumber: number;
    label: string;
  }) => {
    return issueService.removeLabel(args.owner, args.repo, args.issueNumber, args.label);
  });

  ipcMain.handle('github:issues:close', async (_event, args: {
    owner: string;
    repo: string;
    issueNumber: number;
  }) => {
    return issueService.closeIssue(args.owner, args.repo, args.issueNumber);
  });

  ipcMain.handle('github:issues:reopen', async (_event, args: {
    owner: string;
    repo: string;
    issueNumber: number;
  }) => {
    return issueService.reopenIssue(args.owner, args.repo, args.issueNumber);
  });
}
```

- [ ] **Step 2: Register handlers in ipc-handlers.ts**

```typescript
// src/main/ipc-handlers.ts (add to imports)
import { registerGitHubIssuesHandlers } from './ipc/github-issues-handlers';

// In registerAllHandlers() function, add:
registerGitHubIssuesHandlers();
```

- [ ] **Step 3: Verify compilation**

```bash
pnpm tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc/github-issues-handlers.ts src/main/ipc-handlers.ts
git commit -m "feat: add IPC handlers for issue CRUD operations"
```

---

### Task 7: Create GitHub PRs IPC Handlers

**Files:**
- Create: `src/main/ipc/github-prs-handlers.ts`
- Modify: `src/main/ipc-handlers.ts` (register new handlers)

**Interfaces:**
- Consumes: `PRService`
- Produces: IPC channels `github:prs:create`, `github:prs:review`, `github:prs:comment`, `github:prs:merge`

- [ ] **Step 1: Create github-prs-handlers.ts**

```typescript
// src/main/ipc/github-prs-handlers.ts
import { ipcMain } from 'electron';
import { prService } from '../github/pr-service';

export function registerGitHubPRsHandlers() {
  ipcMain.handle('github:prs:create', async (_event, args: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    head: string;
    base: string;
    reviewers?: string[];
    labels?: string[];
  }) => {
    return prService.createPR(args.owner, args.repo, args.title, args.body, args.head, args.base, args.reviewers, args.labels);
  });

  ipcMain.handle('github:prs:review', async (_event, args: {
    owner: string;
    repo: string;
    prNumber: number;
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
    body: string;
  }) => {
    return prService.submitReview(args.owner, args.repo, args.prNumber, args.event, args.body);
  });

  ipcMain.handle('github:prs:comment', async (_event, args: {
    owner: string;
    repo: string;
    prNumber: number;
    body: string;
  }) => {
    return prService.commentOnPR(args.owner, args.repo, args.prNumber, args.body);
  });

  ipcMain.handle('github:prs:fetchComments', async (_event, args: {
    owner: string;
    repo: string;
    prNumber: number;
  }) => {
    return prService.fetchPRComments(args.owner, args.repo, args.prNumber);
  });

  ipcMain.handle('github:prs:fetchCI', async (_event, args: {
    owner: string;
    repo: string;
    ref: string;
  }) => {
    return prService.fetchCIStatus(args.owner, args.repo, args.ref);
  });

  ipcMain.handle('github:prs:merge', async (_event, args: {
    owner: string;
    repo: string;
    prNumber: number;
  }) => {
    return prService.mergePR(args.owner, args.repo, args.prNumber);
  });

  ipcMain.handle('github:prs:close', async (_event, args: {
    owner: string;
    repo: string;
    prNumber: number;
  }) => {
    return prService.closePR(args.owner, args.repo, args.prNumber);
  });
}
```

- [ ] **Step 2: Register handlers in ipc-handlers.ts**

```typescript
// src/main/ipc-handlers.ts (add to imports)
import { registerGitHubPRsHandlers } from './ipc/github-prs-handlers';

// In registerAllHandlers() function, add:
registerGitHubPRsHandlers();
```

- [ ] **Step 3: Verify compilation**

```bash
pnpm tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc/github-prs-handlers.ts src/main/ipc-handlers.ts
git commit -m "feat: add IPC handlers for PR CRUD, reviews, CI"
```

---

### Task 8: Extend GitHubContext with Full State

**Files:**
- Modify: `renderer/src/context/GitHubContext.tsx`

**Interfaces:**
- Consumes: IPC channels from Tasks 6-7
- Produces: Full `GitHubContextType` with all actions

- [ ] **Step 1: Extend GitHubContext with new state and actions**

```typescript
// renderer/src/context/GitHubContext.tsx (replace entire file)
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Repo, GitHubIssue, GitHubPR, Worktree, PollingState } from '../../../src/shared/github-types';

interface GitHubUser {
  id: number;
  login: string;
  avatarUrl: string;
}

interface GitHubContextType {
  // Auth
  isAuthenticated: boolean;
  user: GitHubUser | null;
  authMethod: 'oauth' | 'pat' | null;

  // Repos
  repos: Repo[];
  activeRepo: Repo | null;

  // Data
  issues: GitHubIssue[];
  prs: GitHubPR[];
  branches: string[];
  worktrees: Worktree[];

  // Polling
  polling: PollingState;

  // Auth actions
  login: (method: 'oauth' | 'pat', token?: string) => Promise<void>;
  logout: () => Promise<void>;

  // Repo actions
  addRepo: (owner: string, name: string, localPath: string) => Promise<void>;
  removeRepo: (id: number) => Promise<void>;
  setActiveRepo: (id: number | null) => Promise<void>;

  // Data actions
  refresh: () => Promise<void>;
  createIssue: (title: string, body: string, labels?: string[], assignees?: string[]) => Promise<GitHubIssue>;
  commentOnIssue: (issueNumber: number, body: string) => Promise<void>;
  createPR: (title: string, body: string, head: string, base: string) => Promise<GitHubPR>;
  submitReview: (prNumber: number, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body: string) => Promise<void>;
  createWorktree: (branch: string, baseBranch: string, issueNumber?: number) => Promise<Worktree>;
  assignAgent: (worktreeId: string, agentId: string) => Promise<void>;
}

const GitHubContext = createContext<GitHubContextType | null>(null);

export function GitHubProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [authMethod, setAuthMethod] = useState<'oauth' | 'pat' | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [activeRepo, setActiveRepoState] = useState<Repo | null>(null);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [prs, setPrs] = useState<GitHubPR[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [polling, setPolling] = useState<PollingState>({
    isPolling: false,
    interval: 30000,
    lastSync: 0,
    remaining: 5000,
    limit: 5000,
    resetAt: 0
  });

  useEffect(() => {
    loadInitialState();
  }, []);

  useEffect(() => {
    if (activeRepo) {
      loadDataForRepo(activeRepo);
    }
  }, [activeRepo?.id]);

  async function loadInitialState() {
    const authState = await window.api.github.auth.getState();
    setIsAuthenticated(authState.isAuthenticated);
    setUser(authState.user);
    setAuthMethod(authState.method);

    const reposState = await window.api.github.repos.getAll();
    setRepos(reposState.repos);
    setActiveRepoState(reposState.activeRepo);
  }

  async function loadDataForRepo(repo: Repo) {
    const [issuesData, prsData, branchesData, worktreesData] = await Promise.all([
      window.api.github.data.fetchIssues(repo.owner, repo.name),
      window.api.github.data.fetchPRs(repo.owner, repo.name),
      window.api.github.data.fetchBranches(repo.owner, repo.name),
      window.api.worktree.list(repo.localPath)
    ]);

    setIssues(issuesData);
    setPrs(prsData);
    setBranches(branchesData);
    setWorktrees(worktreesData);
  }

  async function login(method: 'oauth' | 'pat', token?: string) {
    if (method === 'oauth') {
      await window.api.github.auth.startOAuth();
    } else {
      await window.api.github.auth.loginWithPAT(token!);
    }
    await loadInitialState();
  }

  async function logout() {
    await window.api.github.auth.logout();
    setIsAuthenticated(false);
    setUser(null);
    setAuthMethod(null);
    setRepos([]);
    setActiveRepoState(null);
    setIssues([]);
    setPrs([]);
    setBranches([]);
    setWorktrees([]);
  }

  async function addRepo(owner: string, name: string, localPath: string) {
    await window.api.github.repos.add(owner, name, localPath);
    await loadInitialState();
  }

  async function removeRepo(id: number) {
    await window.api.github.repos.remove(id);
    await loadInitialState();
  }

  async function setActiveRepo(id: number | null) {
    await window.api.github.repos.setActive(id);
    const repo = repos.find(r => r.id === id) || null;
    setActiveRepoState(repo);
  }

  async function refresh() {
    if (activeRepo) {
      await loadDataForRepo(activeRepo);
    }
  }

  async function createIssue(title: string, body: string, labels?: string[], assignees?: string[]): Promise<GitHubIssue> {
    if (!activeRepo) throw new Error('No active repo');
    const issue = await window.api.github.issues.create(activeRepo.owner, activeRepo.name, title, body, labels, assignees);
    setIssues(prev => [issue, ...prev]);
    return issue;
  }

  async function commentOnIssue(issueNumber: number, body: string) {
    if (!activeRepo) throw new Error('No active repo');
    await window.api.github.issues.comment(activeRepo.owner, activeRepo.name, issueNumber, body);
    await refresh();
  }

  async function createPR(title: string, body: string, head: string, base: string): Promise<GitHubPR> {
    if (!activeRepo) throw new Error('No active repo');
    const pr = await window.api.github.prs.create(activeRepo.owner, activeRepo.name, title, body, head, base);
    setPrs(prev => [pr, ...prev]);
    return pr;
  }

  async function submitReview(prNumber: number, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body: string) {
    if (!activeRepo) throw new Error('No active repo');
    await window.api.github.prs.review(activeRepo.owner, activeRepo.name, prNumber, event, body);
    await refresh();
  }

  async function createWorktree(branch: string, baseBranch: string, issueNumber?: number): Promise<Worktree> {
    if (!activeRepo) throw new Error('No active repo');
    const worktree = await window.api.worktree.create(activeRepo.localPath, branch, baseBranch, issueNumber);
    setWorktrees(prev => [worktree, ...prev]);
    return worktree;
  }

  async function assignAgent(worktreeId: string, agentId: string) {
    await window.api.agentGitHub.assign(worktreeId, agentId);
    await refresh();
  }

  return (
    <GitHubContext.Provider value={{
      isAuthenticated, user, authMethod,
      repos, activeRepo,
      issues, prs, branches, worktrees,
      polling,
      login, logout,
      addRepo, removeRepo, setActiveRepo,
      refresh, createIssue, commentOnIssue, createPR, submitReview,
      createWorktree, assignAgent
    }}>
      {children}
    </GitHubContext.Provider>
  );
}

export function useGitHub() {
  const context = useContext(GitHubContext);
  if (!context) throw new Error('useGitHub must be used within GitHubProvider');
  return context;
}
```

- [ ] **Step 2: Verify compilation**

```bash
pnpm tsc --noEmit
```

Expected: No errors (may need to add IPC type definitions to preload.ts)

- [ ] **Step 3: Commit**

```bash
git add renderer/src/context/GitHubContext.tsx
git commit -m "feat: extend GitHubContext with full state and actions"
```

---

### Task 9: Create IssuesPage

**Files:**
- Create: `renderer/src/pages/IssuesPage.tsx`

**Interfaces:**
- Consumes: `useGitHub()`, design system components
- Produces: Full-page issues view with split list + detail

- [ ] **Step 1: Create IssuesPage.tsx**

```typescript
// renderer/src/pages/IssuesPage.tsx
import { useState } from 'react';
import { useGitHub } from '../context/GitHubContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Plus, RefreshCw, Search } from 'lucide-react';

export function IssuesPage() {
  const { issues, activeRepo, refresh, createIssue } = useGitHub();
  const [selectedIssue, setSelectedIssue] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIssues = issues.filter(issue =>
    issue.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedIssueData = issues.find(i => i.number === selectedIssue);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="h-14 border-b border-[#2a2a2a] px-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">GitHub Issues</h1>
        {activeRepo && (
          <div className="px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-sm">
            {activeRepo.fullName}
          </div>
        )}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={() => {/* TODO: navigate to new issue */}}>
          <Plus className="h-4 w-4 mr-1" />
          New Issue
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Issue List */}
        <div className="w-96 border-r border-[#2a2a2a] flex flex-col">
          <div className="p-3 border-b border-[#2a2a2a]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#1a1a1a] border-[#2a2a2a]"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {filteredIssues.map(issue => (
              <div
                key={issue.number}
                onClick={() => setSelectedIssue(issue.number)}
                className={`p-3 border-b border-[#2a2a2a] cursor-pointer hover:bg-[#1a1a1a] ${
                  selectedIssue === issue.number ? 'bg-[#1a1a1a]' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    issue.state === 'open' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      #{issue.number} {issue.title}
                    </div>
                    <div className="flex items-center gap