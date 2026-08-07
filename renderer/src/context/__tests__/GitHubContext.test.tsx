import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GitHubProvider, useGitHub } from '../GitHubContext';
import type { Repo, GitHubIssue, GitHubPR } from '../../../../src/shared/github-types';

function TestComponent() {
  const { isAuthenticated, user, repos, activeRepo, issues, prs } = useGitHub();
  return (
    <div>
      <div data-testid="auth">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
      <div data-testid="user">{user?.login || 'No user'}</div>
      <div data-testid="repos">{repos.length}</div>
      <div data-testid="active-repo">{activeRepo?.name || 'None'}</div>
      <div data-testid="issues">{(issues || []).length}</div>
      <div data-testid="prs">{(prs || []).length}</div>
    </div>
  );
}

const mockRepo: Repo = {
  id: 1,
  owner: 'testowner',
  name: 'testrepo',
  fullName: 'testowner/testrepo',
  localPath: '/path/to/repo',
  defaultBranch: 'main',
  isPrivate: false,
  lastSyncedAt: Date.now(),
};

const mockUser = {
  id: 123,
  login: 'testuser',
  avatarUrl: 'https://example.com/avatar.png',
};

const mockGitHub = {
  auth: {
    getState: vi.fn<() => Promise<{ isAuthenticated: boolean; user: typeof mockUser | null; method: 'oauth' | 'pat' | null }>>(),
    startOAuth: vi.fn<() => Promise<{ success: boolean }>>(),
    loginWithPAT: vi.fn<(token: string) => Promise<{ success: boolean }>>(),
    logout: vi.fn<() => Promise<{ success: true }>>(),
  },
  repos: {
    getAll: vi.fn<() => Promise<{ repos: Repo[]; activeRepo: Repo | null }>>(),
    add: vi.fn<(owner: string, name: string, localPath: string) => Promise<Repo>>(),
    remove: vi.fn<(id: number) => Promise<{ success: true }>>(),
    setActive: vi.fn<(id: number) => Promise<{ success: true }>>(),
  },
  data: {
    fetchIssues: vi.fn<(owner: string, repo: string) => Promise<GitHubIssue[]>>(),
    fetchPRs: vi.fn<(owner: string, repo: string) => Promise<GitHubPR[]>>(),
    fetchBranches: vi.fn<(owner: string, repo: string) => Promise<string[]>>(),
  },
  issues: {
    create: vi.fn(),
    comment: vi.fn(),
  },
  prs: {
    create: vi.fn(),
    review: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  
  // Default mock implementations
  mockGitHub.auth.getState.mockResolvedValue({ isAuthenticated: false, user: null, method: null });
  mockGitHub.auth.startOAuth.mockResolvedValue({ success: true });
  mockGitHub.auth.loginWithPAT.mockResolvedValue({ success: true });
  mockGitHub.auth.logout.mockResolvedValue({ success: true });
  mockGitHub.repos.getAll.mockResolvedValue({ repos: [], activeRepo: null });
  mockGitHub.repos.add.mockResolvedValue(mockRepo);
  mockGitHub.repos.remove.mockResolvedValue({ success: true });
  mockGitHub.repos.setActive.mockResolvedValue({ success: true });
  mockGitHub.data.fetchIssues.mockResolvedValue([]);
  mockGitHub.data.fetchPRs.mockResolvedValue([]);
  mockGitHub.data.fetchBranches.mockResolvedValue([]);
  mockGitHub.issues.create.mockResolvedValue({});
  mockGitHub.issues.comment.mockResolvedValue({});
  mockGitHub.prs.create.mockResolvedValue({});
  mockGitHub.prs.review.mockResolvedValue({});
  
  Object.defineProperty(window, 'api', {
    value: {
      github: mockGitHub,
      worktree: {
        list: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
      },
      agentGitHub: {
        assign: vi.fn().mockResolvedValue({ success: true }),
      },
    },
    writable: true,
    configurable: true,
  });
});

describe('GitHubContext', () => {
  it('provides initial unauthenticated state', async () => {
    render(
      <GitHubProvider>
        <TestComponent />
      </GitHubProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('Not authenticated');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('No user');
    expect(screen.getByTestId('repos')).toHaveTextContent('0');
    expect(screen.getByTestId('active-repo')).toHaveTextContent('None');
  });

  it('loads initial state on mount', async () => {
    mockGitHub.auth.getState.mockResolvedValue({ isAuthenticated: true, user: mockUser, method: 'pat' });
    mockGitHub.repos.getAll.mockResolvedValue({ repos: [mockRepo], activeRepo: mockRepo });

    render(
      <GitHubProvider>
        <TestComponent />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      expect(screen.getByTestId('repos')).toHaveTextContent('1');
      expect(screen.getByTestId('active-repo')).toHaveTextContent('testrepo');
    });
  });

  it('handles login with OAuth', async () => {
    let loginFn: ((method: 'oauth' | 'pat', token?: string) => Promise<void>) | undefined;
    function LoginTestComponent() {
      const { login, isAuthenticated } = useGitHub();
      loginFn = login;
      return <div data-testid="auth">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>;
    }

    mockGitHub.auth.startOAuth.mockResolvedValue({ success: true });
    mockGitHub.auth.getState.mockResolvedValue({ isAuthenticated: true, user: mockUser, method: 'oauth' });

    render(
      <GitHubProvider>
        <LoginTestComponent />
      </GitHubProvider>
    );

    await act(async () => {
      await loginFn!('oauth');
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('Authenticated');
    });

    expect(mockGitHub.auth.startOAuth).toHaveBeenCalled();
    expect(mockGitHub.auth.getState).toHaveBeenCalled();
  });

  it('handles login with PAT', async () => {
    let loginFn: ((method: 'oauth' | 'pat', token?: string) => Promise<void>) | undefined;
    function LoginTestComponent() {
      const { login, isAuthenticated } = useGitHub();
      loginFn = login;
      return <div data-testid="auth">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>;
    }

    mockGitHub.auth.loginWithPAT.mockResolvedValue({ success: true });
    mockGitHub.auth.getState.mockResolvedValue({ isAuthenticated: true, user: mockUser, method: 'pat' });

    render(
      <GitHubProvider>
        <LoginTestComponent />
      </GitHubProvider>
    );

    await act(async () => {
      await loginFn!('pat', 'ghp_testtoken123');
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('Authenticated');
    });

    expect(mockGitHub.auth.loginWithPAT).toHaveBeenCalledWith('ghp_testtoken123');
  });

  it('handles logout', async () => {
    let logoutFn: (() => Promise<void>) | undefined;
    function LogoutTestComponent() {
      const { logout, isAuthenticated } = useGitHub();
      logoutFn = logout;
      return <div data-testid="auth">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>;
    }

    mockGitHub.auth.getState.mockResolvedValue({ isAuthenticated: true, user: mockUser, method: 'pat' });
    mockGitHub.auth.logout.mockResolvedValue({ success: true });

    render(
      <GitHubProvider>
        <LogoutTestComponent />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('Authenticated');
    });

    await act(async () => {
      await logoutFn!();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('Not authenticated');
    });

    expect(mockGitHub.auth.logout).toHaveBeenCalled();
  });

  it('handles adding a repo', async () => {
    let addRepoFn: ((owner: string, name: string, localPath: string) => Promise<void>) | undefined;
    function RepoTestComponent() {
      const { addRepo, repos } = useGitHub();
      addRepoFn = addRepo;
      return <div data-testid="repos">{repos.length}</div>;
    }

    mockGitHub.repos.getAll.mockResolvedValueOnce({ repos: [], activeRepo: null });
    mockGitHub.repos.getAll.mockResolvedValue({ repos: [mockRepo], activeRepo: null });

    render(
      <GitHubProvider>
        <RepoTestComponent />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('repos')).toHaveTextContent('0');
    });

    await act(async () => {
      await addRepoFn!('testowner', 'testrepo', '/path/to/repo');
    });

    await waitFor(() => {
      expect(screen.getByTestId('repos')).toHaveTextContent('1');
    });

    expect(mockGitHub.repos.add).toHaveBeenCalledWith('testowner', 'testrepo', '/path/to/repo');
  });

  it('handles removing a repo', async () => {
    let removeRepoFn: ((id: number) => Promise<void>) | undefined;
    function RepoTestComponent() {
      const { removeRepo, repos } = useGitHub();
      removeRepoFn = removeRepo;
      return <div data-testid="repos">{repos.length}</div>;
    }

    mockGitHub.repos.getAll.mockResolvedValueOnce({ repos: [mockRepo], activeRepo: null });
    mockGitHub.repos.getAll.mockResolvedValue({ repos: [], activeRepo: null });
    mockGitHub.repos.remove.mockResolvedValue({ success: true });

    render(
      <GitHubProvider>
        <RepoTestComponent />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('repos')).toHaveTextContent('1');
    });
    mockGitHub.repos.getAll.mockResolvedValue({ repos: [], activeRepo: null });
    await act(async () => {
      await removeRepoFn!(1);
    });

    await waitFor(() => {
      expect(screen.getByTestId('repos')).toHaveTextContent('0');
    });

    expect(mockGitHub.repos.remove).toHaveBeenCalledWith(1);
  });

  it('handles setting active repo', async () => {
    let setActiveRepoFn: ((id: number) => Promise<void>) | undefined;
    function ActiveRepoTestComponent() {
      const { setActiveRepo, activeRepo, repos } = useGitHub();
      setActiveRepoFn = setActiveRepo;
      return <div>
        <div data-testid="active-repo">{activeRepo?.name || 'None'}</div>
        <div data-testid="repos">{repos.length}</div>
      </div>;
    }

    mockGitHub.repos.getAll.mockResolvedValueOnce({ repos: [mockRepo], activeRepo: null });
    mockGitHub.repos.getAll.mockResolvedValue({ repos: [mockRepo], activeRepo: mockRepo });
    mockGitHub.repos.setActive.mockResolvedValue({ success: true });

    render(
      <GitHubProvider>
        <ActiveRepoTestComponent />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('repos')).toHaveTextContent('1');
    });

    await act(async () => {
      await setActiveRepoFn!(1);
    });

    await waitFor(() => {
      expect(screen.getByTestId('active-repo')).toHaveTextContent('testrepo');
    });

    expect(mockGitHub.repos.setActive).toHaveBeenCalledWith(1);
  });

  it('loads issues and PRs when active repo changes', async () => {
    const mockIssues: GitHubIssue[] = [{ number: 1, title: 'Issue 1', state: 'open', labels: [], createdAt: '', updatedAt: '' }];
    const mockPRs: GitHubPR[] = [{ number: 2, title: 'PR 1', state: 'open', head: { ref: 'feature' }, base: { ref: 'main' }, user: { login: 'testuser' }, createdAt: '', additions: 10, deletions: 5, commits: 1 }];

    mockGitHub.repos.getAll.mockResolvedValue({ repos: [mockRepo], activeRepo: mockRepo });
    mockGitHub.data.fetchIssues.mockResolvedValue(mockIssues);
    mockGitHub.data.fetchPRs.mockResolvedValue(mockPRs);

    render(
      <GitHubProvider>
        <TestComponent />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('issues')).toHaveTextContent('1');
      expect(screen.getByTestId('prs')).toHaveTextContent('1');
    });

    expect(mockGitHub.data.fetchIssues).toHaveBeenCalledWith('testowner', 'testrepo');
    expect(mockGitHub.data.fetchPRs).toHaveBeenCalledWith('testowner', 'testrepo');
  });

  it('handles refresh', async () => {
    let refreshFn: (() => Promise<void>) | undefined;
    function RefreshTestComponent() {
      const { refresh, issues } = useGitHub();
      refreshFn = refresh;
      return <div data-testid="issues">{issues.length}</div>;
    }

    const mockIssues: GitHubIssue[] = [{ number: 1, title: 'Issue 1', state: 'open', labels: [], createdAt: '', updatedAt: '' }];
    
    mockGitHub.repos.getAll.mockResolvedValue({ repos: [mockRepo], activeRepo: mockRepo });
    mockGitHub.data.fetchIssues.mockResolvedValue(mockIssues);
    mockGitHub.data.fetchPRs.mockResolvedValue([]);

    render(
      <GitHubProvider>
        <RefreshTestComponent />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('issues')).toHaveTextContent('1');
    });

    const newIssues: GitHubIssue[] = [{ number: 1, title: 'Issue 1', state: 'open', labels: [], createdAt: '', updatedAt: '' }, { number: 2, title: 'Issue 2', state: 'open', labels: [], createdAt: '', updatedAt: '' }];
    mockGitHub.data.fetchIssues.mockResolvedValue(newIssues);

    await act(async () => {
      await refreshFn!();
    });

    await waitFor(() => {
      expect(screen.getByTestId('issues')).toHaveTextContent('2');
    });
  });

  it('throws error when useGitHub is used outside provider', () => {
    function BadComponent() {
      const ctx = useGitHub();
      return <div>{ctx.isAuthenticated ? 'yes' : 'no'}</div>;
    }

    expect(() => render(<BadComponent />)).toThrow('useGitHub must be used within GitHubProvider');
  });
});
