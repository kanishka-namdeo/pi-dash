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
  it('comments on an issue and returns the comment', async () => {
    const mockCreateComment = vi.fn().mockResolvedValue({
      data: {
        id: 1,
        user: { login: 'commenter', avatar_url: 'https://example.com/commenter.png' },
        body: 'Test comment',
        created_at: '2026-01-01T00:00:00Z'
      }
    });

    githubService.getOctokit = vi.fn().mockReturnValue({
      rest: { issues: { createComment: mockCreateComment } }
    } as any);

    const comment = await issueService.commentOnIssue('owner', 'repo', 123, 'Test comment');

    expect(mockCreateComment).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      issue_number: 123,
      body: 'Test comment'
    });
    expect(comment.id).toBe(1);
    expect(comment.author.login).toBe('commenter');
    expect(comment.body).toBe('Test comment');
    expect(comment.type).toBe('issue');
  });

  it('updates an issue and returns it', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      data: {
        number: 123,
        title: 'Updated title',
        body: 'Updated body',
        state: 'closed',
        labels: [],
        user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z'
      }
    });

    githubService.getOctokit = vi.fn().mockReturnValue({
      rest: { issues: { update: mockUpdate } }
    } as any);

    const issue = await issueService.updateIssue('owner', 'repo', 123, { title: 'Updated title', state: 'closed' });

    expect(mockUpdate).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      issue_number: 123,
      title: 'Updated title',
      state: 'closed'
    });
    expect(issue.number).toBe(123);
    expect(issue.title).toBe('Updated title');
    expect(issue.state).toBe('closed');
  });

  it('handles null user from deleted accounts', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      data: {
        number: 123,
        title: 'Issue from deleted account',
        body: 'Test body',
        state: 'open',
        labels: [],
        user: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    });

    githubService.getOctokit = vi.fn().mockReturnValue({
      rest: { issues: { create: mockCreate } }
    } as any);

    const issue = await issueService.createIssue('owner', 'repo', 'Issue from deleted account', 'Test body');

    expect(issue.author.login).toBe('');
    expect(issue.author.avatarUrl).toBe('');
  });

  it('handles string labels', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      data: {
        number: 123,
        title: 'Test issue',
        body: 'Test body',
        state: 'open',
        labels: ['bug', 'enhancement'],
        user: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    });

    githubService.getOctokit = vi.fn().mockReturnValue({
      rest: { issues: { create: mockCreate } }
    } as any);

    const issue = await issueService.createIssue('owner', 'repo', 'Test issue', 'Test body');

    expect(issue.labels).toEqual([
      { name: 'bug', color: '000000' },
      { name: 'enhancement', color: '000000' }
    ]);
  });
});
