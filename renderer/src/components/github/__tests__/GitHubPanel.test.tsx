import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GitHubPanel } from '../GitHubPanel';
import { GitHubProvider } from '../../../context/GitHubContext';

const mockGitHub = {
  authGetUser: vi.fn<() => Promise<unknown>>(),
  authOAuth: vi.fn<() => Promise<{ success: boolean }>>(),
  authPAT: vi.fn<(token: string) => Promise<{ success: boolean }>>(),
  authLogout: vi.fn<() => Promise<{ success: true }>>(),
  repoList: vi.fn<() => Promise<unknown[]>>(),
  repoAdd: vi.fn(),
  repoRemove: vi.fn<(id: number) => Promise<{ success: true }>>(),
  repoGetActive: vi.fn<() => Promise<unknown>>(),
  repoSetActive: vi.fn<(id: number) => Promise<{ success: true }>>(),
  dataIssues: vi.fn<() => Promise<unknown[]>>(),
  dataPRs: vi.fn<() => Promise<unknown[]>>(),
};

beforeEach(() => {
  vi.clearAllMocks();

  mockGitHub.authGetUser.mockResolvedValue(null);
  mockGitHub.authOAuth.mockResolvedValue({ success: true });
  mockGitHub.authPAT.mockResolvedValue({ success: true });
  mockGitHub.authLogout.mockResolvedValue({ success: true });
  mockGitHub.repoList.mockResolvedValue([]);
  mockGitHub.repoGetActive.mockResolvedValue(null);
  mockGitHub.repoSetActive.mockResolvedValue({ success: true });
  mockGitHub.dataIssues.mockResolvedValue([]);
  mockGitHub.dataPRs.mockResolvedValue([]);

  Object.defineProperty(window, 'api', {
    value: { github: mockGitHub },
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
