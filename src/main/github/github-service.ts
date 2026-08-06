import { Octokit } from '@octokit/rest';
import { rateLimitTracker } from './rate-limit-tracker';


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

  async makeRequest<T>(fn: () => Promise<T>): Promise<T> {
    if (!rateLimitTracker.canMakeRequest()) {
      const waitTime = rateLimitTracker.getWaitTime();
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, waitTime + 1000);
      await promise;
    }

    try {
      const result = await fn();
      return result;
    } catch (error: unknown) {
      if (error instanceof Error && 'status' in error) {
        const httpError = error as Error & { status: number };
        if (httpError.status === 403 && error.message.includes('rate limit')) {
          const waitTime = rateLimitTracker.getWaitTime();
          const { promise: retryPromise, resolve: retryResolve } = Promise.withResolvers<void>();
          setTimeout(retryResolve, waitTime + 1000);
          await retryPromise;
          return fn();
        }
      }
      throw error;
    }
  }
}

export const githubService = new GitHubService();
