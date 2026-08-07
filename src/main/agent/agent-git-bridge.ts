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
    if (!branch) throw new Error('Could not determine current branch');
    const remoteUrl = await git.getConfig('remote.origin.url');
    const match = remoteUrl.value?.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (!match) throw new Error('Could not determine repo from remote URL');

    const [, owner, repo] = match;

    const { data: pr } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.pulls.create({
        owner,
        repo,
        title,
        body,
        head: branch,
        base: 'main'
      })
    );

    return { number: pr.number, url: pr.html_url };
  }

  async commentOnIssue(owner: string, repo: string, issueNumber: number, body: string): Promise<void> {
    await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body
      })
    );
  }

  async readPRFeedback(owner: string, repo: string, prNumber: number): Promise<Array<{ user: string; body: string }>> {
    const { data: comments } = await this.githubService.makeRequest(() =>
      this.githubService.getOctokit().rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber
      })
    );

    return comments.map(c => ({
      user: c.user?.login || 'unknown',
      body: c.body || ''
    }));
  }

  async assignAgentToWorktree(worktreeId: string, agentId: string): Promise<{ success: boolean }> {
    const worktrees = (worktreeService as any).store?.get?.('worktrees') ?? [];
    const worktree = worktrees.find((w: { id: string }) => w.id === worktreeId);
    if (!worktree) throw new Error(`Worktree ${worktreeId} not found`);

    // Update worktree metadata
    worktree.agentId = agentId;
    worktree.status = 'active';

    // ponytail: full implementation requires spawning an agent session in the worktree path
    // with env vars (GIT_WORKTREE, GITHUB_ISSUE, GITHUB_REPO, GITHUB_BRANCH) and starting
    // feedback polling. The agent session manager is not yet wired up; this stores the
    // assignment so the UI can reflect it and the session can be spawned on next launch.
    if ((worktreeService as any).store?.set) {
      (worktreeService as any).store.set('worktrees', worktrees);
    }

    return { success: true };
  }
}

export const agentGitBridge = new AgentGitBridge(githubService, worktreeService);
