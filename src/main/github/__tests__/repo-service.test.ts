import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RepoService } from '../repo-service';
import { GitHubService } from '../github-service';
import type { Octokit } from '@octokit/rest';

const mocks = vi.hoisted(() => ({
  storeData: { repoConfig: { repos: [], activeRepoId: null } }
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

function createMockOctokit(repoData: {
  id: number;
  owner: { login: string };
  name: string;
  full_name: string;
  default_branch: string;
  private: boolean;
}): Octokit {
  return {
    rest: {
      repos: {
        get: vi.fn().mockResolvedValue({ data: repoData })
      }
    }
  } as unknown as Octokit;
}

describe('RepoService', () => {
  let repoService: RepoService;
  let mockGitHubService: GitHubService;

  beforeEach(() => {
    mocks.storeData = { repoConfig: { repos: [], activeRepoId: null } };
    mockGitHubService = new GitHubService();
    repoService = new RepoService(mockGitHubService);
  });

  const orcaData = {
    id: 12345,
    owner: { login: 'stablyai' },
    name: 'orca',
    full_name: 'stablyai/orca',
    default_branch: 'main',
    private: false
  };

  const piDashData = {
    id: 67890,
    owner: { login: 'stablyai' },
    name: 'pi-dash',
    full_name: 'stablyai/pi-dash',
    default_branch: 'main',
    private: true
  };

  describe('addRepo', () => {
    it('adds a repository successfully', async () => {
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit(orcaData));

      const repo = await repoService.addRepo('stablyai', 'orca', '/path/to/orca');
      
      expect(repo.id).toBe(12345);
      expect(repo.owner).toBe('stablyai');
      expect(repo.name).toBe('orca');
      expect(repo.fullName).toBe('stablyai/orca');
      expect(repo.localPath).toBe('/path/to/orca');
      expect(repo.defaultBranch).toBe('main');
      expect(repo.isPrivate).toBe(false);
      expect(repo.lastSyncedAt).toBeDefined();
    });

    it('adds repo to the list', async () => {
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit(orcaData));

      const repo = await repoService.addRepo('stablyai', 'orca', '/path/to/orca');
      const repos = repoService.listRepos();
      
      expect(repos).toContain(repo);
      expect(repos.length).toBe(1);
    });
  });

  describe('listRepos', () => {
    it('returns empty array initially', () => {
      const repos = repoService.listRepos();
      expect(repos).toEqual([]);
    });

    it('returns all added repos', async () => {
      vi.spyOn(mockGitHubService, 'getOctokit')
        .mockReturnValueOnce(createMockOctokit(orcaData))
        .mockReturnValueOnce(createMockOctokit(piDashData));

      await repoService.addRepo('stablyai', 'orca', '/path/to/orca');
      await repoService.addRepo('stablyai', 'pi-dash', '/path/to/pi-dash');
      
      const repos = repoService.listRepos();
      expect(repos.length).toBe(2);
    });
  });

  describe('removeRepo', () => {
    it('removes a repository by id', async () => {
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit(orcaData));

      const repo = await repoService.addRepo('stablyai', 'orca', '/path/to/orca');
      repoService.removeRepo(repo.id);
      
      const repos = repoService.listRepos();
      expect(repos.length).toBe(0);
    });

    it('clears activeRepoId if removed repo was active', async () => {
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit(orcaData));

      const repo = await repoService.addRepo('stablyai', 'orca', '/path/to/orca');
      repoService.setActiveRepo(repo.id);
      expect(repoService.getActiveRepo()?.id).toBe(repo.id);
      
      repoService.removeRepo(repo.id);
      expect(repoService.getActiveRepo()).toBeNull();
    });
  });

  describe('setActiveRepo', () => {
    it('sets the active repository', async () => {
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit(orcaData));

      const repo = await repoService.addRepo('stablyai', 'orca', '/path/to/orca');
      repoService.setActiveRepo(repo.id);
      
      expect(repoService.getActiveRepo()?.id).toBe(repo.id);
    });
  });

  describe('getActiveRepo', () => {
    it('returns null when no active repo', () => {
      expect(repoService.getActiveRepo()).toBeNull();
    });

    it('returns the active repo', async () => {
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit(orcaData));

      const repo = await repoService.addRepo('stablyai', 'orca', '/path/to/orca');
      repoService.setActiveRepo(repo.id);
      
      const activeRepo = repoService.getActiveRepo();
      expect(activeRepo).toBeDefined();
      expect(activeRepo?.id).toBe(repo.id);
    });
  });
});
