import { Octokit } from '@octokit/rest';

export class GitHubService {
  private octokit: Octokit;
  private token: string | null = null;

  constructor() {
    this.octokit = new Octokit();
  }

  setToken(token: string): void {
    this.token = token;
    this.octokit = new Octokit({ auth: token });
  }

  clearToken(): void {
    this.token = null;
    this.octokit = new Octokit();
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  getOctokit(): Octokit {
    return this.octokit;
  }
}

export const githubService = new GitHubService();
