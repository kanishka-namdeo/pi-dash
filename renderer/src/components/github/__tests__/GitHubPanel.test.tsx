import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GitHubPanel } from '../GitHubPanel';
import { GitHubProvider } from '../../../context/GitHubContext';

const mockGitHub = {
  auth: {
    getState: vi.fn().mockResolvedValue({ isAuthenticated: false, user: null, method: null }),
    startOAuth: vi.fn().mockResolvedValue({ success: true }),
    loginWithPAT: vi.fn().mockResolvedValue({ success: true }),
    logout: vi.fn().mockResolvedValue({ success: true }),
  },
  repos: {
    getAll: vi.fn().mockResolvedValue({ repos: [], activeRepo: null }),
    add: vi.fn(),
    remove: vi.fn().mockResolvedValue({ success: true }),
    setActive: vi.fn().mockResolvedValue({ success: true }),
  },
  data: {
    fetchIssues: vi.fn().mockResolvedValue([]),
    fetchPRs: vi.fn().mockResolvedValue([]),
    fetchBranches: vi.fn().mockResolvedValue([]),
  },
  issues: { create: vi.fn(), comment: vi.fn() },
  prs: { create: vi.fn(), review: vi.fn() },
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'api', {
    value: {
      github: mockGitHub,
      worktree: { list: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}) },
      agentGitHub: { assign: vi.fn().mockResolvedValue({ success: true }) },
    },
    writable: true,
    configurable: true,
  });
});

describe('GitHubPanel', () => {
  it('shows message when no repo selected', async () => {
    render(
      <GitHubProvider>
        <GitHubPanel />
      </GitHubProvider>
    );
    expect(await screen.findByText(/No repository selected/i)).toBeInTheDocument();
  });
});
