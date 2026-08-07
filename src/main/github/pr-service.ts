import { GitHubService, githubService } from './github-service';
import { GitHubPR, GitHubComment, GitHubReview } from '../../shared/github-types';

export class PRService {
  constructor(private githubService: GitHubService) {}

  async createPR(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string,
    reviewers?: string[],
    labels?: string[]
  ): Promise<GitHubPR> {
    const { data } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.pulls.create({
        owner,
        repo,
        title,
        body,
        head,
        base
      })
    );

    // Add reviewers if provided
    if (reviewers && reviewers.length > 0) {
      await this.githubService.getOctokit().rest.pulls.requestReviewers({
        owner,
        repo,
        pull_number: data.number,
        reviewers
      });
    }

    // Add labels if provided
    if (labels && labels.length > 0) {
      await this.githubService.getOctokit().rest.issues.addLabels({
        owner,
        repo,
        issue_number: data.number,
        labels
      });
    }

    return this.mapPR(data);
  }

  async submitReview(
    owner: string,
    repo: string,
    prNumber: number,
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
    body: string
  ): Promise<GitHubReview> {
    const { data } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        event,
        body
      })
    );

    return {
      id: data.id,
      author: { login: data.user?.login ?? '', avatarUrl: data.user?.avatar_url ?? '' },
      body: data.body || '',
      state: data.state.toLowerCase().replace(' ', '_') as GitHubReview['state'],
      submittedAt: data.submitted_at
    };
  }

  async commentOnPR(owner: string, repo: string, prNumber: number, body: string): Promise<GitHubComment> {
    const { data } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body
      })
    );

    return {
      id: data.id,
      author: { login: data.user?.login ?? '', avatarUrl: data.user?.avatar_url ?? '' },
      body: data.body,
      createdAt: data.created_at,
      type: 'pr'
    };
  }

  async fetchPRComments(owner: string, repo: string, prNumber: number): Promise<GitHubComment[]> {
    // Fetch issue comments
    const { data: issueComments } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
        per_page: 100
      })
    );

    // Fetch review comments
    const { data: reviewComments } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.pulls.listReviewComments({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100
      })
    );

    const comments: GitHubComment[] = [
      ...issueComments.map((c: any) => ({
        id: c.id,
        author: { login: c.user?.login ?? '', avatarUrl: c.user?.avatar_url ?? '' },
        body: c.body,
        createdAt: c.created_at,
        type: 'pr' as const
      })),
      ...reviewComments.map((c: any) => ({
        id: c.id,
        author: { login: c.user?.login ?? '', avatarUrl: c.user?.avatar_url ?? '' },
        body: c.body,
        createdAt: c.created_at,
        path: c.path,
        line: c.line,
        type: 'review' as const
      }))
    ];

    return comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async fetchCIStatus(owner: string, repo: string, ref: string): Promise<'passing' | 'failing' | 'pending' | 'none'> {
    const { data: checkRuns } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.checks.listForRef({
        owner,
        repo,
        ref,
        per_page: 100
      })
    );

    if (checkRuns.total_count === 0) return 'none';

    const hasFailure = checkRuns.check_runs.some(run => run.conclusion === 'failure');
    const hasPending = checkRuns.check_runs.some(run => run.status === 'in_progress' || run.status === 'queued');

    if (hasFailure) return 'failing';
    if (hasPending) return 'pending';
    return 'passing';
  }

  async mergePR(owner: string, repo: string, prNumber: number): Promise<void> {
    await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.pulls.merge({
        owner,
        repo,
        pull_number: prNumber
      })
    );
  }

  async closePR(owner: string, repo: string, prNumber: number): Promise<void> {
    await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.pulls.update({
        owner,
        repo,
        pull_number: prNumber,
        state: 'closed'
      })
    );
  }

  private mapPR(data: any): GitHubPR {
    return {
      number: data.number,
      title: data.title,
      body: data.body || '',
      state: data.state,
      head: { ref: data.head.ref, sha: data.head.sha },
      base: { ref: data.base.ref },
      user: { login: data.user?.login ?? '', avatarUrl: data.user?.avatar_url ?? '' },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      additions: data.additions || 0,
      deletions: data.deletions || 0,
      commits: data.commits || 0,
      changedFiles: data.changed_files || 0,
      ciStatus: 'none',
      reviews: [],
      comments: []
    };
  }
}

export const prService = new PRService(githubService);
