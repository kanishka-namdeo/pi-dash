import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    const mockCreate = vi.fn().mockResolvedValue({
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

    githubService.getOctokit = vi.fn().mockReturnValue({
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
