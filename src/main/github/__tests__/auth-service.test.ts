import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth-service';
import { githubService } from '../github-service';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.restoreAllMocks();
    authService = new AuthService(githubService);
    githubService.clearToken();
  });

  it('validates valid PAT and stores token', async () => {
    const mockToken = 'ghp_test123';
    const mockUser = { id: 1, login: 'testuser', avatar_url: 'https://example.com/avatar.png' };
    
    // Mock getOctokit to return a mock octokit with mocked getAuthenticated
    const mockOctokit = {
      rest: {
        users: {
          getAuthenticated: vi.fn().mockResolvedValue({ data: mockUser })
        }
      }
    };
    vi.spyOn(githubService, 'getOctokit').mockReturnValue(mockOctokit as unknown as ReturnType<typeof githubService.getOctokit>);

    const result = await authService.authenticatePAT(mockToken);
    expect(result.success).toBe(true);
    expect(authService.getToken()).toBe(mockToken);
  });

  it('rejects invalid PAT', async () => {
    const mockOctokit = {
      rest: {
        users: {
          getAuthenticated: vi.fn().mockRejectedValue(new Error('Bad credentials'))
        }
      }
    };
    vi.spyOn(githubService, 'getOctokit').mockReturnValue(mockOctokit as unknown as ReturnType<typeof githubService.getOctokit>);

    const result = await authService.authenticatePAT('invalid-token');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid token');
  });
});
