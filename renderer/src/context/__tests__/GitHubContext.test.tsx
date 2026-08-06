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
  authGetUser: vi.fn<() => Promise<unknown>>(),
  authOAuth: vi.fn<() => Promise<{ success: boolean }>>(),
  authPAT: vi.fn<(token: string) => Promise<{ success: boolean }>>(),
  authLogout: vi.fn<() => Promise<{ success: true }>>(),
  repoList: vi.fn<() => Promise<Repo[]>>(),
  repoAdd: vi.fn<(owner: string, name: string, localPath: string) => Promise<Repo>>(),
  repoRemove: vi.fn<(id: number) => Promise<{ success: true }>>(),
  repoGetActive: vi.fn<() => Promise<Repo | null>>(),
  repoSetActive: vi.fn<(id: number) => Promise<{ success: true }>>(),
  dataIssues: vi.fn<(owner: string, repo: string) => Promise<GitHubIssue[]>>(),
  dataPRs: vi.fn<(owner: string, repo: string) => Promise<GitHubPR[]>>(),
};

beforeEach(() => {
  vi.clearAllMocks();
  
  // Default mock implementations
  mockGitHub.authGetUser.mockResolvedValue(null);
  mockGitHub.authOAuth.mockResolvedValue({ success: true });
  mockGitHub.authPAT.mockResolvedValue({ success: true });
  mockGitHub.authLogout.mockResolvedValue({ success: true });
  mockGitHub.repoList.mockResolvedValue([]);
  mockGitHub.repoAdd.mockResolvedValue(mockRepo);
  mockGitHub.repoRemove.mockResolvedValue({ success: true });
  mockGitHub.repoGetActive.mockResolvedValue(null);
  mockGitHub.repoSetActive.mockResolvedValue({ success: true });
  mockGitHub.dataIssues.mockResolvedValue([]);
  mockGitHub.dataPRs.mockResolvedValue([]);
  
  Object.defineProperty(window, 'api', {
    value: {
      github: mockGitHub,
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
    mockGitHub.authGetUser.mockResolvedValue(mockUser);
    mockGitHub.repoList.mockResolvedValue([mockRepo]);
    mockGitHub.repoGetActive.mockResolvedValue(mockRepo);

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

    mockGitHub.authOAuth.mockResolvedValue({ success: true });
    mockGitHub.authGetUser.mockResolvedValue(mockUser);

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

    expect(mockGitHub.authOAuth).toHaveBeenCalled();
    expect(mockGitHub.authGetUser).toHaveBeenCalled();
  });

  it('handles login with PAT', async () => {
    let loginFn: ((method: 'oauth' | 'pat', token?: string) => Promise<void>) | undefined;
    function LoginTestComponent() {
      const { login, isAuthenticated } = useGitHub();
      loginFn = login;
      return <div data-testid="auth">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>;
    }

    mockGitHub.authPAT.mockResolvedValue({ success: true });
    mockGitHub.authGetUser.mockResolvedValue(mockUser);

    render(
      <GitHubProvider>
        <LoginTestComponent />
      </GitHubProvider>
    );

    await act(async () => {
      await loginFn!('pat', 'test-token');
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('Authenticated');
    });

    expect(mockGitHub.authPAT).toHaveBeenCalledWith('test-token');
  });

  it('handles logout', async () => {
    let logoutFn: (() => Promise<void>) | undefined;
    function LogoutTestComponent() {
      const { logout, isAuthenticated } = useGitHub();
      logoutFn = logout;
      return <div data-testid="auth">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>;
    }

    mockGitHub.authGetUser.mockResolvedValue(mockUser);
    mockGitHub.authLogout.mockResolvedValue({ success: true });

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

    expect(mockGitHub.authLogout).toHaveBeenCalled();
  });

  it('handles adding a repo', async () => {
    let addRepoFn: ((owner: string, name: string, localPath: string) => Promise<void>) | undefined;
    function RepoTestComponent() {
      const { addRepo, repos } = useGitHub();
      addRepoFn = addRepo;
      return <div data-testid="repos">{repos.length}</div>;
    }

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

    expect(mockGitHub.repoAdd).toHaveBeenCalledWith('testowner', 'testrepo', '/path/to/repo');
  });

  it('handles removing a repo', async () => {
    let removeRepoFn: ((id: number) => Promise<void>) | undefined;
    function RepoTestComponent() {
      const { removeRepo, repos } = useGitHub();
      removeRepoFn = removeRepo;
      return <div data-testid="repos">{repos.length}</div>;
    }

    mockGitHub.repoList.mockResolvedValue([mockRepo]);
    mockGitHub.repoRemove.mockResolvedValue({ success: true });

    render(
      <GitHubProvider>
        <RepoTestComponent />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('repos')).toHaveTextContent('1');
    });

    await act(async () => {
      await removeRepoFn!(1);
    });

    await waitFor(() => {
      expect(screen.getByTestId('repos')).toHaveTextContent('0');
    });

    expect(mockGitHub.repoRemove).toHaveBeenCalledWith(1);
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

    mockGitHub.repoList.mockResolvedValue([mockRepo]);
    mockGitHub.repoGetActive.mockResolvedValue(null);
    mockGitHub.repoSetActive.mockResolvedValue({ success: true });

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

    expect(mockGitHub.repoSetActive).toHaveBeenCalledWith(1);
  });

  it('loads issues and PRs when active repo changes', async () => {
    const mockIssues: GitHubIssue[] = [{ number: 1, title: 'Issue 1', state: 'open', labels: [], createdAt: '', updatedAt: '' }];
    const mockPRs: GitHubPR[] = [{ number: 2, title: 'PR 1', state: 'open', head: { ref: 'feature' }, base: { ref: 'main' }, user: { login: 'testuser' }, createdAt: '', additions: 10, deletions: 5, commits: 1 }];

    mockGitHub.repoList.mockResolvedValue([mockRepo]);
    mockGitHub.repoGetActive.mockResolvedValue(mockRepo);
    mockGitHub.dataIssues.mockResolvedValue(mockIssues);
    mockGitHub.dataPRs.mockResolvedValue(mockPRs);

    render(
      <GitHubProvider>
        <TestComponent />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('issues')).toHaveTextContent('1');
      expect(screen.getByTestId('prs')).toHaveTextContent('1');
    });

    expect(mockGitHub.dataIssues).toHaveBeenCalledWith('testowner', 'testrepo');
    expect(mockGitHub.dataPRs).toHaveBeenCalledWith('testowner', 'testrepo');
  });

  it('handles refresh', async () => {
    let refreshFn: (() => Promise<void>) | undefined;
    function RefreshTestComponent() {
      const { refresh, issues } = useGitHub();
      refreshFn = refresh;
      return <div data-testid="issues">{issues.length}</div>;
    }

    const mockIssues: GitHubIssue[] = [{ number: 1, title: 'Issue 1', state: 'open', labels: [], createdAt: '', updatedAt: '' }];
    
    mockGitHub.repoList.mockResolvedValue([mockRepo]);
    mockGitHub.repoGetActive.mockResolvedValue(mockRepo);
    mockGitHub.dataIssues.mockResolvedValue(mockIssues);
    mockGitHub.dataPRs.mockResolvedValue([]);

    render(
      <GitHubProvider>
        <RefreshTestComponent />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('issues')).toHaveTextContent('1');
    });

    const newIssues: GitHubIssue[] = [{ number: 1, title: 'Issue 1', state: 'open', labels: [], createdAt: '', updatedAt: '' }, { number: 2, title: 'Issue 2', state: 'open', labels: [], createdAt: '', updatedAt: '' }];
    mockGitHub.dataIssues.mockResolvedValue(newIssues);

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
