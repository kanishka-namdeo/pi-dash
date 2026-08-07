import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
