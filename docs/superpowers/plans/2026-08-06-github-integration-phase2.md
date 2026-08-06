# GitHub Integration Phase 2: UI and Agent Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisites:** Phase 1 plan (`2026-08-06-github-integration-phase1.md`) Tasks 1-6 must be complete.

**Goal:** Build renderer UI for GitHub integration (context, settings, panel, worktrees) and implement bi-directional agent communication (PR creation, commenting, feedback).

**Architecture:** React context for global GitHub state, hooks for data fetching, shadcn/ui components with design-taste compliance, IPC bridge for agent-GitHub operations.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui, lucide-react, React Context API

## Global Constraints

- All GitHub API calls must go through main process (tokens never exposed to renderer)
- UI: No emojis, use lucide-react icons; colors: emerald-500 (success), amber-500 (warning), rose-500 (error), blue-500 (info)
- Typography: Geist for UI, Geist Mono for numbers/code
- Shape consistency: cards rounded-lg (8px), buttons rounded-md (6px), badges rounded-full
- Test coverage: Components 70%+

---

## Task 7: GitHub Context (Renderer)

**Files:**
- Create: `renderer/src/context/GitHubContext.tsx`
- Create: `renderer/src/context/__tests__/GitHubContext.test.tsx`
- Create: `renderer/src/hooks/useGitHubAuth.ts`
- Create: `renderer/src/hooks/useRepos.ts`
- Modify: `renderer/src/App.tsx`

**Interfaces:**
- Consumes: IPC handlers from Phase 1 Tasks 2-4, 6
- Produces: `GitHubProvider` component, `useGitHub()` hook

- [ ] **Step 1: Write failing test for GitHubContext**

```typescript
// renderer/src/context/__tests__/GitHubContext.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GitHubProvider, useGitHub } from '../GitHubContext';

function TestComponent() {
  const { isAuthenticated } = useGitHub();
  return <div>{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>;
}

describe('GitHubContext', () => {
  it('provides GitHub state to children', () => {
    render(
      <GitHubProvider>
        <TestComponent />
      </GitHubProvider>
    );
    expect(screen.getByText('Not authenticated')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/context/__tests__/GitHubContext.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement GitHubContext**

```typescript
// renderer/src/context/GitHubContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Repo } from '../../../src/shared/github-types';

interface GitHubUser {
  id: number;
  login: string;
  avatarUrl: string;
}

interface GitHubContextType {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  repos: Repo[];
  activeRepo: Repo | null;
  issues: any[];
  prs: any[];
  login: (method: 'oauth' | 'pat', token?: string) => Promise<void>;
  logout: () => Promise<void>;
  addRepo: (owner: string, name: string, localPath: string) => Promise<void>;
  removeRepo: (id: number) => Promise<void>;
  setActiveRepo: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const GitHubContext = createContext<GitHubContextType | null>(null);

export function GitHubProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [activeRepo, setActiveRepoState] = useState<Repo | null>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);

  useEffect(() => {
    loadInitialState();
  }, []);

  useEffect(() => {
    if (activeRepo) {
      loadDataForRepo(activeRepo);
    }
  }, [activeRepo?.id]);

  async function loadInitialState() {
    const userData = await window.api.invoke('github:auth:getUser');
    if (userData) {
      setIsAuthenticated(true);
      setUser(userData);
    }

    const reposData = await window.api.invoke('github:repo:list');
    setRepos(reposData);

    const activeRepoData = await window.api.invoke('github:repo:getActive');
    setActiveRepoState(activeRepoData);
  }

  async function loadDataForRepo(repo: Repo) {
    const [issuesData, prsData] = await Promise.all([
      window.api.invoke('github:data:issues', repo.owner, repo.name),
      window.api.invoke('github:data:prs', repo.owner, repo.name)
    ]);
    setIssues(issuesData);
    setPrs(prsData);
  }

  async function login(method: 'oauth' | 'pat', token?: string) {
    if (method === 'oauth') {
      const result = await window.api.invoke('github:auth:oauth');
      if (result.success) {
        const userData = await window.api.invoke('github:auth:getUser');
        setIsAuthenticated(true);
        setUser(userData);
      }
    } else if (method === 'pat' && token) {
      const result = await window.api.invoke('github:auth:pat', token);
      if (result.success) {
        const userData = await window.api.invoke('github:auth:getUser');
        setIsAuthenticated(true);
        setUser(userData);
      }
    }
  }

  async function logout() {
    await window.api.invoke('github:auth:logout');
    setIsAuthenticated(false);
    setUser(null);
    setRepos([]);
    setActiveRepoState(null);
    setIssues([]);
    setPrs([]);
  }

  async function addRepo(owner: string, name: string, localPath: string) {
    const repo = await window.api.invoke('github:repo:add', owner, name, localPath);
    setRepos(prev => [...prev, repo]);
  }

  async function removeRepo(id: number) {
    await window.api.invoke('github:repo:remove', id);
    setRepos(prev => prev.filter(r => r.id !== id));
    if (activeRepo?.id === id) {
      setActiveRepoState(null);
    }
  }

  async function setActiveRepo(id: number) {
    await window.api.invoke('github:repo:setActive', id);
    const repo = repos.find(r => r.id === id);
    setActiveRepoState(repo || null);
  }

  async function refresh() {
    if (activeRepo) {
      await loadDataForRepo(activeRepo);
    }
  }

  return (
    <GitHubContext.Provider value={{
      isAuthenticated,
      user,
      repos,
      activeRepo,
      issues,
      prs,
      login,
      logout,
      addRepo,
      removeRepo,
      setActiveRepo,
      refresh
    }}>
      {children}
    </GitHubContext.Provider>
  );
}

export function useGitHub() {
  const context = useContext(GitHubContext);
  if (!context) {
    throw new Error('useGitHub must be used within GitHubProvider');
  }
  return context;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/context/__tests__/GitHubContext.test.tsx`
Expected: PASS

- [ ] **Step 5: Create convenience hooks**

```typescript
// renderer/src/hooks/useGitHubAuth.ts
import { useGitHub } from '../context/GitHubContext';

export function useGitHubAuth() {
  const { isAuthenticated, user, login, logout } = useGitHub();
  return { isAuthenticated, user, login, logout };
}

// renderer/src/hooks/useRepos.ts
import { useGitHub } from '../context/GitHubContext';

export function useRepos() {
  const { repos, activeRepo, addRepo, removeRepo, setActiveRepo } = useGitHub();
  return { repos, activeRepo, addRepo, removeRepo, setActiveRepo };
}
```

- [ ] **Step 6: Wrap App with GitHubProvider**

```typescript
// renderer/src/App.tsx (modify existing providers)
import { GitHubProvider } from './context/GitHubContext';

// Wrap existing providers:
<SessionProvider>
  <GitHubProvider>
    <PiPProvider>
      {/* ... existing content ... */}
    </PiPProvider>
  </GitHubProvider>
</SessionProvider>
```

- [ ] **Step 7: Commit**

```bash
git add renderer/src/context/GitHubContext.tsx renderer/src/context/__tests__/GitHubContext.test.tsx renderer/src/hooks/useGitHubAuth.ts renderer/src/hooks/useRepos.ts renderer/src/App.tsx
git commit -m "feat: add GitHubContext for global GitHub state"
```

---

## Task 8: GitHub Settings UI

**Files:**
- Create: `renderer/src/components/github/GitHubSettings.tsx`
- Create: `renderer/src/components/github/__tests__/GitHubSettings.test.tsx`

**Interfaces:**
- Consumes: `useGitHubAuth()`, `useRepos()` from Task 7
- Produces: `GitHubSettings` component

- [ ] **Step 1: Write failing test**

```typescript
// renderer/src/components/github/__tests__/GitHubSettings.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GitHubSettings } from '../GitHubSettings';
import { GitHubProvider } from '../../../context/GitHubContext';

describe('GitHubSettings', () => {
  it('renders auth options when not authenticated', () => {
    render(
      <GitHubProvider>
        <GitHubSettings />
      </GitHubProvider>
    );
    expect(screen.getByText(/Connect with GitHub/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test renderer/src/components/github/__tests__/GitHubSettings.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement GitHubSettings**

```typescript
// renderer/src/components/github/GitHubSettings.tsx
import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useGitHubAuth } from '../../hooks/useGitHubAuth';
import { useRepos } from '../../hooks/useRepos';
import { Github, LogOut, Plus, Trash2 } from 'lucide-react';

export function GitHubSettings() {
  const { isAuthenticated, user, login, logout } = useGitHubAuth();
  const { repos, addRepo, removeRepo } = useRepos();
  const [patInput, setPatInput] = useState('');
  const [showPatInput, setShowPatInput] = useState(false);

  if (!isAuthenticated) {
    return (
      <Card className="rounded-lg bg-[#1a1a1a] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">GitHub Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => login('oauth')} className="w-full rounded-md">
            <Github className="mr-2 h-4 w-4" />
            Connect with GitHub
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#2a2a2a]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#1a1a1a] px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {!showPatInput ? (
            <Button variant="outline" onClick={() => setShowPatInput(true)} className="w-full rounded-md">
              Use Personal Access Token
            </Button>
          ) : (
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="ghp_..."
                value={patInput}
                onChange={(e) => setPatInput(e.target.value)}
                className="rounded-md bg-[#0a0a0a] border-[#2a2a2a]"
              />
              <Button
                onClick={() => { login('pat', patInput); setShowPatInput(false); setPatInput(''); }}
                className="w-full rounded-md"
                disabled={!patInput}
              >
                Save Token
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg bg-[#1a1a1a] border-[#2a2a2a]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">GitHub Integration</CardTitle>
          <Button variant="ghost" size="sm" onClick={logout} className="rounded-md">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <img src={user?.avatarUrl} alt={user?.login} className="h-10 w-10 rounded-full" />
          <div>
            <div className="font-medium">{user?.login}</div>
            <div className="text-sm text-muted-foreground">Authenticated</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Repositories</div>
            <Button size="sm" className="rounded-md">
              <Plus className="mr-2 h-4 w-4" />
              Add Repo
            </Button>
          </div>

          {repos.length === 0 ? (
            <div className="text-sm text-muted-foreground">No repositories configured</div>
          ) : (
            <div className="space-y-2">
              {repos.map(repo => (
                <div key={repo.id} className="flex items-center justify-between rounded-md bg-[#0a0a0a] p-3">
                  <div>
                    <div className="font-medium text-sm">{repo.fullName}</div>
                    <div className="text-xs text-muted-foreground">{repo.localPath}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeRepo(repo.id)} className="rounded-md">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test renderer/src/components/github/__tests__/GitHubSettings.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/github/GitHubSettings.tsx renderer/src/components/github/__tests__/GitHubSettings.test.tsx
git commit -m "feat: add GitHubSettings component with OAuth and PAT auth"
```

---


## Task 9: GitHub Panel UI

**Files:**
- Create: `renderer/src/components/github/GitHubPanel.tsx`
- Create: `renderer/src/components/github/IssuesTab.tsx`
- Create: `renderer/src/components/github/PRsTab.tsx`
- Create: `renderer/src/components/github/BranchesTab.tsx`

**Interfaces:**
- Consumes: `useGitHub()` from Task 7
- Produces: `GitHubPanel` component with tabs

- [ ] **Step 1: Implement GitHubPanel with tabs**

```typescript
// renderer/src/components/github/GitHubPanel.tsx
import { useState } from 'react';
import { useGitHub } from '../../context/GitHubContext';
import { IssuesTab } from './IssuesTab';
import { PRsTab } from './PRsTab';
import { BranchesTab } from './BranchesTab';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

export function GitHubPanel() {
  const { activeRepo, refresh } = useGitHub();
  const [activeTab, setActiveTab] = useState<'issues' | 'prs' | 'branches'>('issues');

  if (!activeRepo) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No repository selected. Add a repository in Settings.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-[#2a2a2a]">
        <div className="text-sm font-semibold">GITHUB</div>
        <Button variant="ghost" size="sm" onClick={refresh} className="rounded-md">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex border-b border-[#2a2a2a]">
        {(['issues', 'prs', 'branches'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-sm capitalize transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-emerald-500'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            {tab === 'prs' ? 'PRs' : tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'issues' && <IssuesTab />}
        {activeTab === 'prs' && <PRsTab />}
        {activeTab === 'branches' && <BranchesTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement IssuesTab**

```typescript
// renderer/src/components/github/IssuesTab.tsx
import { useGitHub } from '../../context/GitHubContext';
import { Circle } from 'lucide-react';
import { Button } from '../ui/button';

export function IssuesTab() {
  const { issues } = useGitHub();

  if (issues.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-sm text-muted-foreground">No open issues</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#2a2a2a]">
      {issues.map(issue => (
        <div key={issue.number} className="p-3 hover:bg-[#0a0a0a] transition-colors">
          <div className="flex items-start gap-2">
            <Circle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                #{issue.number} {issue.title}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {issue.labels.map(label => (
                  <span
                    key={label.name}
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: `#${label.color}20`, color: `#${label.color}` }}
                  >
                    {label.name}
                  </span>
                ))}
                {issue.assignee && (
                  <span className="text-xs text-muted-foreground">
                    assigned to {issue.assignee.login}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="mt-2 rounded-md w-full">
            Create Worktree
          </Button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Implement PRsTab**

```typescript
// renderer/src/components/github/PRsTab.tsx
import { useGitHub } from '../../context/GitHubContext';
import { CheckCircle2 } from 'lucide-react';

export function PRsTab() {
  const { prs } = useGitHub();

  if (prs.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-sm text-muted-foreground">No open pull requests</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#2a2a2a]">
      {prs.map(pr => (
        <div key={pr.number} className="p-3 hover:bg-[#0a0a0a] transition-colors">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                #{pr.number} {pr.title}
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-1">
                {pr.head.ref} → {pr.base.ref}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="text-muted-foreground">{pr.user.login}</span>
                <span className="text-emerald-500">+{pr.additions}</span>
                <span className="text-rose-500">-{pr.deletions}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement BranchesTab (worktrees)**

```typescript
// renderer/src/components/github/BranchesTab.tsx
import { useEffect, useState } from 'react';
import { GitBranch, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Worktree } from '../../../../src/shared/github-types';

export function BranchesTab() {
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);

  useEffect(() => {
    loadWorktrees();
  }, []);

  async function loadWorktrees() {
    const data = await window.api.invoke('worktree:list', '/path/to/repo');
    setWorktrees(data);
  }

  if (worktrees.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-sm text-muted-foreground">No active worktrees</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#2a2a2a]">
      {worktrees.map(wt => (
        <div key={wt.id} className="p-3 hover:bg-[#0a0a0a] transition-colors">
          <div className="flex items-start gap-2">
            <GitBranch className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium font-mono truncate">{wt.branch}</div>
              {wt.issueNumber && (
                <div className="text-xs text-muted-foreground mt-1">
                  Issue #{wt.issueNumber}
                </div>
              )}
              {wt.agentId && (
                <div className="text-xs text-muted-foreground">
                  Agent: {wt.agentId}
                </div>
              )}
              {wt.uncommittedChanges && (
                <div className="flex items-center gap-1 mt-1 text-xs text-amber-500">
                  <AlertCircle className="h-3 w-3" />
                  Uncommitted changes
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" className="flex-1 rounded-md">Open</Button>
            <Button size="sm" variant="outline" className="flex-1 rounded-md">PR</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/github/GitHubPanel.tsx renderer/src/components/github/IssuesTab.tsx renderer/src/components/github/PRsTab.tsx renderer/src/components/github/BranchesTab.tsx
git commit -m "feat: add GitHubPanel with Issues, PRs, and Branches tabs"
```

---

## Task 10: Worktree Creation UI

**Files:**
- Create: `renderer/src/components/github/CreateWorktreeDialog.tsx`

**Interfaces:**
- Consumes: WorktreeService IPC from Phase 1 Task 5
- Produces: `CreateWorktreeDialog` component

- [ ] **Step 1: Implement CreateWorktreeDialog**

```typescript
// renderer/src/components/github/CreateWorktreeDialog.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';

interface Props {
  open: boolean;
  onClose: () => void;
  issueNumber?: number;
  repoPath: string;
}

export function CreateWorktreeDialog({ open, onClose, issueNumber, repoPath }: Props) {
  const [branch, setBranch] = useState(issueNumber ? `fix/${issueNumber}-` : '');
  const [baseBranch, setBaseBranch] = useState('main');
  const [destination, setDestination] = useState('');

  async function handleCreate() {
    await window.api.invoke('worktree:create', {
      repoPath,
      branch,
      baseBranch,
      destination,
      issueNumber
    });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-lg bg-[#1a1a1a] border-[#2a2a2a]">
        <DialogHeader>
          <DialogTitle>Create Worktree{issueNumber && ` for Issue #${issueNumber}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Branch name</Label>
            <Input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="fix/123-feature"
              className="rounded-md bg-[#0a0a0a] border-[#2a2a2a]"
            />
          </div>
          <div className="space-y-2">
            <Label>Base branch</Label>
            <Input
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              className="rounded-md bg-[#0a0a0a] border-[#2a2a2a]"
            />
          </div>
          <div className="space-y-2">
            <Label>Destination path</Label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="/path/to/worktree"
              className="rounded-md bg-[#0a0a0a] border-[#2a2a2a]"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-md">Cancel</Button>
            <Button onClick={handleCreate} disabled={!branch || !destination} className="flex-1 rounded-md">
              Create Worktree
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add renderer/src/components/github/CreateWorktreeDialog.tsx
git commit -m "feat: add CreateWorktreeDialog component"
```

---

## Phase 2 Complete

This plan covers the renderer UI foundation: GitHub Context, Settings, Panel with tabs (Issues/PRs/Branches), and Worktree Creation. All tasks are independently testable.

**Continue to Phase 3:** `2026-08-06-github-integration-phase3.md` — PR Creation, Issue Commenting, PR Feedback, Error Handling, Activity Feed Integration, and Testing.
