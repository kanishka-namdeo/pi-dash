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

const mockInvoke = vi.fn<(channel: string, ...args: unknown[]) => Promise<unknown>>();

beforeEach(() => {
  vi.clearAllMocks();
  mockInvoke.mockImplementation((channel: string) => {
    switch (channel) {
      case 'github:auth:getUser':
        return Promise.resolve(null);
      case 'github:repo:list':
        return Promise.resolve([]);
      case 'github:repo:getActive':
        return Promise.resolve(null);
      case 'github:auth:oauth':
        return Promise.resolve({ success: true });
      case 'github:auth:pat':
        return Promise.resolve({ success: true });
      case 'github:auth:logout':
        return Promise.resolve({ success: true });
      case 'github:repo:add':
        return Promise.resolve(mockRepo);
      case 'github:repo:remove':
        return Promise.resolve({ success: true });
      case 'github:repo:setActive':
        return Promise.resolve({ success: true });
      case 'github:data:issues':
        return Promise.resolve([]);
      case 'github:data:prs':
        return Promise.resolve([]);
      default:
        return Promise.resolve(null);
    }
  });
  
  Object.defineProperty(window, 'api', {
    value: {
      invoke: mockInvoke,
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
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'github:auth:getUser') return Promise.resolve(mockUser);
      if (channel === 'github:repo:list') return Promise.resolve([mockRepo]);
      if (channel === 'github:repo:getActive') return Promise.resolve(mockRepo);
      return Promise.resolve(null);
    });

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

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'github:auth:oauth') return Promise.resolve({ success: true });
      if (channel === 'github:auth:getUser') return Promise.resolve(mockUser);
      return Promise.resolve(null);
    });

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

    expect(mockInvoke).toHaveBeenCalledWith('github:auth:oauth');
    expect(mockInvoke).toHaveBeenCalledWith('github:auth:getUser');
  });

  it('handles login with PAT', async () => {
    let loginFn: ((method: 'oauth' | 'pat', token?: string) => Promise<void>) | undefined;
    function LoginTestComponent() {
      const { login, isAuthenticated } = useGitHub();
      loginFn = login;
      return <div data-testid="auth">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>;
    }

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'github:auth:pat') return Promise.resolve({ success: true });
      if (channel === 'github:auth:getUser') return Promise.resolve(mockUser);
      return Promise.resolve(null);
    });

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

    expect(mockInvoke).toHaveBeenCalledWith('github:auth:pat', 'test-token');
  });

  it('handles logout', async () => {
    let logoutFn: (() => Promise<void>) | undefined;
    function LogoutTestComponent() {
      const { logout, isAuthenticated } = useGitHub();
      logoutFn = logout;
      return <div data-testid="auth">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>;
    }

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'github:auth:getUser') return Promise.resolve(mockUser);
      if (channel === 'github:auth:logout') return Promise.resolve({ success: true });
      return Promise.resolve(null);
    });

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

    expect(mockInvoke).toHaveBeenCalledWith('github:auth:logout');
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

    expect(mockInvoke).toHaveBeenCalledWith('github:repo:add', 'testowner', 'testrepo', '/path/to/repo');
  });

  it('handles removing a repo', async () => {
    let removeRepoFn: ((id: number) => Promise<void>) | undefined;
    function RepoTestComponent() {
      const { removeRepo, repos } = useGitHub();
      removeRepoFn = removeRepo;
      return <div data-testid="repos">{repos.length}</div>;
    }

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'github:repo:list') return Promise.resolve([mockRepo]);
      if (channel === 'github:repo:remove') return Promise.resolve({ success: true });
      return Promise.resolve(null);
    });

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

    expect(mockInvoke).toHaveBeenCalledWith('github:repo:remove', 1);
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

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'github:repo:list') return Promise.resolve([mockRepo]);
      if (channel === 'github:repo:getActive') return Promise.resolve(null);
      if (channel === 'github:repo:setActive') return Promise.resolve({ success: true });
      return Promise.resolve(null);
    });

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

    expect(mockInvoke).toHaveBeenCalledWith('github:repo:setActive', 1);
  });

  it('loads issues and PRs when active repo changes', async () => {
    const mockIssues: GitHubIssue[] = [{ number: 1, title: 'Issue 1', state: 'open', labels: [], createdAt: '', updatedAt: '' }];
    const mockPRs: GitHubPR[] = [{ number: 2, title: 'PR 1', state: 'open', head: { ref: 'feature' }, base: { ref: 'main' }, user: { login: 'testuser' }, createdAt: '', additions: 10, deletions: 5, commits: 1 }];

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'github:repo:list') return Promise.resolve([mockRepo]);
      if (channel === 'github:repo:getActive') return Promise.resolve(mockRepo);
      if (channel === 'github:data:issues') return Promise.resolve(mockIssues);
      if (channel === 'github:data:prs') return Promise.resolve(mockPRs);
      return Promise.resolve(null);
    });

    render(
      <GitHubProvider>
        <TestComponent />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('issues')).toHaveTextContent('1');
      expect(screen.getByTestId('prs')).toHaveTextContent('1');
    });

    expect(mockInvoke).toHaveBeenCalledWith('github:data:issues', 'testowner', 'testrepo');
    expect(mockInvoke).toHaveBeenCalledWith('github:data:prs', 'testowner', 'testrepo');
  });

  it('handles refresh', async () => {
    let refreshFn: (() => Promise<void>) | undefined;
    function RefreshTestComponent() {
      const { refresh, issues } = useGitHub();
      refreshFn = refresh;
      return <div data-testid="issues">{issues.length}</div>;
    }

    const mockIssues: GitHubIssue[] = [{ number: 1, title: 'Issue 1', state: 'open', labels: [], createdAt: '', updatedAt: '' }];
    
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'github:repo:list') return Promise.resolve([mockRepo]);
      if (channel === 'github:repo:getActive') return Promise.resolve(mockRepo);
      if (channel === 'github:data:issues') return Promise.resolve(mockIssues);
      if (channel === 'github:data:prs') return Promise.resolve([]);
      return Promise.resolve(null);
    });

    render(
      <GitHubProvider>
        <RefreshTestComponent />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('issues')).toHaveTextContent('1');
    });

    const newIssues: GitHubIssue[] = [{ number: 1, title: 'Issue 1', state: 'open', labels: [], createdAt: '', updatedAt: '' }, { number: 2, title: 'Issue 2', state: 'open', labels: [], createdAt: '', updatedAt: '' }];
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'github:data:issues') return Promise.resolve(newIssues);
      if (channel === 'github:data:prs') return Promise.resolve([]);
      return Promise.resolve(null);
    });

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
