import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GitHubSettings } from '../GitHubSettings';
import { GitHubProvider } from '../../../context/GitHubContext';

const mockRepo = {
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
    getState: vi.fn().mockResolvedValue({ isAuthenticated: false, user: null, method: null }),
    startOAuth: vi.fn().mockResolvedValue({ success: true }),
    loginWithPAT: vi.fn().mockResolvedValue({ success: true }),
    logout: vi.fn().mockResolvedValue({ success: true }),
  },
  repos: {
    getAll: vi.fn().mockResolvedValue({ repos: [], activeRepo: null }),
    add: vi.fn().mockResolvedValue(mockRepo),
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

describe('GitHubSettings', () => {
  it('renders auth options when not authenticated', async () => {
    render(
      <GitHubProvider>
        <GitHubSettings />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Connect with GitHub/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Personal Access Token/i)).toBeInTheDocument();
  });

  it('shows PAT input when clicking PAT button', async () => {
    render(
      <GitHubProvider>
        <GitHubSettings />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Connect with GitHub/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Personal Access Token/i));
    expect(screen.getByPlaceholderText(/ghp_/i)).toBeInTheDocument();
  });

  it('renders user info and repos when authenticated', async () => {
    mockGitHub.auth.getState.mockResolvedValue({ isAuthenticated: true, user: mockUser, method: 'pat' });
    mockGitHub.repos.getAll.mockResolvedValue({ repos: [mockRepo], activeRepo: mockRepo });

    render(
      <GitHubProvider>
        <GitHubSettings />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
    expect(screen.getByText(/Repositories/i)).toBeInTheDocument();
    expect(screen.getByText('testowner/testrepo')).toBeInTheDocument();
  });

  it('shows empty state when no repos configured', async () => {
    mockGitHub.auth.getState.mockResolvedValue({ isAuthenticated: true, user: mockUser, method: 'pat' });
    mockGitHub.repos.getAll.mockResolvedValue({ repos: [], activeRepo: null });

    render(
      <GitHubProvider>
        <GitHubSettings />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });
    expect(screen.getByText(/No repositories configured/i)).toBeInTheDocument();
  });

  it('calls logout when logout button clicked', async () => {
    mockGitHub.auth.getState.mockResolvedValue({ isAuthenticated: true, user: mockUser, method: 'pat' });

    render(
      <GitHubProvider>
        <GitHubSettings />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Logout/i));
    await waitFor(() => {
      expect(mockGitHub.auth.logout).toHaveBeenCalled();
    });
  });

  it('calls removeRepo when trash button clicked', async () => {
    mockGitHub.auth.getState.mockResolvedValue({ isAuthenticated: true, user: mockUser, method: 'pat' });
    mockGitHub.repos.getAll.mockResolvedValue({ repos: [mockRepo], activeRepo: mockRepo });

    render(
      <GitHubProvider>
        <GitHubSettings />
      </GitHubProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('testowner/testrepo')).toBeInTheDocument();
    });

    const trashButtons = screen.getAllByRole('button');
    const trashButton = trashButtons.find(btn => btn.querySelector('svg.lucide-trash-2'));
    expect(trashButton).toBeDefined();
    fireEvent.click(trashButton!);

    await waitFor(() => {
      expect(mockGitHub.repos.remove).toHaveBeenCalledWith(1);
    });
  });
});
