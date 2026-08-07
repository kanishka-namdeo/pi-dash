import { GitHubService, githubService } from './github-service';
import { GitHubIssue, GitHubPR, GitHubComment, GitHubReview } from '../../shared/github-types';

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
const TTL_DETAIL = 30_000;

const REVIEW_STATE_MAP: Record<string, 'approved' | 'changes_requested' | 'commented' | 'pending'> = {
  APPROVED: 'approved',
  CHANGES_REQUESTED: 'changes_requested',
  COMMENTED: 'commented',
  PENDING: 'pending'
};

function extractPRField(pr: unknown, field: string): number {
  if (pr && typeof pr === 'object' && field in pr) {
    const value = (pr as Record<string, unknown>)[field];
    return typeof value === 'number' ? value : 0;
  }
  return 0;
}

export class DataService {
  private githubService: GitHubService;
  private cache = new Cache();
  private etags = new Map<string, string>();

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
  }

  async fetchIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
    const cacheKey = `issues:${owner}/${repo}`;
    const cached = this.cache.get<GitHubIssue[]>(cacheKey, TTL_ISSUES);
    if (cached) return cached;

    const etag = this.etags.get(cacheKey);

    const response = await this.githubService.getOctokit().rest.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      sort: 'updated',
      headers: etag ? { 'If-None-Match': etag } : undefined
    });

    if ((response.status as number) === 304) {
      const cachedAfterRequest = this.cache.get<GitHubIssue[]>(cacheKey, TTL_ISSUES);
      if (cachedAfterRequest) return cachedAfterRequest;
    }

    const issues: GitHubIssue[] = response.data.map(issue => ({
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      state: issue.state as 'open' | 'closed',
      labels: issue.labels.map(l => typeof l === 'string' ? { name: l, color: '000000' } : { name: l.name || '', color: l.color || '000000' }),
      assignee: issue.assignee ? { login: issue.assignee.login } : undefined,
      author: { login: issue.user?.login ?? '', avatarUrl: issue.user?.avatar_url ?? '' },
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      comments: []
    }));

    this.cache.set(cacheKey, issues);
    if (response.headers.etag) {
      this.etags.set(cacheKey, response.headers.etag);
    }
    return issues;
  }

  async fetchPRs(owner: string, repo: string): Promise<GitHubPR[]> {
    const cacheKey = `prs:${owner}/${repo}`;
    const cached = this.cache.get<GitHubPR[]>(cacheKey, TTL_PRS);
    if (cached) return cached;

    const etag = this.etags.get(cacheKey);

    const response = await this.githubService.getOctokit().rest.pulls.list({
      owner,
      repo,
      state: 'open',
      sort: 'updated',
      headers: etag ? { 'If-None-Match': etag } : undefined
    });

    if ((response.status as number) === 304) {
      const cachedAfterRequest = this.cache.get<GitHubPR[]>(cacheKey, TTL_PRS);
      if (cachedAfterRequest) return cachedAfterRequest;
    }

    const prs: GitHubPR[] = response.data.map(pr => ({
      number: pr.number,
      title: pr.title,
      body: pr.body || '',
      state: pr.state as 'open' | 'closed' | 'merged',
      head: { ref: pr.head.ref, sha: pr.head.sha },
      base: { ref: pr.base.ref },
      user: { login: pr.user?.login || '', avatarUrl: pr.user?.avatar_url || '' },
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      additions: extractPRField(pr, 'additions'),
      deletions: extractPRField(pr, 'deletions'),
      commits: extractPRField(pr, 'commits'),
      changedFiles: extractPRField(pr, 'changed_files'),
      ciStatus: 'none' as const,
      reviews: [],
      comments: []
    }));

    this.cache.set(cacheKey, prs);
    if (response.headers.etag) {
      this.etags.set(cacheKey, response.headers.etag);
    }
    return prs;
  }

  async fetchBranches(owner: string, repo: string): Promise<string[]> {
    const cacheKey = `branches:${owner}/${repo}`;
    const cached = this.cache.get<string[]>(cacheKey, TTL_BRANCHES);
    if (cached) return cached;

    const etag = this.etags.get(cacheKey);

    const response = await this.githubService.getOctokit().rest.repos.listBranches({
      owner,
      repo,
      headers: etag ? { 'If-None-Match': etag } : undefined
    });

    if ((response.status as number) === 304) { const cached = this.cache.get<string[]>(cacheKey, TTL_BRANCHES);
    if (cached) return cached; }

    const branches = response.data.map(b => b.name);
    this.cache.set(cacheKey, branches);
    if (response.headers.etag) {
      this.etags.set(cacheKey, response.headers.etag);
    }
    return branches;
  }

  async fetchIssueDetail(owner: string, repo: string, number: number): Promise<GitHubIssue> {
    const cacheKey = `issue:${owner}/${repo}/${number}`;
    const etag = this.etags.get(cacheKey);

    const [issueResponse, commentsResponse] = await Promise.all([
      this.githubService.getOctokit().rest.issues.get({
        owner,
        repo,
        issue_number: number,
        headers: etag ? { 'If-None-Match': etag } : undefined
      }),
      this.githubService.getOctokit().rest.issues.listComments({
        owner,
        repo,
        issue_number: number
      })
    ]);

    if ((issueResponse.status as number) === 304) { const cached = this.cache.get<GitHubIssue>(cacheKey, TTL_DETAIL);
    if (cached) return cached; }

    const issue = issueResponse.data;
    const comments: GitHubComment[] = commentsResponse.data.map(c => ({
      id: c.id,
      author: { login: c.user?.login ?? '', avatarUrl: c.user?.avatar_url ?? '' },
      body: c.body || '',
      createdAt: c.created_at,
      type: 'issue' as const
    }));

    const result: GitHubIssue = {
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      state: issue.state as 'open' | 'closed',
      labels: issue.labels.map(l => typeof l === 'string' ? { name: l, color: '000000' } : { name: l.name || '', color: l.color || '000000' }),
      assignee: issue.assignee ? { login: issue.assignee.login } : undefined,
      author: { login: issue.user?.login ?? '', avatarUrl: issue.user?.avatar_url ?? '' },
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      comments
    };

    this.cache.set(cacheKey, result);
    if (issueResponse.headers.etag) {
      this.etags.set(cacheKey, issueResponse.headers.etag);
    }
    return result;
  }

  async fetchPRDetail(owner: string, repo: string, number: number): Promise<GitHubPR> {
    const cacheKey = `pr:${owner}/${repo}/${number}`;
    const etag = this.etags.get(cacheKey);

    const [prResponse, reviewsResponse, commentsResponse] = await Promise.all([
      this.githubService.getOctokit().rest.pulls.get({
        owner,
        repo,
        pull_number: number,
        headers: etag ? { 'If-None-Match': etag } : undefined
      }),
      this.githubService.getOctokit().rest.pulls.listReviews({
        owner,
        repo,
        pull_number: number
      }),
      this.githubService.getOctokit().rest.issues.listComments({
        owner,
        repo,
        issue_number: number
      })
    ]);

    if ((prResponse.status as number) === 304) { const cached = this.cache.get<GitHubPR>(cacheKey, TTL_DETAIL);
    if (cached) return cached; }

    const pr = prResponse.data;

    const reviews: GitHubReview[] = reviewsResponse.data.map(r => ({
      id: r.id,
      author: { login: r.user?.login ?? '', avatarUrl: r.user?.avatar_url ?? '' },
      body: r.body || '',
      state: r.state ? (REVIEW_STATE_MAP[r.state] || 'pending') : 'pending',
      submittedAt: r.submitted_at || ''
    }));

    const comments: GitHubComment[] = commentsResponse.data.map(c => ({
      id: c.id,
      author: { login: c.user?.login ?? '', avatarUrl: c.user?.avatar_url ?? '' },
      body: c.body || '',
      createdAt: c.created_at,
      type: 'pr' as const
    }));

    let ciStatus: 'passing' | 'failing' | 'pending' | 'none' = 'none';
    try {
      const checksResponse = await this.githubService.getOctokit().rest.checks.listForRef({
        owner,
        repo,
        ref: pr.head.sha
      });

      if (checksResponse.data.total_count > 0) {
        const hasFailed = checksResponse.data.check_runs.some(c => c.conclusion === 'failure');
        const hasPending = checksResponse.data.check_runs.some(c => c.status === 'in_progress' || c.status === 'queued');

        if (hasFailed) {
          ciStatus = 'failing';
        } else if (hasPending) {
          ciStatus = 'pending';
        } else {
          ciStatus = 'passing';
        }
      }
    } catch {
      // CI status not available
    }

    const result: GitHubPR = {
      number: pr.number,
      title: pr.title,
      body: pr.body || '',
      state: pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed'),
      head: { ref: pr.head.ref, sha: pr.head.sha },
      base: { ref: pr.base.ref },
      user: { login: pr.user?.login || '', avatarUrl: pr.user?.avatar_url || '' },
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      additions: extractPRField(pr, 'additions'),
      deletions: extractPRField(pr, 'deletions'),
      commits: extractPRField(pr, 'commits'),
      changedFiles: extractPRField(pr, 'changed_files'),
      ciStatus,
      reviews,
      comments
    };

    this.cache.set(cacheKey, result);
    if (prResponse.headers.etag) {
      this.etags.set(cacheKey, prResponse.headers.etag);
    }
    return result;
  }
}

export const dataService = new DataService(githubService);
