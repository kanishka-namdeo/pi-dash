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
  authGetUser: vi.fn<() => Promise<unknown>>(),
  authOAuth: vi.fn<() => Promise<{ success: boolean }>>(),
  authPAT: vi.fn<(token: string) => Promise<{ success: boolean }>>(),
  authLogout: vi.fn<() => Promise<{ success: true }>>(),
  repoList: vi.fn<() => Promise<typeof mockRepo[]>>(),
  repoAdd: vi.fn<(owner: string, name: string, localPath: string) => Promise<typeof mockRepo>>(),
  repoRemove: vi.fn<(id: number) => Promise<{ success: true }>>(),
  repoGetActive: vi.fn<() => Promise<typeof mockRepo | null>>(),
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
  mockGitHub.repoAdd.mockResolvedValue(mockRepo);
  mockGitHub.repoRemove.mockResolvedValue({ success: true });
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
    mockGitHub.authGetUser.mockResolvedValue(mockUser);
    mockGitHub.repoList.mockResolvedValue([mockRepo]);

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
    mockGitHub.authGetUser.mockResolvedValue(mockUser);
    mockGitHub.repoList.mockResolvedValue([]);

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
    mockGitHub.authGetUser.mockResolvedValue(mockUser);

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
      expect(mockGitHub.authLogout).toHaveBeenCalled();
    });
  });

  it('calls removeRepo when trash button clicked', async () => {
    mockGitHub.authGetUser.mockResolvedValue(mockUser);
    mockGitHub.repoList.mockResolvedValue([mockRepo]);

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
      expect(mockGitHub.repoRemove).toHaveBeenCalledWith(1);
    });
  });
});
