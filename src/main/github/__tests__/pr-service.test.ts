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
  it('submits a review and returns it', async () => {
    const mockCreateReview = vi.fn().mockResolvedValue({
      data: {
        id: 1,
        user: { login: 'reviewer', avatar_url: 'https://example.com/reviewer.png' },
        body: 'Looks good',
        state: 'APPROVED',
        submitted_at: '2026-01-02T00:00:00Z'
      }
    });

    githubService.getOctokit = vi.fn().mockReturnValue({
      rest: { pulls: { createReview: mockCreateReview } }
    }) as any;

    const review = await prService.submitReview('owner', 'repo', 234, 'APPROVE', 'Looks good');

    expect(mockCreateReview).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      pull_number: 234,
      event: 'APPROVE',
      body: 'Looks good'
    });
    expect(review.id).toBe(1);
    expect(review.author.login).toBe('reviewer');
    expect(review.state).toBe('approved');
    expect(review.submittedAt).toBe('2026-01-02T00:00:00Z');
  });

  it('comments on a PR and returns the comment', async () => {
    const mockCreateComment = vi.fn().mockResolvedValue({
      data: {
        id: 1,
        user: { login: 'commenter', avatar_url: 'https://example.com/commenter.png' },
        body: 'Test comment',
        created_at: '2026-01-03T00:00:00Z'
      }
    });

    githubService.getOctokit = vi.fn().mockReturnValue({
      rest: { issues: { createComment: mockCreateComment } }
    }) as any;

    const comment = await prService.commentOnPR('owner', 'repo', 234, 'Test comment');

    expect(mockCreateComment).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      issue_number: 234,
      body: 'Test comment'
    });
    expect(comment.id).toBe(1);
    expect(comment.author.login).toBe('commenter');
    expect(comment.body).toBe('Test comment');
    expect(comment.type).toBe('pr');
  });

  it('fetches CI status and returns passing', async () => {
    const mockListForRef = vi.fn().mockResolvedValue({
      data: {
        total_count: 2,
        check_runs: [
          { conclusion: 'success', status: 'completed' },
          { conclusion: 'success', status: 'completed' }
        ]
      }
    });

    githubService.getOctokit = vi.fn().mockReturnValue({
      rest: { checks: { listForRef: mockListForRef } }
    }) as any;

    const status = await prService.fetchCIStatus('owner', 'repo', 'abc123');

    expect(status).toBe('passing');
  });

  it('fetches CI status and returns failing', async () => {
    const mockListForRef = vi.fn().mockResolvedValue({
      data: {
        total_count: 2,
        check_runs: [
          { conclusion: 'success', status: 'completed' },
          { conclusion: 'failure', status: 'completed' }
        ]
      }
    });

    githubService.getOctokit = vi.fn().mockReturnValue({
      rest: { checks: { listForRef: mockListForRef } }
    }) as any;

    const status = await prService.fetchCIStatus('owner', 'repo', 'abc123');

    expect(status).toBe('failing');
  });

  it('fetches CI status and returns pending', async () => {
    const mockListForRef = vi.fn().mockResolvedValue({
      data: {
        total_count: 2,
        check_runs: [
          { conclusion: 'success', status: 'completed' },
          { conclusion: null, status: 'in_progress' }
        ]
      }
    });

    githubService.getOctokit = vi.fn().mockReturnValue({
      rest: { checks: { listForRef: mockListForRef } }
    }) as any;

    const status = await prService.fetchCIStatus('owner', 'repo', 'abc123');

    expect(status).toBe('pending');
  });

  it('handles null user from deleted accounts in submitReview', async () => {
    const mockCreateReview = vi.fn().mockResolvedValue({
      data: {
        id: 1,
        user: null,
        body: 'Review from deleted account',
        state: 'COMMENTED',
        submitted_at: '2026-01-02T00:00:00Z'
      }
    });

    githubService.getOctokit = vi.fn().mockReturnValue({
      rest: { pulls: { createReview: mockCreateReview } }
    }) as any;

    const review = await prService.submitReview('owner', 'repo', 234, 'COMMENT', 'Review from deleted account');

    expect(review.author.login).toBe('');
    expect(review.author.avatarUrl).toBe('');
  });

  it('handles null user from deleted accounts in commentOnPR', async () => {
    const mockCreateComment = vi.fn().mockResolvedValue({
      data: {
        id: 1,
        user: null,
        body: 'Comment from deleted account',
        created_at: '2026-01-03T00:00:00Z'
      }
    });

    githubService.getOctokit = vi.fn().mockReturnValue({
      rest: { issues: { createComment: mockCreateComment } }
    }) as any;

    const comment = await prService.commentOnPR('owner', 'repo', 234, 'Comment from deleted account');

    expect(comment.author.login).toBe('');
    expect(comment.author.avatarUrl).toBe('');
  });
});
