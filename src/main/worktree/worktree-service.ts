import simpleGit from 'simple-git';
import Store from 'electron-store';
import { Worktree } from '../../shared/github-types';
import { v4 as uuidv4 } from 'uuid';

interface WorktreeStoreSchema {
  worktrees: Worktree[];
}

// Type for store with get/set methods (electron-store extends Conf which provides these)
interface StoreWithMethods<T> {
  get<K extends string>(key: K): any;
  set<K extends string>(key: K, value: any): void;
}

const store: StoreWithMethods<WorktreeStoreSchema> = new Store<WorktreeStoreSchema>({
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
    const worktrees = store.get('worktrees');
    const worktree = worktrees.find(w => w.path === worktreePath);
    if (!worktree) throw new Error('Worktree not found');

    const git = simpleGit(worktreePath);
    await git.raw(['worktree', 'remove', worktreePath]);

    const updatedWorktrees = worktrees.filter(w => w.path !== worktreePath);
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
}

export const worktreeService = new WorktreeService();
