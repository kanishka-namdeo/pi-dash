import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataService } from '../data-service';
import { GitHubService } from '../github-service';
import type { Octokit } from '@octokit/rest';

interface MockIssueData {
  number: number;
  title: string;
  body?: string;
  state: string;
  labels: Array<string | { name?: string; color?: string }>;
  assignee: { login: string } | null;
  user: { login: string; avatar_url: string } | null;
  created_at: string;
  updated_at: string;
}

interface MockPRData {
  number: number;
  title: string;
  body?: string;
  state: string;
  head: { ref: string; sha: string };
  base: { ref: string };
  user: { login: string; avatar_url: string } | null;
  created_at: string;
  updated_at: string;
  additions: number;
  deletions: number;
  commits: number;
  changed_files: number;
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
        listForRepo: vi.fn(({ headers }: any) => {
          if (headers?.['If-None-Match']) {
            return Promise.resolve({ data: [], headers: {}, status: 304 });
          }
          return Promise.resolve({ data: overrides.issues || [], headers: { etag: '"issues-etag"' }, status: 200 });
        })
      },
      pulls: {
        list: vi.fn(({ headers }: any) => {
          if (headers?.['If-None-Match']) {
            return Promise.resolve({ data: [], headers: {}, status: 304 });
          }
          return Promise.resolve({ data: overrides.pulls || [], headers: { etag: '"prs-etag"' }, status: 200 });
        })
      },
      repos: {
        listBranches: vi.fn(({ headers }: any) => {
          if (headers?.['If-None-Match']) {
            return Promise.resolve({ data: [], headers: {}, status: 304 });
          }
          return Promise.resolve({ data: overrides.branches || [], headers: { etag: '"branches-etag"' }, status: 200 });
        })
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
          body: 'Fix description',
          state: 'open',
          labels: [{ name: 'bug', color: 'd73a4a' }],
          assignee: { login: 'dev1' },
          user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z'
        }
      ];
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit({ issues: mockIssues }));

      const issues = await dataService.fetchIssues('owner', 'repo');

      expect(issues[0]).toEqual({
        number: 1,
        title: 'Bug fix',
        body: 'Fix description',
        state: 'open',
        labels: [{ name: 'bug', color: 'd73a4a' }],
        assignee: { login: 'dev1' },
        author: { login: 'testuser', avatarUrl: 'https://example.com/avatar.png' },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
        comments: []
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
          user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
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
          user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z'
        }
      ];
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit({ issues: mockIssues }));

      const issues = await dataService.fetchIssues('owner', 'repo');
      expect(issues[0].labels).toEqual([{ name: 'enhancement', color: '000000' }]);
    });

    it('returns cached issues within TTL', async () => {
      const mockIssues: MockIssueData[] = [{ number: 1, title: 'Cached', state: 'open', labels: [], assignee: null, user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' }, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }];
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
          body: 'PR body',
          state: 'open',
          head: { ref: 'feature-branch', sha: 'abc123' },
          base: { ref: 'main' },
          user: { login: 'dev2', avatar_url: 'https://example.com/dev2.png' },
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          additions: 50,
          deletions: 10,
          commits: 3,
          changed_files: 5
        }
      ];
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit({ pulls: mockPRs }));

      const prs = await dataService.fetchPRs('owner', 'repo');

      expect(prs).toHaveLength(1);
      expect(prs[0]).toEqual({
        number: 10,
        title: 'Add feature',
        body: 'PR body',
        state: 'open',
        head: { ref: 'feature-branch', sha: 'abc123' },
        base: { ref: 'main' },
        user: { login: 'dev2', avatarUrl: 'https://example.com/dev2.png' },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        additions: 50,
        deletions: 10,
        commits: 3,
        changedFiles: 5,
        ciStatus: 'none',
        reviews: [],
        comments: []
      });
    });

    it('handles PR without user', async () => {
      const mockPRs: MockPRData[] = [
        {
          number: 11,
          title: 'No user PR',
          body: '',
          state: 'open',
          head: { ref: 'fix', sha: 'def456' },
          base: { ref: 'main' },
          user: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          additions: 0,
          deletions: 0,
          commits: 1,
          changed_files: 1
        }
      ];
      vi.spyOn(mockGitHubService, 'getOctokit').mockReturnValue(createMockOctokit({ pulls: mockPRs }));

      const prs = await dataService.fetchPRs('owner', 'repo');
      expect(prs[0].user.login).toBe('');
    });

    it('returns cached PRs within TTL', async () => {
      const mockPRs: MockPRData[] = [{ number: 10, title: 'PR', body: '', state: 'open', head: { ref: 'a', sha: 'sha1' }, base: { ref: 'b' }, user: { login: 'u', avatar_url: '' }, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', additions: 0, deletions: 0, commits: 1, changed_files: 1 }];
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
