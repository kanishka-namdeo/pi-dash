import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubService } from '../github-service';

describe('GitHubService', () => {
  let service: GitHubService;

  beforeEach(() => {
    service = new GitHubService();
  });

  it('initializes without token', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('setToken authenticates and provides octokit', () => {
    service.setToken('test-token');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getOctokit()).toBeDefined();
  });

  it('clearToken removes authentication', () => {
    service.setToken('test-token');
    service.clearToken();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('getOctokit returns octokit instance', () => {
    const octokit = service.getOctokit();
    expect(octokit).toBeDefined();
  });
});
