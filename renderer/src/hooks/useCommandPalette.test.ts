import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandPalette } from './useCommandPalette';

vi.mock('../context/SessionContext', () => ({
  useSessionContext: () => ({
    sessions: new Map(),
    getActiveSessions: () => [],
    registerSession: vi.fn(),
  }),
}));

vi.mock('../context/GitHubContext', () => ({
  useGitHub: () => ({
    repos: [],
    prs: [],
    branches: [],
  }),
}));

vi.mock('./useAgents', () => ({
  useAgents: () => ({
    agents: [],
    loading: false,
    error: null,
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('useCommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'api', {
      value: {
        search: {
          getRecent: vi.fn().mockResolvedValue([]),
          addRecent: vi.fn().mockResolvedValue({ success: true }),
          clearRecent: vi.fn().mockResolvedValue({ success: true }),
        },
        onShortcut: vi.fn(() => vi.fn()),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts closed', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);
  });

  it('opens via open()', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it('closes via close()', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('loads recent searches on mount', async () => {
    const { result } = renderHook(() => useCommandPalette());
    await act(async () => {
      await Promise.resolve();
    });
    expect(window.api.search.getRecent).toHaveBeenCalled();
  });
});
