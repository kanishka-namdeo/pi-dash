import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BottomBar } from '../BottomBar';
import { SessionProvider, useSessionContext } from '@/context/SessionContext';
import { GitHubProvider } from '@/context/GitHubContext';
import { useEffect } from 'react';

// Helper component that registers a session for testing
function SessionRegistrar({ children }: { children: React.ReactNode }) {
  const { registerSession } = useSessionContext();
  useEffect(() => {
    registerSession('test-agent', 1234, '/test/path');
  }, [registerSession]);
  return <>{children}</>;
}
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'api', {
    value: {
      github: {
        auth: {
          getState: vi.fn().mockResolvedValue({ isAuthenticated: false, user: null, method: null }),
        },
        repos: {
          getAll: vi.fn().mockResolvedValue({ repos: [], activeRepo: null }),
        },
        data: {
          fetchIssues: vi.fn().mockResolvedValue([]),
          fetchPRs: vi.fn().mockResolvedValue([]),
          fetchBranches: vi.fn().mockResolvedValue([]),
        },
      },
      worktree: {
        list: vi.fn().mockResolvedValue([]),
      },
    },
    writable: true,
  });
});

describe('BottomBar', () => {
  it('renders three zones', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId('bottom-bar-left')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-bar-center')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-bar-right')).toBeInTheDocument();
  });

  it('has correct height and border', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    const bar = screen.getByTestId('bottom-bar');
    expect(bar).toHaveStyle({ height: '36px' });
  });
});

describe('BottomBar Left Zone', () => {
  it('renders agent pill with status dot', () => {
    render(
      <SessionProvider>
        <SessionRegistrar>
          <GitHubProvider>
            <BottomBar />
          </GitHubProvider>
        </SessionRegistrar>
      </SessionProvider>
    );
    expect(screen.getByTestId('agent-pill')).toBeInTheDocument();
    expect(screen.getByTestId('agent-status-dot')).toBeInTheDocument();
  });

  it('shows app name when no agents', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByText('PiDash')).toBeInTheDocument();
  });
});

describe('BottomBar Right Zone', () => {
  it('renders mode toggle', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId('mode-toggle')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('renders elapsed time', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId('elapsed-time')).toBeInTheDocument();
  });

  it('renders agent count with status dot', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId('agent-count')).toBeInTheDocument();
  });

  it('renders settings button', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId('settings-btn')).toBeInTheDocument();
  });
});

describe('BottomBar Center Zone', () => {
  it('shows divider when no alerts', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId('center-divider')).toBeInTheDocument();
  });

  it('shows rate limit alert when active', () => {
    render(
      <SessionProvider>
        <GitHubProvider>
          <BottomBar rateLimitAlert={{ provider: 'claude', percentUsed: 85, resetsIn: 9000 }} />
        </GitHubProvider>
      </SessionProvider>
    );
    expect(screen.getByTestId('rate-limit-alert')).toBeInTheDocument();
  });
});
describe('BottomBar Responsive', () => {
  it('hides repo name at narrow widths', async () => {
    // Override mock to provide an active repo
    Object.defineProperty(window, 'api', {
      value: {
        github: {
          auth: {
            getState: vi.fn().mockResolvedValue({ isAuthenticated: false, user: null, method: null }),
          },
          repos: {
            getAll: vi.fn().mockResolvedValue({
              repos: [{ id: 'pi-dash', name: 'pi-dash', owner: 'test', localPath: '/test' }],
              activeRepo: { id: 'pi-dash', name: 'pi-dash', owner: 'test', localPath: '/test' },
            }),
          },
          data: {
            fetchIssues: vi.fn().mockResolvedValue([]),
            fetchPRs: vi.fn().mockResolvedValue([]),
            fetchBranches: vi.fn().mockResolvedValue(['main']),
          },
        },
        worktree: {
          list: vi.fn().mockResolvedValue([]),
        },
      },
      writable: true,
    });

    // Mock window.innerWidth = 700
    Object.defineProperty(window, 'innerWidth', { value: 700, writable: true });
    window.dispatchEvent(new Event('resize'));

    render(
      <SessionProvider>
        <SessionRegistrar>
          <GitHubProvider>
            <BottomBar />
          </GitHubProvider>
        </SessionRegistrar>
      </SessionProvider>
    );


    // Repo name should be hidden at width < 800
    expect(screen.queryByText('pi-dash')).not.toBeInTheDocument();
    // But branch should still be visible at width >= 700 (wait for async load)
    await waitFor(() => {
      expect(screen.getByText('main')).toBeInTheDocument();
    });
  });

  it('hides branch label at very narrow widths', async () => {
    Object.defineProperty(window, 'api', {
      value: {
        github: {
          auth: {
            getState: vi.fn().mockResolvedValue({ isAuthenticated: false, user: null, method: null }),
          },
          repos: {
            getAll: vi.fn().mockResolvedValue({
              repos: [{ id: 'pi-dash', name: 'pi-dash', owner: 'test', localPath: '/test' }],
              activeRepo: { id: 'pi-dash', name: 'pi-dash', owner: 'test', localPath: '/test' },
            }),
          },
          data: {
            fetchIssues: vi.fn().mockResolvedValue([]),
            fetchPRs: vi.fn().mockResolvedValue([]),
            fetchBranches: vi.fn().mockResolvedValue(['main']),
          },
        },
        worktree: {
          list: vi.fn().mockResolvedValue([]),
        },
      },
      writable: true,
    });

    // Mock window.innerWidth = 600
    Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });
    window.dispatchEvent(new Event('resize'));

    render(
      <SessionProvider>
        <SessionRegistrar>
          <GitHubProvider>
            <BottomBar />
          </GitHubProvider>
        </SessionRegistrar>
      </SessionProvider>
    );

    // Both repo name and branch should be hidden at width < 700
    expect(screen.queryByText('pi-dash')).not.toBeInTheDocument();
    expect(screen.queryByText('main')).not.toBeInTheDocument();
  });
});
