import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IssueService } from '../issue-service';
import { GitHubService } from '../github-service';

describe('IssueService', () => {
  let githubService: GitHubService;
  let issueService: IssueService;

  beforeEach(() => {
    githubService = new GitHubService();
    githubService.setToken('test-token');
    issueService = new IssueService(githubService);
  });

  it('creates an issue and returns it', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      data: {
        number: 123,
        title: 'Test issue',
        body: 'Test body',
        state: 'open',
        labels: [],
        user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    });

    githubService.getOctokit = vi.fn().mockReturnValue({
      rest: { issues: { create: mockCreate } }
    } as any);

    const issue = await issueService.createIssue('owner', 'repo', 'Test issue', 'Test body');

    expect(mockCreate).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      title: 'Test issue',
      body: 'Test body'
    });
    expect(issue.number).toBe(123);
    expect(issue.title).toBe('Test issue');
  });
});
