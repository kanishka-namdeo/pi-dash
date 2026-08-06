import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorktreeService } from '../worktree-service';

const mocks = vi.hoisted(() => ({
  storeData: { worktrees: [] },
  git: {
    raw: vi.fn(),
    status: vi.fn(),
    log: vi.fn()
  }
}));

vi.mock('electron-store', () => {
  class MockStore {
    get(key: string) {
      return mocks.storeData[key];
    }
    set(key: string, value: unknown) {
      mocks.storeData[key] = value;
    }
  }
  
  return { default: MockStore };
});

vi.mock('simple-git', () => {
  return {
    default: () => mocks.git
  };
});

vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234'
}));

describe('WorktreeService', () => {
  let worktreeService: WorktreeService;

  beforeEach(() => {
    mocks.storeData = { worktrees: [] };
    vi.clearAllMocks();
    worktreeService = new WorktreeService();
  });

  describe('create', () => {
    it('creates a worktree', async () => {
      mocks.git.raw.mockResolvedValue(undefined);

      const worktree = await worktreeService.create({
        repoPath: '/path/to/repo',
        branch: 'fix/123-test',
        baseBranch: 'main',
        destination: '/path/to/worktree'
      });

      expect(worktree.branch).toBe('fix/123-test');
      expect(worktree.baseBranch).toBe('main');
      expect(worktree.path).toBe('/path/to/worktree');
      expect(worktree.status).toBe('active');
      expect(worktree.id).toBe('test-uuid-1234');
      expect(mocks.git.raw).toHaveBeenCalledWith([
        'worktree', 'add', '/path/to/worktree', '-b', 'fix/123-test', 'main'
      ]);
    });

    it('creates a worktree with issue number', async () => {
      mocks.git.raw.mockResolvedValue(undefined);

      const worktree = await worktreeService.create({
        repoPath: '/path/to/repo',
        branch: 'fix/456',
        baseBranch: 'develop',
        destination: '/path/to/worktree2',
        issueNumber: 456
      });

      expect(worktree.issueNumber).toBe(456);
    });

    it('persists worktree to store', async () => {
      mocks.git.raw.mockResolvedValue(undefined);

      await worktreeService.create({
        repoPath: '/path/to/repo',
        branch: 'feature/test',
        baseBranch: 'main',
        destination: '/path/to/worktree3'
      });

      expect(mocks.storeData.worktrees).toHaveLength(1);
      expect(mocks.storeData.worktrees[0].branch).toBe('feature/test');
    });
  });

  describe('list', () => {
    it('lists worktrees for a repo', async () => {
      mocks.storeData.worktrees = [
        {
          id: '1',
          repoId: 0,
          path: '/path/to/repo/worktree1',
          branch: 'branch1',
          baseBranch: 'main',
          status: 'active',
          createdAt: Date.now(),
          uncommittedChanges: false
        },
        {
          id: '2',
          repoId: 0,
          path: '/other/repo/worktree2',
          branch: 'branch2',
          baseBranch: 'main',
          status: 'active',
          createdAt: Date.now(),
          uncommittedChanges: false
        }
      ];

      const worktrees = await worktreeService.list('/path/to/repo');

      expect(worktrees).toHaveLength(1);
      expect(worktrees[0].path).toBe('/path/to/repo/worktree1');
    });

    it('returns empty array when no worktrees match', async () => {
      mocks.storeData.worktrees = [];

      const worktrees = await worktreeService.list('/path/to/repo');

      expect(worktrees).toEqual([]);
    });
  });

  describe('remove', () => {
    it('removes a worktree', async () => {
      mocks.git.raw.mockResolvedValue(undefined);
      mocks.storeData.worktrees = [
        {
          id: '1',
          repoId: 0,
          path: '/path/to/worktree',
          branch: 'feature/test',
          baseBranch: 'main',
          status: 'active',
          createdAt: Date.now(),
          uncommittedChanges: false
        }
      ];

      await worktreeService.remove('/path/to/worktree');

      expect(mocks.storeData.worktrees).toHaveLength(0);
      expect(mocks.git.raw).toHaveBeenCalledWith([
        'worktree', 'remove', '/path/to/worktree'
      ]);
    });

    it('throws error when worktree not found', async () => {
      mocks.storeData.worktrees = [];

      await expect(worktreeService.remove('/nonexistent/path'))
        .rejects.toThrow('Worktree not found');
    });
  });

  describe('getStatus', () => {
    it('returns worktree status', async () => {
      mocks.git.status.mockResolvedValue({
        isClean: () => false,
        ahead: 2,
        behind: 1
      });
      mocks.git.log.mockResolvedValue({
        latest: { hash: 'abc123' }
      });

      const status = await worktreeService.getStatus('/path/to/worktree');

      expect(status.uncommittedChanges).toBe(true);
      expect(status.aheadOfRemote).toBe(2);
      expect(status.behindRemote).toBe(1);
      expect(status.lastCommitHash).toBe('abc123');
    });

    it('returns clean status', async () => {
      mocks.git.status.mockResolvedValue({
        isClean: () => true,
        ahead: 0,
        behind: 0
      });
      mocks.git.log.mockResolvedValue({
        latest: { hash: 'def456' }
      });

      const status = await worktreeService.getStatus('/path/to/worktree');

      expect(status.uncommittedChanges).toBe(false);
      expect(status.aheadOfRemote).toBe(0);
      expect(status.behindRemote).toBe(0);
    });

    it('handles missing commit hash', async () => {
      mocks.git.status.mockResolvedValue({
        isClean: () => true,
        ahead: 0,
        behind: 0
      });
      mocks.git.log.mockResolvedValue({
        latest: null
      });

      const status = await worktreeService.getStatus('/path/to/worktree');

      expect(status.lastCommitHash).toBe('');
    });
  });
});
