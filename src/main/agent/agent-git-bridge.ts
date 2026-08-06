import simpleGit from 'simple-git';
import { GitHubService, githubService } from '../github/github-service';
import { WorktreeService, worktreeService } from '../worktree/worktree-service';

export class AgentGitBridge {
  private githubService: GitHubService;
  private worktreeService: WorktreeService;

  constructor(githubService: GitHubService, worktreeService: WorktreeService) {
    this.githubService = githubService;
    this.worktreeService = worktreeService;
  }

  async createPR(worktreePath: string, title: string, body: string): Promise<{ number: number; url: string }> {
    const git = simpleGit(worktreePath);
    await git.push('origin', 'HEAD');

    const status = await git.status();
    const branch = status.current;

    // Get repo info from worktree
    const remoteUrl = await git.getConfig('remote.origin.url');
    const match = remoteUrl.value?.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (!match) throw new Error('Could not determine repo from remote URL');

    const [, owner, repo] = match;

    const { data: pr } = await this.githubService.getOctokit().rest.pulls.create({
      owner,
      repo,
      title,
      body,
      head: branch,
      base: 'main'
    });

    return { number: pr.number, url: pr.html_url };
  }

  async commentOnIssue(owner: string, repo: string, issueNumber: number, body: string): Promise<void> {
    await this.githubService.getOctokit().rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body
    });
  }

  async readPRFeedback(owner: string, repo: string, prNumber: number): Promise<Array<{ user: string; body: string }>> {
    const { data: comments } = await this.githubService.getOctokit().rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber
    });

    return comments.map(c => ({
      user: c.user?.login || 'unknown',
      body: c.body || ''
    }));
  }
}

export const agentGitBridge = new AgentGitBridge(githubService, worktreeService);
