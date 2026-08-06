# GitHub Integration Phase 3: Agent Integration and Advanced Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisites:** Phase 1 (`2026-08-06-github-integration-phase1.md`) Tasks 1-6 and Phase 2 (`2026-08-06-github-integration-phase2.md`) Tasks 7-10 must be complete.

**Goal:** Implement bi-directional agent-GitHub communication (PR creation, commenting, feedback), error handling with rate limiting, activity feed integration, and comprehensive testing.

**Architecture:** AgentGitBridge service for agent-GitHub operations, PRComposer and comment UI components, rate limit tracker, activity feed event handlers, comprehensive test coverage.

**Tech Stack:** Electron, React 19, TypeScript, @octokit/rest, simple-git, Tailwind CSS v4, shadcn/ui, lucide-react, Vitest

## Global Constraints

- All GitHub API calls must go through main process (tokens never exposed to renderer)
- Rate limit: 5,000 requests/hour (authenticated), track remaining count
- UI: No emojis, use lucide-react icons; colors: emerald-500 (success), amber-500 (warning), rose-500 (error), blue-500 (info)
- Typography: Geist for UI, Geist Mono for numbers/code
- Shape consistency: cards rounded-lg (8px), buttons rounded-md (6px), badges rounded-full
- Test coverage: GitHubService 90%+, WorktreeService 85%+, Components 70%+, Overall 80%+

---

## Task 11: PR Creation

**Files:**
- Create: `src/main/agent/agent-git-bridge.ts`
- Create: `src/main/agent/__tests__/agent-git-bridge.test.ts`
- Create: `src/main/ipc/agent-github-handlers.ts`
- Create: `renderer/src/components/github/PRComposer.tsx`

**Interfaces:**
- Consumes: `GitHubService` from Phase 1 Task 1, `WorktreeService` from Phase 1 Task 5
- Produces: `AgentGitBridge` with `createPR(worktreePath, title, body)`, `commentOnIssue(issueNumber, body)`, `readPRFeedback(prNumber)`

- [ ] **Step 1: Write failing test for AgentGitBridge**

```typescript
// src/main/agent/__tests__/agent-git-bridge.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentGitBridge } from '../agent-git-bridge';
import { githubService } from '../../github/github-service';
import { worktreeService } from '../../worktree/worktree-service';

describe('AgentGitBridge', () => {
  let bridge: AgentGitBridge;

  beforeEach(() => {
    bridge = new AgentGitBridge(githubService, worktreeService);
  });

  it('creates a PR from worktree', async () => {
    vi.spyOn(githubService.getOctokit().rest.pulls, 'create').mockResolvedValue({
      data: { number: 234, html_url: 'https://github.com/test/pr/234' }
    } as any);

    const result = await bridge.createPR('/path/to/worktree', 'Fix auth', 'Resolves #123');
    expect(result.number).toBe(234);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/agent/__tests__/agent-git-bridge.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement AgentGitBridge**

```typescript
// src/main/agent/agent-git-bridge.ts
import simpleGit from 'simple-git';
import { GitHubService } from '../github/github-service';
import { WorktreeService } from '../worktree/worktree-service';

export class AgentGitBridge {
  private githubService: GitHubService;
  private worktreeService: WorktreeService;

  constructor(githubService: GitHubService, worktreeService: WorktreeService) {
    this.githubService = githubService;
    this.worktreeService = worktreeService;
  }

  async createPR(worktreePath: string, title: string, body: string): Promise<{ number: number; url: string }> {
    const git = simpleGit(worktreePath);
    await git.push('origin', 'HEAD');

    const status = await git.status();
    const branch = status.current;

    // Get repo info from worktree
    const remoteUrl = await git.getConfig('remote.origin.url');
    const match = remoteUrl.value?.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (!match) throw new Error('Could not determine repo from remote URL');

    const [, owner, repo] = match;

    const { data: pr } = await this.githubService.getOctokit().rest.pulls.create({
      owner,
      repo,
      title,
      body,
      head: branch,
      base: 'main'
    });

    return { number: pr.number, url: pr.html_url };
  }

  async commentOnIssue(owner: string, repo: string, issueNumber: number, body: string): Promise<void> {
    await this.githubService.getOctokit().rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body
    });
  }

  async readPRFeedback(owner: string, repo: string, prNumber: number): Promise<Array<{ user: string; body: string }>> {
    const { data: comments } = await this.githubService.getOctokit().rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber
    });

    return comments.map(c => ({
      user: c.user?.login || 'unknown',
      body: c.body || ''
    }));
  }
}

export const agentGitBridge = new AgentGitBridge(githubService, worktreeService);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/agent/__tests__/agent-git-bridge.test.ts`
Expected: PASS

- [ ] **Step 5: Add IPC handlers**

```typescript
// src/main/ipc/agent-github-handlers.ts
import { ipcMain } from 'electron';
import { agentGitBridge } from '../agent/agent-git-bridge';

export function registerAgentGitHubHandlers() {
  ipcMain.handle('agent-github:createPR', async (_event, worktreePath: string, title: string, body: string) => {
    return await agentGitBridge.createPR(worktreePath, title, body);
  });

  ipcMain.handle('agent-github:commentIssue', async (_event, owner: string, repo: string, issueNumber: number, body: string) => {
    await agentGitBridge.commentOnIssue(owner, repo, issueNumber, body);
    return { success: true };
  });

  ipcMain.handle('agent-github:readFeedback', async (_event, owner: string, repo: string, prNumber: number) => {
    return await agentGitBridge.readPRFeedback(owner, repo, prNumber);
  });
}
```

- [ ] **Step 6: Register handlers in main.ts**

```typescript
// src/main.ts (add)
import { registerAgentGitHubHandlers } from './ipc/agent-github-handlers';
registerAgentGitHubHandlers();
```

- [ ] **Step 7: Implement PRComposer component**

```typescript
// renderer/src/components/github/PRComposer.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Label } from '../ui/label';

interface Props {
  open: boolean;
  onClose: () => void;
  worktreePath: string;
}

export function PRComposer({ open, onClose, worktreePath }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function handleCreate() {
    const result = await window.api.invoke('agent-github:createPR', worktreePath, title, body);
    console.log('PR created:', result);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-lg bg-[#1a1a1a] border-[#2a2a2a] max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Pull Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Fix authentication issue"
              className="rounded-md bg-[#0a0a0a] border-[#2a2a2a]"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your changes..."
              rows={8}
              className="rounded-md bg-[#0a0a0a] border-[#2a2a2a] resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-md">Cancel</Button>
            <Button onClick={handleCreate} disabled={!title} className="flex-1 rounded-md">
              Create PR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/main/agent/agent-git-bridge.ts src/main/agent/__tests__/agent-git-bridge.test.ts src/main/ipc/agent-github-handlers.ts src/main.ts renderer/src/components/github/PRComposer.tsx
git commit -m "feat: add PR creation with AgentGitBridge and PRComposer"
```

---

## Task 12: Issue Commenting

**Files:**
- Create: `renderer/src/components/github/IssueCommentForm.tsx`

**Interfaces:**
- Consumes: `agent-github:commentIssue` IPC from Task 11
- Produces: `IssueCommentForm` component

- [ ] **Step 1: Implement IssueCommentForm**

```typescript
// renderer/src/components/github/IssueCommentForm.tsx
import { useState } from 'react';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { MessageCircle } from 'lucide-react';

interface Props {
  owner: string;
  repo: string;
  issueNumber: number;
  onCommentAdded?: () => void;
}

export function IssueCommentForm({ owner, repo, issueNumber, onCommentAdded }: Props) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await window.api.invoke('agent-github:commentIssue', owner, repo, issueNumber, body);
      setBody('');
      onCommentAdded?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment..."
        rows={4}
        className="rounded-md bg-[#0a0a0a] border-[#2a2a2a] resize-none"
      />
      <Button
        onClick={handleSubmit}
        disabled={!body || submitting}
        className="rounded-md"
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        {submitting ? 'Posting...' : 'Post Comment'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/github/IssueCommentForm.tsx
git commit -m "feat: add IssueCommentForm component"
```

---

## Task 13: PR Feedback

**Files:**
- Create: `renderer/src/components/github/PRFeedbackPanel.tsx`

**Interfaces:**
- Consumes: `agent-github:readFeedback` IPC from Task 11
- Produces: `PRFeedbackPanel` component

- [ ] **Step 1: Implement PRFeedbackPanel**

```typescript
// renderer/src/components/github/PRFeedbackPanel.tsx
import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface Comment {
  user: string;
  body: string;
}

interface Props {
  owner: string;
  repo: string;
  prNumber: number;
}

export function PRFeedbackPanel({ owner, repo, prNumber }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeedback();
  }, [prNumber]);

  async function loadFeedback() {
    setLoading(true);
    const data = await window.api.invoke('agent-github:readFeedback', owner, repo, prNumber);
    setComments(data);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Loading feedback...</div>;
  }

  if (comments.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">No feedback yet</div>;
  }

  return (
    <div className="space-y-3 p-3">
      <div className="text-sm font-semibold">PR Feedback</div>
      {comments.map((comment, i) => (
        <div key={i} className="rounded-md bg-[#0a0a0a] p-3 border border-[#2a2a2a]">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{comment.user}</span>
          </div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.body}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/github/PRFeedbackPanel.tsx
git commit -m "feat: add PRFeedbackPanel component"
```

---

## Task 14: Error Handling & Rate Limiting

**Files:**
- Create: `src/main/github/rate-limit-tracker.ts`
- Modify: `src/main/github/github-service.ts` (integrate rate limiting)

**Interfaces:**
- Consumes: GitHub API response headers
- Produces: `RateLimitTracker` with `updateFromHeaders(headers)`, `canMakeRequest()`, `getWaitTime()`

- [ ] **Step 1: Implement RateLimitTracker**

```typescript
// src/main/github/rate-limit-tracker.ts
export class RateLimitTracker {
  private remaining: number = 5000;
  private resetAt: number = 0;

  updateFromHeaders(headers: any): void {
    this.remaining = parseInt(headers['x-ratelimit-remaining'] || '5000');
    this.resetAt = parseInt(headers['x-ratelimit-reset'] || '0') * 1000;
  }

  canMakeRequest(): boolean {
    return this.remaining > 10;
  }

  getWaitTime(): number {
    if (this.canMakeRequest()) return 0;
    return Math.max(0, this.resetAt - Date.now());
  }

  getRemaining(): number {
    return this.remaining;
  }
}

export const rateLimitTracker = new RateLimitTracker();
```

- [ ] **Step 2: Integrate rate limiting into GitHubService**

```typescript
// src/main/github/github-service.ts (modify request methods)
import { rateLimitTracker } from './rate-limit-tracker';

// Add to GitHubService class:
async makeRequest<T>(fn: () => Promise<T>): Promise<T> {
  if (!rateLimitTracker.canMakeRequest()) {
    const waitTime = rateLimitTracker.getWaitTime();
    await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
  }

  try {
    const result = await fn();
    // Update rate limit from response headers if available
    return result;
  } catch (error: any) {
    if (error.status === 403 && error.message.includes('rate limit')) {
      const waitTime = rateLimitTracker.getWaitTime();
      await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
      return fn(); // Retry once
    }
    throw error;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/main/github/rate-limit-tracker.ts src/main/github/github-service.ts
git commit -m "feat: add rate limit tracking and backoff"
```

---

## Task 15: Activity Feed Integration

**Files:**
- Create: `renderer/src/hooks/useGitHubActivity.ts`

**Interfaces:**
- Consumes: GitHub data from `useGitHub()` context
- Produces: `useGitHubActivity()` hook that returns GitHub events for activity feed

- [ ] **Step 1: Implement useGitHubActivity hook**

```typescript
// renderer/src/hooks/useGitHubActivity.ts
import { useEffect, useState } from 'react';
import { useGitHub } from '../context/GitHubContext';

export interface GitHubActivityEvent {
  id: string;
  type: 'pr_created' | 'pr_merged' | 'issue_comment' | 'pr_review';
  timestamp: number;
  title: string;
  description: string;
  icon: string;
}

export function useGitHubActivity() {
  const { issues, prs, activeRepo } = useGitHub();
  const [events, setEvents] = useState<GitHubActivityEvent[]>([]);

  useEffect(() => {
    if (!activeRepo) return;

    const newEvents: GitHubActivityEvent[] = [
      ...prs.map(pr => ({
        id: `pr-${pr.number}`,
        type: 'pr_created' as const,
        timestamp: new Date(pr.createdAt).getTime(),
        title: `PR #${pr.number} created`,
        description: `${pr.user.login} opened ${pr.title}`,
        icon: 'git-pull-request'
      })),
      ...issues.map(issue => ({
        id: `issue-${issue.number}`,
        type: 'issue_comment' as const,
        timestamp: new Date(issue.updatedAt).getTime(),
        title: `Issue #${issue.number} updated`,
        description: issue.title,
        icon: 'message-circle'
      }))
    ];

    newEvents.sort((a, b) => b.timestamp - a.timestamp);
    setEvents(newEvents.slice(0, 20)); // Last 20 events
  }, [issues, prs, activeRepo]);

  return { events };
}
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/hooks/useGitHubActivity.ts
git commit -m "feat: add useGitHubActivity hook for activity feed"
```

---

## Task 16: Testing

**Files:**
- Create: `src/main/github/__tests__/rate-limit-tracker.test.ts`
- Create: `renderer/src/components/github/__tests__/PRComposer.test.tsx`
- Create: `renderer/src/components/github/__tests__/GitHubPanel.test.tsx`

**Interfaces:**
- Consumes: All services and components from previous tasks
- Produces: Comprehensive test coverage

- [ ] **Step 1: Write rate limit tracker tests**

```typescript
// src/main/github/__tests__/rate-limit-tracker.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimitTracker } from '../rate-limit-tracker';

describe('RateLimitTracker', () => {
  let tracker: RateLimitTracker;

  beforeEach(() => {
    tracker = new RateLimitTracker();
  });

  it('allows requests when remaining > 10', () => {
    tracker.updateFromHeaders({ 'x-ratelimit-remaining': '100', 'x-ratelimit-reset': '0' });
    expect(tracker.canMakeRequest()).toBe(true);
  });

  it('blocks requests when remaining <= 10', () => {
    tracker.updateFromHeaders({ 'x-ratelimit-remaining': '5', 'x-ratelimit-reset': '0' });
    expect(tracker.canMakeRequest()).toBe(false);
  });

  it('returns wait time when rate limited', () => {
    const futureTime = Math.floor(Date.now() / 1000) + 60;
    tracker.updateFromHeaders({ 'x-ratelimit-remaining': '5', 'x-ratelimit-reset': futureTime.toString() });
    expect(tracker.getWaitTime()).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Write PRComposer tests**

```typescript
// renderer/src/components/github/__tests__/PRComposer.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PRComposer } from '../PRComposer';

describe('PRComposer', () => {
  it('renders dialog when open', () => {
    render(<PRComposer open={true} onClose={() => {}} worktreePath="/path" />);
    expect(screen.getByText('Create Pull Request')).toBeDefined();
  });

  it('disables create button when title is empty', () => {
    render(<PRComposer open={true} onClose={() => {}} worktreePath="/path" />);
    const button = screen.getByText('Create PR');
    expect(button.closest('button')?.disabled).toBe(true);
  });
});
```

- [ ] **Step 3: Write GitHubPanel tests**

```typescript
// renderer/src/components/github/__tests__/GitHubPanel.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GitHubPanel } from '../GitHubPanel';
import { GitHubProvider } from '../../../context/GitHubContext';

describe('GitHubPanel', () => {
  it('shows message when no repo selected', () => {
    render(
      <GitHubProvider>
        <GitHubPanel />
      </GitHubProvider>
    );
    expect(screen.getByText(/No repository selected/i)).toBeDefined();
  });
});
```

- [ ] **Step 4: Run all tests**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 5: Check coverage**

Run: `pnpm test --coverage`
Expected: GitHubService 90%+, WorktreeService 85%+, Components 70%+

- [ ] **Step 6: Commit**

```bash
git add src/main/github/__tests__/rate-limit-tracker.test.ts renderer/src/components/github/__tests__/PRComposer.test.tsx renderer/src/components/github/__tests__/GitHubPanel.test.tsx
git commit -m "test: add comprehensive test coverage for GitHub integration"
```

---

## Phase 3 Complete

This phase implements bi-directional agent-GitHub communication, error handling, activity feed integration, and comprehensive testing. All three phases together deliver the full GitHub integration feature as specified in the design document.

**Summary:**
- **Phase 1:** Authentication + Repository Management + Worktrees + Data Fetching (Tasks 1-6)
- **Phase 2:** GitHub Context + Settings UI + Panel UI + Worktree UI (Tasks 7-10)
- **Phase 3:** PR Creation + Issue Commenting + PR Feedback + Error Handling + Activity Feed + Testing (Tasks 11-16)

All plans saved to `docs/superpowers/plans/`. Ready for execution.
