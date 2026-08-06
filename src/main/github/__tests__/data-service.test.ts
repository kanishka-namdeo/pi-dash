import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataService } from '../data-service';
import { GitHubService } from '../github-service';
import type { Octokit } from '@octokit/rest';

interface MockIssueData {
  number: number;
  title: string;
  state: string;
  labels: Array<string | { name?: string; color?: string }>;
  assignee: { login: string } | null;
  created_at: string;
  updated_at: string;
}

interface MockPRData {
  number: number;
  title: string;
  state: string;
  head: { ref: string };
  base: { ref: string };
  user: { login: string } | null;
  created_at: string;
  additions: number;
  deletions: number;
  commits: number;
}

interface MockBranchData {
  name: string;
}

function createMockOctokit(overrides: {
  issues?: MockIssueData[];
  pulls?: MockPRData[];
  branches?: MockBranchData[];
}): Octokit {
  return {
    rest: {
      issues: {
        listForRepo: vi.fn().mockResolvedValue({ data: overrides.issues || [] })
      },
      pulls: {
        list: vi.fn().mockResolvedValue({ data: overrides.pulls || [] })
      },
      repos: {
        listBranches: vi.fn().mockResolvedValue({ data: overrides.branches || [] })
      }
    }
  } as unknown as Octokit;
}

describe('DataService', () => {
  let dataService: DataService;
  let mockGitHubService: GitHubService;

  beforeEach(() => {
    mockGitHubService = new GitHubService();
    dataService = new DataService(mockGitHubService);
  });

  describe('fetchIssues', () => {
    it('fetches and maps issues from GitHub API', async () => {
      const mockIssues: MockIssueData[] = [
        {
          number: 1,
          title: 'Bug fix',
          state: 'open',
          labels: [{ name: 'bug', color: 'd73a4a' }],
          assignee: { login: 'dev1' },
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z'
        }
      ];
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit({ issues: mockIssues }));

      const issues = await dataService.fetchIssues('owner', 'repo');

      expect(issues).toHaveLength(1);
      expect(issues[0]).toEqual({
        number: 1,
        title: 'Bug fix',
        state: 'open',
        labels: [{ name: 'bug', color: 'd73a4a' }],
        assignee: { login: 'dev1' },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z'
      });
    });

    it('handles issues without assignee', async () => {
      const mockIssues: MockIssueData[] = [
        {
          number: 2,
          title: 'Feature',
          state: 'open',
          labels: [],
          assignee: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z'
        }
      ];
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit({ issues: mockIssues }));

      const issues = await dataService.fetchIssues('owner', 'repo');
      expect(issues[0].assignee).toBeUndefined();
    });

    it('handles string labels', async () => {
      const mockIssues: MockIssueData[] = [
        {
          number: 3,
          title: 'Test',
          state: 'open',
          labels: ['enhancement'],
          assignee: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z'
        }
      ];
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit({ issues: mockIssues }));

      const issues = await dataService.fetchIssues('owner', 'repo');
      expect(issues[0].labels).toEqual([{ name: 'enhancement', color: '000000' }]);
    });

    it('returns cached issues within TTL', async () => {
      const mockIssues: MockIssueData[] = [{ number: 1, title: 'Cached', state: 'open', labels: [], assignee: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }];
      const octokit = createMockOctokit({ issues: mockIssues });
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(octokit);

      await dataService.fetchIssues('owner', 'repo');
      await dataService.fetchIssues('owner', 'repo');

      expect(octokit.rest.issues.listForRepo).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchPRs', () => {
    it('fetches and maps PRs from GitHub API', async () => {
      const mockPRs: MockPRData[] = [
        {
          number: 10,
          title: 'Add feature',
          state: 'open',
          head: { ref: 'feature-branch' },
          base: { ref: 'main' },
          user: { login: 'dev2' },
          created_at: '2026-01-01T00:00:00Z',
          additions: 50,
          deletions: 10,
          commits: 3
        }
      ];
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit({ pulls: mockPRs }));

      const prs = await dataService.fetchPRs('owner', 'repo');

      expect(prs).toHaveLength(1);
      expect(prs[0]).toEqual({
        number: 10,
        title: 'Add feature',
        state: 'open',
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
        user: { login: 'dev2' },
        createdAt: '2026-01-01T00:00:00Z',
        additions: 50,
        deletions: 10,
        commits: 3
      });
    });

    it('handles PR without user', async () => {
      const mockPRs: MockPRData[] = [
        {
          number: 11,
          title: 'No user PR',
          state: 'open',
          head: { ref: 'fix' },
          base: { ref: 'main' },
          user: null,
          created_at: '2026-01-01T00:00:00Z',
          additions: 0,
          deletions: 0,
          commits: 1
        }
      ];
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit({ pulls: mockPRs }));

      const prs = await dataService.fetchPRs('owner', 'repo');
      expect(prs[0].user.login).toBe('');
    });

    it('returns cached PRs within TTL', async () => {
      const mockPRs: MockPRData[] = [{ number: 10, title: 'PR', state: 'open', head: { ref: 'a' }, base: { ref: 'b' }, user: { login: 'u' }, created_at: '2026-01-01T00:00:00Z', additions: 0, deletions: 0, commits: 1 }];
      const octokit = createMockOctokit({ pulls: mockPRs });
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(octokit);

      await dataService.fetchPRs('owner', 'repo');
      await dataService.fetchPRs('owner', 'repo');

      expect(octokit.rest.pulls.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchBranches', () => {
    it('fetches branch names from GitHub API', async () => {
      const mockBranches: MockBranchData[] = [
        { name: 'main' },
        { name: 'develop' },
        { name: 'feature/x' }
      ];
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit({ branches: mockBranches }));

      const branches = await dataService.fetchBranches('owner', 'repo');

      expect(branches).toEqual(['main', 'develop', 'feature/x']);
    });

    it('returns cached branches within TTL', async () => {
      const mockBranches: MockBranchData[] = [{ name: 'main' }];
      const octokit = createMockOctokit({ branches: mockBranches });
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(octokit);

      await dataService.fetchBranches('owner', 'repo');
      await dataService.fetchBranches('owner', 'repo');

      expect(octokit.rest.repos.listBranches).toHaveBeenCalledTimes(1);
    });
  });
});
