import simpleGit from 'simple-git';
import Store from 'electron-store';
import { Worktree } from '../../shared/github-types';
import { v4 as uuidv4 } from 'uuid';
import { githubService } from '../github/github-service';

interface WorktreeStoreSchema {
  worktrees: Worktree[];
}

// Wrapper for electron-store to provide typed get/set methods
class TypedStore<T extends Record<string, any>> {
  private store: Store<T>;
  
  constructor(options: ConstructorParameters<typeof Store<T>>[0]) {
    this.store = new Store<T>(options);
  }
  
  get<K extends string>(key: K): any {
    return (this.store as any).get(key);
  }
  
  set<K extends string>(key: K, value: any): void {
    (this.store as any).set(key, value);
  }
}

const store = new TypedStore<WorktreeStoreSchema>({
  projectName: 'pi-dash',
  defaults: {
    worktrees: []
  }
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
      repoId: 0,
      path: params.destination,
      branch: params.branch,
      baseBranch: params.baseBranch,
      issueNumber: params.issueNumber,
      status: 'active',
      createdAt: Date.now(),
      uncommittedChanges: false,
      aheadOfRemote: 0,
      behindRemote: 0
    };

    const worktrees = store.get('worktrees');
    worktrees.push(worktree);
    store.set('worktrees', worktrees);

    return worktree;
  }

  async list(repoPath: string): Promise<Worktree[]> {
    const allWorktrees = store.get('worktrees');
    return allWorktrees.filter((w: Worktree) => w.path.startsWith(repoPath));
  }

  async remove(worktreePath: string): Promise<void> {
    const worktrees = store.get('worktrees');
    const worktree = worktrees.find((w: Worktree) => w.path === worktreePath);
    if (!worktree) throw new Error('Worktree not found');

    const git = simpleGit(worktreePath);
    await git.raw(['worktree', 'remove', worktreePath]);

    const updatedWorktrees = worktrees.filter((w: Worktree) => w.path !== worktreePath);
    store.set('worktrees', updatedWorktrees);
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

  async getLinkedPR(worktreePath: string): Promise<{ number: number; state: 'open' | 'closed' | 'merged' } | null> {
    const git = simpleGit(worktreePath);
    const status = await git.status();
    const branch = status.current;
    if (!branch) return null;

    const remoteUrl = await git.getConfig('remote.origin.url');
    const match = remoteUrl.value?.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (!match) return null;

    const [, owner, repo] = match;

    try {
      const { data: pulls } = await githubService.makeRequest(() =>
        githubService.getOctokit().rest.pulls.list({
          owner,
          repo,
          state: 'all',
          head: `${owner}:${branch}`
        })
      );

      if (pulls.length === 0) return null;

      const pr = pulls[0];
      return {
        number: pr.number,
        state: pr.state as 'open' | 'closed' | 'merged'
      };
    } catch {
      return null;
    }
  }
}

export const worktreeService = new WorktreeService();
