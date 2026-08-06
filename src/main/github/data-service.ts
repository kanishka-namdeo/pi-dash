import { GitHubService, githubService } from './github-service';
import { GitHubIssue, GitHubPR } from '../../shared/github-types';

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string, ttlMs: number): T | null {
    const cached = this.store.get(key);
    if (cached && Date.now() - cached.fetchedAt < ttlMs) {
      return cached.data as T;
    }
    return null;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, { data, fetchedAt: Date.now() });
  }
}

const TTL_ISSUES = 60_000;
const TTL_PRS = 60_000;
const TTL_BRANCHES = 5 * 60_000;

export class DataService {
  private githubService: GitHubService;
  private cache = new Cache();

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
  }

  async fetchIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
    const cacheKey = `issues:${owner}/${repo}`;
    const cached = this.cache.get<GitHubIssue[]>(cacheKey, TTL_ISSUES);
    if (cached) return cached;

    const { data } = await this.githubService.getOctokit().rest.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      sort: 'updated'
    });

    const issues: GitHubIssue[] = data.map(issue => ({
      number: issue.number,
      title: issue.title,
      state: issue.state as 'open' | 'closed',
      labels: issue.labels.map(l => typeof l === 'string' ? { name: l, color: '000000' } : { name: l.name || '', color: l.color || '000000' }),
      assignee: issue.assignee ? { login: issue.assignee.login } : undefined,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at
    }));

    this.cache.set(cacheKey, issues);
    return issues;
  }

  async fetchPRs(owner: string, repo: string): Promise<GitHubPR[]> {
    const cacheKey = `prs:${owner}/${repo}`;
    const cached = this.cache.get<GitHubPR[]>(cacheKey, TTL_PRS);
    if (cached) return cached;

    const { data } = await this.githubService.getOctokit().rest.pulls.list({
      owner,
      repo,
      state: 'open',
      sort: 'updated'
    });

    const prs: GitHubPR[] = data.map(pr => ({
      number: pr.number,
      title: pr.title,
      state: pr.state as 'open' | 'closed' | 'merged',
      head: { ref: pr.head.ref },
      base: { ref: pr.base.ref },
      user: { login: pr.user?.login || '' },
      createdAt: pr.created_at,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      commits: pr.commits || 0
    }));

    this.cache.set(cacheKey, prs);
    return prs;
  }

  async fetchBranches(owner: string, repo: string): Promise<string[]> {
    const cacheKey = `branches:${owner}/${repo}`;
    const cached = this.cache.get<string[]>(cacheKey, TTL_BRANCHES);
    if (cached) return cached;

    const { data } = await this.githubService.getOctokit().rest.repos.listBranches({
      owner,
      repo
    });

    const branches = data.map(b => b.name);
    this.cache.set(cacheKey, branches);
    return branches;
  }
}
export const dataService = new DataService(githubService);

