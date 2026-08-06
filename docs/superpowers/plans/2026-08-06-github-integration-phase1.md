# GitHub Integration Phase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**OAuth Configuration:** Before implementing Task 3, register a GitHub OAuth app at https://github.com/settings/developers and add `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET` to `.env` file.

**Goal:** Integrate PiDash with GitHub to enable monitoring of issues/PRs, manual worktree creation, and bi-directional agent communication (PR creation, commenting, reading feedback).

**Architecture:** Full Electron implementation with GitHubService singleton in main process handling all API calls, OAuth/PAT authentication, worktree management via git CLI, and bi-directional agent communication through AgentGitBridge. Renderer uses GitHubContext for global state with repo-scoped data fetching.

**Tech Stack:** Electron, React 19, TypeScript, @octokit/rest, simple-git, electron-store, Express (OAuth callback), lucide-react, Tailwind CSS v4, shadcn/ui

## Global Constraints

- All GitHub API calls must go through main process (tokens never exposed to renderer)
- Use electron-store with encryption for token storage
- Rate limit: 5,000 requests/hour (authenticated), track remaining count
- Cache TTLs: issues/PRs 60s, branches 5min, repo info 1 hour
- UI: No emojis, use lucide-react icons; colors: emerald-500 (success), amber-500 (warning), rose-500 (error), blue-500 (info)
- Typography: Geist for UI, Geist Mono for numbers/code
- Shape consistency: cards rounded-lg (8px), buttons rounded-md (6px), badges rounded-full
- Test coverage: GitHubService 90%+, WorktreeService 85%+, Components 70%+, Overall 80%+

---

## Task 1: GitHub Service Foundation

**Files:**
- Create: `src/main/github/github-service.ts`
- Create: `src/main/github/__tests__/github-service.test.ts`
- Modify: `package.json` (add @octokit/rest)

**Interfaces:**
- Produces: `GitHubService` singleton with `octokit` instance, `setToken(token: string)`, `clearToken()`, `isAuthenticated(): boolean`

- [ ] **Step 1: Install @octokit/rest dependency**

Run: `pnpm add @octokit/rest`

- [ ] **Step 2: Write failing test for GitHubService initialization**

```typescript
// src/main/github/__tests__/github-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubService } from '../github-service';

describe('GitHubService', () => {
  let service: GitHubService;

  beforeEach(() => {
    service = new GitHubService();
  });

  it('initializes without token', () => {
    expect(service.isAuthenticated()).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/main/github/__tests__/github-service.test.ts`
Expected: FAIL with "Cannot find module '../github-service'"

- [ ] **Step 4: Implement GitHubService**

```typescript
// src/main/github/github-service.ts
import { Octokit } from '@octokit/rest';

export class GitHubService {
  private octokit: Octokit;
  private token: string | null = null;

  constructor() {
    this.octokit = new Octokit();
  }

  setToken(token: string): void {
    this.token = token;
    this.octokit = new Octokit({ auth: token });
  }

  clearToken(): void {
    this.token = null;
    this.octokit = new Octokit();
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  getOctokit(): Octokit {
    return this.octokit;
  }
}

export const githubService = new GitHubService();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/main/github/__tests__/github-service.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/main/github/github-service.ts src/main/github/__tests__/github-service.test.ts
git commit -m "feat: add GitHubService foundation with Octokit"
```

---

## Task 2: Authentication - PAT Flow

**Files:**
- Create: `src/main/github/auth-service.ts`
- Create: `src/main/github/__tests__/auth-service.test.ts`
- Create: `src/main/ipc/github-auth-handlers.ts`
- Modify: `src/main.ts` (register IPC handlers)

**Interfaces:**
- Consumes: `GitHubService` from Task 1
- Produces: `AuthService` with `authenticatePAT(token: string): Promise<{ success: boolean; error?: string }>`, `getToken(): string | null`, `clearToken(): void`

- [ ] **Step 1: Write failing test for PAT authentication**

```typescript
// src/main/github/__tests__/auth-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth-service';
import { githubService } from '../github-service';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(githubService);
    githubService.clearToken();
  });

  it('validates valid PAT and stores token', async () => {
    const mockToken = 'ghp_test123';
    // Mock Octokit to return user data
    vi.spyOn(githubService.getOctokit().rest.users, 'getAuthenticated').mockResolvedValue({
      data: { id: 1, login: 'testuser', avatar_url: 'https://example.com/avatar.png' }
    } as any);

    const result = await authService.authenticatePAT(mockToken);
    expect(result.success).toBe(true);
    expect(authService.getToken()).toBe(mockToken);
  });

  it('rejects invalid PAT', async () => {
    vi.spyOn(githubService.getOctokit().rest.users, 'getAuthenticated').mockRejectedValue(new Error('Bad credentials'));

    const result = await authService.authenticatePAT('invalid-token');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid token');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/github/__tests__/auth-service.test.ts`
Expected: FAIL with "Cannot find module '../auth-service'"

- [ ] **Step 3: Implement AuthService**

```typescript
// src/main/github/auth-service.ts
import Store from 'electron-store';
import { GitHubService } from './github-service';

interface GitHubStoreSchema {
  github: {
    authMethod: 'oauth' | 'pat' | null;
    accessToken: string;
    user: { id: number; login: string; avatarUrl: string } | null;
  };
}

const store = new Store<GitHubStoreSchema>({
  encryptionKey: 'pi-dash-github-encryption-key',
  defaults: {
    github: {
      authMethod: null,
      accessToken: '',
      user: null
    }
  }
});

export class AuthService {
  private githubService: GitHubService;

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
    const storedToken = store.get('github.accessToken');
    if (storedToken) {
      this.githubService.setToken(storedToken);
    }
  }

  async authenticatePAT(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.githubService.setToken(token);
      const { data: user } = await this.githubService.getOctokit().rest.users.getAuthenticated();
      
      store.set('github.authMethod', 'pat');
      store.set('github.accessToken', token);
      store.set('github.user', {
        id: user.id,
        login: user.login,
        avatarUrl: user.avatar_url
      });

      return { success: true };
    } catch (error) {
      this.githubService.clearToken();
      return { success: false, error: 'Invalid token. Please check your GitHub PAT.' };
    }
  }

  getToken(): string | null {
    return store.get('github.accessToken') || null;
  }

  clearToken(): void {
    store.set('github.authMethod', null);
    store.set('github.accessToken', '');
    store.set('github.user', null);
    this.githubService.clearToken();
  }

  getUser() {
    return store.get('github.user');
  }
}

export const authService = new AuthService(githubService);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/github/__tests__/auth-service.test.ts`
Expected: PASS

- [ ] **Step 5: Write IPC handlers for PAT authentication**

```typescript
// src/main/ipc/github-auth-handlers.ts
import { ipcMain } from 'electron';
import { authService } from '../github/auth-service';

export function registerGitHubAuthHandlers() {
  ipcMain.handle('github:auth:pat', async (_event, token: string) => {
    return await authService.authenticatePAT(token);
  });

  ipcMain.handle('github:auth:getUser', async () => {
    return authService.getUser();
  });

  ipcMain.handle('github:auth:logout', async () => {
    authService.clearToken();
    return { success: true };
  });
}
```

- [ ] **Step 6: Register IPC handlers in main.ts**

```typescript
// src/main.ts (add near other IPC handler registrations)
import { registerGitHubAuthHandlers } from './ipc/github-auth-handlers';

// In app.whenReady() or initialization:
registerGitHubAuthHandlers();
```

- [ ] **Step 7: Commit**

```bash
git add src/main/github/auth-service.ts src/main/github/__tests__/auth-service.test.ts src/main/ipc/github-auth-handlers.ts src/main.ts
git commit -m "feat: add PAT authentication flow with electron-store"
```

---

## Task 3: Authentication - OAuth Flow

**Files:**
- Create: `src/main/github/oauth-server.ts`
- Create: `src/main/github/__tests__/oauth-server.test.ts`
- Modify: `src/main/github/auth-service.ts` (add OAuth methods)
- Modify: `src/main/ipc/github-auth-handlers.ts` (add OAuth handlers)

**Interfaces:**
- Consumes: `AuthService` from Task 2
- Produces: `startOAuthFlow(): Promise<{ code: string }>`, `exchangeCodeForToken(code: string): Promise<string>`

- [ ] **Step 1: Write failing test for OAuth server**

```typescript
// src/main/github/__tests__/oauth-server.test.ts
import { describe, it, expect } from 'vitest';
import { OAuthServer } from '../oauth-server';

describe('OAuthServer', () => {
  it('starts server on port 9876', async () => {
    const server = new OAuthServer();
    const result = await server.start();
    expect(result.port).toBe(9876);
    server.stop();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/github/__tests__/oauth-server.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement OAuth server**

```typescript
// src/main/github/oauth-server.ts
import express from 'express';
import { Server } from 'http';

export class OAuthServer {
  private server: Server | null = null;
  private code: string | null = null;

  async start(): Promise<{ port: number }> {
    return new Promise((resolve) => {
      const app = express();
      
      app.get('/callback', (req, res) => {
        this.code = req.query.code as string;
        res.send('Authorization successful! You can close this window.');
        setTimeout(() => this.stop(), 1000);
      });

      this.server = app.listen(9876, () => {
        resolve({ port: 9876 });
      });
    });
  }

  async waitForCode(): Promise<string> {
    while (!this.code) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.code;
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
```

- [ ] **Step 4: Install express dependency**

Run: `pnpm add express @types/express --save-dev`

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/main/github/__tests__/oauth-server.test.ts`
Expected: PASS

- [ ] **Step 6: Add OAuth methods to AuthService**

```typescript
// src/main/github/auth-service.ts (add methods)
import { BrowserWindow } from 'electron';
import { OAuthServer } from './oauth-server';

// Add to AuthService class:
async authenticateOAuth(): Promise<{ success: boolean; error?: string }> {
  const oauthServer = new OAuthServer();
  await oauthServer.start();

  const authWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: false }
  });

  const clientId = 'YOUR_GITHUB_OAUTH_CLIENT_ID'; // TODO: Add to env
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,write:discussion,read:discussion`;
  
  authWindow.loadURL(authUrl);

  try {
    const code = await oauthServer.waitForCode();
    const token = await this.exchangeCodeForToken(code);
    
    this.githubService.setToken(token);
    const { data: user } = await this.githubService.getOctokit().rest.users.getAuthenticated();
    
    store.set('github.authMethod', 'oauth');
    store.set('github.accessToken', token);
    store.set('github.user', {
      id: user.id,
      login: user.login,
      avatarUrl: user.avatar_url
    });

    authWindow.close();
    return { success: true };
  } catch (error) {
    authWindow.close();
    return { success: false, error: 'OAuth authentication failed' };
  }
}

private async exchangeCodeForToken(code: string): Promise<string> {
  const clientId = 'YOUR_GITHUB_OAUTH_CLIENT_ID';
  const clientSecret = 'YOUR_GITHUB_OAUTH_CLIENT_SECRET'; // TODO: Add to env
  
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
  });
  
  const data = await response.json();
  return data.access_token;
}
```

- [ ] **Step 7: Add OAuth IPC handler**

```typescript
// src/main/ipc/github-auth-handlers.ts (add handler)
ipcMain.handle('github:auth:oauth', async () => {
  return await authService.authenticateOAuth();
});
```

- [ ] **Step 8: Commit**

```bash
git add src/main/github/oauth-server.ts src/main/github/__tests__/oauth-server.test.ts src/main/github/auth-service.ts src/main/ipc/github-auth-handlers.ts package.json pnpm-lock.yaml
git commit -m "feat: add OAuth authentication flow with BrowserWindow"
```

---

## Task 4: Repository Management

**Files:**
- Create: `src/main/github/repo-service.ts`
- Create: `src/main/github/__tests__/repo-service.test.ts`
- Create: `src/main/ipc/github-repo-handlers.ts`
- Create: `src/shared/github-types.ts`

**Interfaces:**
- Consumes: `GitHubService` from Task 1
- Produces: `RepoService` with `listRepos()`, `addRepo(owner, name)`, `removeRepo(id)`, `getActiveRepo()`, `setActiveRepo(id)`

- [ ] **Step 1: Define shared GitHub types**

```typescript
// src/shared/github-types.ts
export interface Repo {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  localPath: string;
  defaultBranch: string;
  isPrivate: boolean;
  lastSyncedAt: number;
}

export interface RepoConfig {
  repos: Repo[];
  activeRepoId: number | null;
}

export interface Worktree {
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
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  assignee?: { login: string };
  createdAt: string;
  updatedAt: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  head: { ref: string };
  base: { ref: string };
  user: { login: string };
  createdAt: string;
  additions: number;
  deletions: number;
  commits: number;
}
```

- [ ] **Step 2: Write failing test for RepoService**

```typescript
// src/main/github/__tests__/repo-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RepoService } from '../repo-service';
import { githubService } from '../github-service';

describe('RepoService', () => {
  let repoService: RepoService;

  beforeEach(() => {
    repoService = new RepoService(githubService);
  });

  it('adds a repository', async () => {
    const repo = await repoService.addRepo('stablyai', 'orca', '/path/to/orca');
    expect(repo.fullName).toBe('stablyai/orca');
    expect(repoService.listRepos()).toContain(repo);
  });

  it('sets active repo', async () => {
    const repo = await repoService.addRepo('stablyai', 'orca', '/path/to/orca');
    repoService.setActiveRepo(repo.id);
    expect(repoService.getActiveRepo()?.id).toBe(repo.id);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/main/github/__tests__/repo-service.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement RepoService**

```typescript
// src/main/github/repo-service.ts
import Store from 'electron-store';
import { GitHubService } from './github-service';
import { Repo, RepoConfig } from '../../shared/github-types';

const store = new Store<{ repoConfig: RepoConfig }>({
  defaults: {
    repoConfig: { repos: [], activeRepoId: null }
  }
});

export class RepoService {
  private githubService: GitHubService;

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
  }

  async addRepo(owner: string, name: string, localPath: string): Promise<Repo> {
    const { data } = await this.githubService.getOctokit().rest.repos.get({ owner, repo: name });
    
    const repo: Repo = {
      id: data.id,
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      localPath,
      defaultBranch: data.default_branch,
      isPrivate: data.private,
      lastSyncedAt: Date.now()
    };

    const config = store.get('repoConfig');
    config.repos.push(repo);
    store.set('repoConfig', config);

    return repo;
  }

  removeRepo(id: number): void {
    const config = store.get('repoConfig');
    config.repos = config.repos.filter(r => r.id !== id);
    if (config.activeRepoId === id) {
      config.activeRepoId = null;
    }
    store.set('repoConfig', config);
  }

  listRepos(): Repo[] {
    return store.get('repoConfig').repos;
  }

  getActiveRepo(): Repo | null {
    const config = store.get('repoConfig');
    if (!config.activeRepoId) return null;
    return config.repos.find(r => r.id === config.activeRepoId) || null;
  }

  setActiveRepo(id: number): void {
    const config = store.get('repoConfig');
    config.activeRepoId = id;
    store.set('repoConfig', config);
  }
}

export const repoService = new RepoService(githubService);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/main/github/__tests__/repo-service.test.ts`
Expected: PASS

- [ ] **Step 6: Add IPC handlers**

```typescript
// src/main/ipc/github-repo-handlers.ts
import { ipcMain } from 'electron';
import { repoService } from '../github/repo-service';

export function registerGitHubRepoHandlers() {
  ipcMain.handle('github:repo:list', async () => {
    return repoService.listRepos();
  });

  ipcMain.handle('github:repo:add', async (_event, owner: string, name: string, localPath: string) => {
    return await repoService.addRepo(owner, name, localPath);
  });

  ipcMain.handle('github:repo:remove', async (_event, id: number) => {
    repoService.removeRepo(id);
    return { success: true };
  });

  ipcMain.handle('github:repo:getActive', async () => {
    return repoService.getActiveRepo();
  });

  ipcMain.handle('github:repo:setActive', async (_event, id: number) => {
    repoService.setActiveRepo(id);
    return { success: true };
  });
}
```

- [ ] **Step 7: Register handlers in main.ts**

```typescript
// src/main.ts (add)
import { registerGitHubRepoHandlers } from './ipc/github-repo-handlers';
registerGitHubRepoHandlers();
```

- [ ] **Step 8: Commit**

```bash
git add src/shared/github-types.ts src/main/github/repo-service.ts src/main/github/__tests__/repo-service.test.ts src/main/ipc/github-repo-handlers.ts src/main.ts
git commit -m "feat: add repository management with multi-repo support"
```

---

## Task 5: Worktree Service

**Files:**
- Create: `src/main/worktree/worktree-service.ts`
- Create: `src/main/worktree/__tests__/worktree-service.test.ts`
- Create: `src/main/ipc/worktree-handlers.ts`

**Interfaces:**
- Consumes: `Repo` type from Task 4
- Produces: `WorktreeService` with `create(params)`, `list(repoPath)`, `remove(worktreePath)`, `getStatus(worktreePath)`

- [ ] **Step 1: Install simple-git dependency**

Run: `pnpm add simple-git`

- [ ] **Step 2: Write failing test for WorktreeService**

```typescript
// src/main/worktree/__tests__/worktree-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorktreeService } from '../worktree-service';

describe('WorktreeService', () => {
  let worktreeService: WorktreeService;

  beforeEach(() => {
    worktreeService = new WorktreeService();
  });

  it('creates a worktree', async () => {
    const worktree = await worktreeService.create({
      repoPath: '/path/to/repo',
      branch: 'fix/123-test',
      baseBranch: 'main',
      destination: '/path/to/worktree'
    });
    expect(worktree.branch).toBe('fix/123-test');
    expect(worktree.baseBranch).toBe('main');
  });

  it('lists worktrees for a repo', async () => {
    const worktrees = await worktreeService.list('/path/to/repo');
    expect(Array.isArray(worktrees)).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/main/worktree/__tests__/worktree-service.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement WorktreeService**

```typescript
// src/main/worktree/worktree-service.ts
import simpleGit from 'simple-git';
import Store from 'electron-store';
import { Worktree } from '../../shared/github-types';
import { v4 as uuidv4 } from 'uuid';

const store = new Store<{ worktrees: Worktree[] }>({
  defaults: { worktrees: [] }
});

export class WorktreeService {
  async create(params: {
    repoPath: string;
    branch: string;
    baseBranch: string;
    destination: string;
    issueNumber?: number;
  }): Promise<Worktree> {
    const git = simpleGit(params.repoPath);
    await git.raw(['worktree', 'add', params.destination, '-b', params.branch, params.baseBranch]);

    const worktree: Worktree = {
      id: uuidv4(),
      repoId: 0, // Will be set by caller
      path: params.destination,
      branch: params.branch,
      baseBranch: params.baseBranch,
      issueNumber: params.issueNumber,
      status: 'active',
      createdAt: Date.now(),
      uncommittedChanges: false
    };

    const worktrees = store.get('worktrees');
    worktrees.push(worktree);
    store.set('worktrees', worktrees);

    return worktree;
  }

  async list(repoPath: string): Promise<Worktree[]> {
    const allWorktrees = store.get('worktrees');
    return allWorktrees.filter(w => w.path.startsWith(repoPath));
  }

  async remove(worktreePath: string): Promise<void> {
    const worktree = store.get('worktrees').find(w => w.path === worktreePath);
    if (!worktree) throw new Error('Worktree not found');

    const git = simpleGit(worktreePath);
    await git.raw(['worktree', 'remove', worktreePath]);

    const worktrees = store.get('worktrees').filter(w => w.path !== worktreePath);
    store.set('worktrees', worktrees);
  }

  async getStatus(worktreePath: string): Promise<{
    uncommittedChanges: boolean;
    aheadOfRemote: number;
    behindRemote: number;
    lastCommitHash: string;
  }> {
    const git = simpleGit(worktreePath);
    const status = await git.status();
    const log = await git.log({ maxCount: 1 });

    return {
      uncommittedChanges: !status.isClean(),
      aheadOfRemote: status.ahead,
      behindRemote: status.behind,
      lastCommitHash: log.latest?.hash || ''
    };
  }
}

export const worktreeService = new WorktreeService();
```

- [ ] **Step 5: Install uuid dependency**

Run: `pnpm add uuid @types/uuid`

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test src/main/worktree/__tests__/worktree-service.test.ts`
Expected: PASS

- [ ] **Step 7: Add IPC handlers**

```typescript
// src/main/ipc/worktree-handlers.ts
import { ipcMain } from 'electron';
import { worktreeService } from '../worktree/worktree-service';

export function registerWorktreeHandlers() {
  ipcMain.handle('worktree:create', async (_event, params) => {
    return await worktreeService.create(params);
  });

  ipcMain.handle('worktree:list', async (_event, repoPath: string) => {
    return await worktreeService.list(repoPath);
  });

  ipcMain.handle('worktree:remove', async (_event, worktreePath: string) => {
    await worktreeService.remove(worktreePath);
    return { success: true };
  });

  ipcMain.handle('worktree:getStatus', async (_event, worktreePath: string) => {
    return await worktreeService.getStatus(worktreePath);
  });
}
```

- [ ] **Step 8: Register handlers in main.ts**

```typescript
// src/main.ts (add)
import { registerWorktreeHandlers } from './ipc/worktree-handlers';
registerWorktreeHandlers();
```

- [ ] **Step 9: Commit**

```bash
git add src/main/worktree/worktree-service.ts src/main/worktree/__tests__/worktree-service.test.ts src/main/ipc/worktree-handlers.ts src/main.ts package.json pnpm-lock.yaml
git commit -m "feat: add worktree service with git CLI integration"
```

---

## Task 6: GitHub Data Fetching

**Files:**
- Create: `src/main/github/data-service.ts`
- Create: `src/main/github/__tests__/data-service.test.ts`
- Create: `src/main/ipc/github-data-handlers.ts`

**Interfaces:**
- Consumes: `GitHubService` from Task 1, `RepoService` from Task 4
- Produces: `DataService` with `fetchIssues(repoId)`, `fetchPRs(repoId)`, `fetchBranches(repoId)`

- [ ] **Step 1: Write failing test for DataService**

```typescript
// src/main/github/__tests__/data-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataService } from '../data-service';
import { githubService } from '../github-service';

describe('DataService', () => {
  let dataService: DataService;

  beforeEach(() => {
    dataService = new DataService(githubService);
  });

  it('fetches issues for a repo', async () => {
    vi.spyOn(githubService.getOctokit().rest.issues, 'listForRepo').mockResolvedValue({
      data: [{ number: 1, title: 'Test issue', state: 'open' }]
    } as any);

    const issues = await dataService.fetchIssues('stablyai', 'orca');
    expect(issues).toHaveLength(1);
    expect(issues[0].number).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/github/__tests__/data-service.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement DataService with caching**

```typescript
// src/main/github/data-service.ts
import { GitHubService } from './github-service';
import { GitHubIssue, GitHubPR } from '../../shared/github-types';

class Cache {
  private store = new Map<string, { data: any; fetchedAt: number; etag?: string }>();

  get(key: string, ttlMs: number) {
    const cached = this.store.get(key);
    if (cached && Date.now() - cached.fetchedAt < ttlMs) {
      return cached.data;
    }
    return null;
  }

  set(key: string, data: any, etag?: string) {
    this.store.set(key, { data, fetchedAt: Date.now(), etag });
  }
}

const cache = new Cache();
const TTL_ISSUES = 60_000;
const TTL_PRS = 60_000;
const TTL_BRANCHES = 5 * 60_000;

export class DataService {
  private githubService: GitHubService;

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
  }

  async fetchIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
    const cacheKey = `issues:${owner}/${repo}`;
    const cached = cache.get(cacheKey, TTL_ISSUES);
    if (cached) return cached;

    const { data } = await this.githubService.getOctokit().rest.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      sort: 'updated'
    });

    const issues: GitHubIssue[] = data.map(issue => ({
      number: issue.number,
      title: issue.title,
      state: issue.state as 'open' | 'closed',
      labels: issue.labels.map(l => typeof l === 'string' ? { name: l, color: '000000' } : { name: l.name || '', color: l.color || '000000' }),
      assignee: issue.assignee ? { login: issue.assignee.login } : undefined,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at
    }));

    cache.set(cacheKey, issues);
    return issues;
  }

  async fetchPRs(owner: string, repo: string): Promise<GitHubPR[]> {
    const cacheKey = `prs:${owner}/${repo}`;
    const cached = cache.get(cacheKey, TTL_PRS);
    if (cached) return cached;

    const { data } = await this.githubService.getOctokit().rest.pulls.list({
      owner,
      repo,
      state: 'open',
      sort: 'updated'
    });

    const prs: GitHubPR[] = data.map(pr => ({
      number: pr.number,
      title: pr.title,
      state: pr.state as 'open' | 'closed' | 'merged',
      head: { ref: pr.head.ref },
      base: { ref: pr.base.ref },
      user: { login: pr.user?.login || '' },
      createdAt: pr.created_at,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      commits: pr.commits || 0
    }));

    cache.set(cacheKey, prs);
    return prs;
  }

  async fetchBranches(owner: string, repo: string): Promise<string[]> {
    const cacheKey = `branches:${owner}/${repo}`;
    const cached = cache.get(cacheKey, TTL_BRANCHES);
    if (cached) return cached;

    const { data } = await this.githubService.getOctokit().rest.repos.listBranches({
      owner,
      repo
    });

    const branches = data.map(b => b.name);
    cache.set(cacheKey, branches);
    return branches;
  }
}

export const dataService = new DataService(githubService);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/main/github/__tests__/data-service.test.ts`
Expected: PASS

- [ ] **Step 5: Add IPC handlers**

```typescript
// src/main/ipc/github-data-handlers.ts
import { ipcMain } from 'electron';
import { dataService } from '../github/data-service';

export function registerGitHubDataHandlers() {
  ipcMain.handle('github:data:issues', async (_event, owner: string, repo: string) => {
    return await dataService.fetchIssues(owner, repo);
  });

  ipcMain.handle('github:data:prs', async (_event, owner: string, repo: string) => {
    return await dataService.fetchPRs(owner, repo);
  });

  ipcMain.handle('github:data:branches', async (_event, owner: string, repo: string) => {
    return await dataService.fetchBranches(owner, repo);
  });
}
```

- [ ] **Step 6: Register handlers in main.ts**

```typescript
// src/main.ts (add)
import { registerGitHubDataHandlers } from './ipc/github-data-handlers';
registerGitHubDataHandlers();
```

- [ ] **Step 7: Commit**

```bash
git add src/main/github/data-service.ts src/main/github/__tests__/data-service.test.ts src/main/ipc/github-data-handlers.ts src/main.ts
git commit -m "feat: add GitHub data fetching with caching"
```

---

## Phase 1 Complete

This plan covers the foundation: Authentication (OAuth + PAT), Repository Management, Worktree Service, and GitHub Data Fetching. All tasks are independently testable.

**Continue to Phase 2:** `2026-08-06-github-integration-phase2.md` — GitHub Context, Settings UI, Panel UI, Worktree UI, PR Creation, Issue Commenting, PR Feedback, Error Handling, Activity Feed, and Testing.

