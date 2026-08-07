import { GitHubService, githubService } from './github-service';
import { GitHubIssue, GitHubComment } from '../../shared/github-types';

export class IssueService {
  constructor(private githubService: GitHubService) {}

  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
    labels?: string[],
    assignees?: string[]
  ): Promise<GitHubIssue> {
    const { data } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.create({
        owner,
        repo,
        title,
        body,
        labels,
        assignees
      })
    );

    return this.mapIssue(data);
  }

  async commentOnIssue(owner: string, repo: string, issueNumber: number, body: string): Promise<GitHubComment> {
    const { data } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body
      })
    );

    return {
      id: data.id,
      author: { login: data.user.login, avatarUrl: data.user.avatar_url },
      body: data.body,
      createdAt: data.created_at,
      type: 'issue'
    };
  }

  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    updates: { title?: string; body?: string; state?: 'open' | 'closed' }
  ): Promise<GitHubIssue> {
    const { data } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        ...updates
      })
    );

    return this.mapIssue(data);
  }

  async addLabels(owner: string, repo: string, issueNumber: number, labels: string[]): Promise<void> {
    await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.addLabels({
        owner,
        repo,
        issue_number: issueNumber,
        labels
      })
    );
  }

  async removeLabel(owner: string, repo: string, issueNumber: number, label: string): Promise<void> {
    await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.removeLabel({
        owner,
        repo,
        issue_number: issueNumber,
        name: label
      })
    );
  }

  async addAssignees(owner: string, repo: string, issueNumber: number, assignees: string[]): Promise<void> {
    await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.addAssignees({
        owner,
        repo,
        issue_number: issueNumber,
        assignees
      })
    );
  }

  async removeAssignees(owner: string, repo: string, issueNumber: number, assignees: string[]): Promise<void> {
    await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.removeAssignees({
        owner,
        repo,
        issue_number: issueNumber,
        assignees
      })
    );
  }

  async closeIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    return this.updateIssue(owner, repo, issueNumber, { state: 'closed' });
  }

  async reopenIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    return this.updateIssue(owner, repo, issueNumber, { state: 'open' });
  }

  private mapIssue(data: any): GitHubIssue {
    return {
      number: data.number,
      title: data.title,
      body: data.body || '',
      state: data.state,
      labels: data.labels.map((l: any) => ({ name: l.name, color: l.color })),
      assignee: data.assignee ? { login: data.assignee.login } : undefined,
      author: { login: data.user.login, avatarUrl: data.user.avatar_url },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      comments: []
    };
  }
}

export const issueService = new IssueService(githubService);
