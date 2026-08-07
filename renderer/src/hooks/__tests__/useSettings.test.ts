import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from '../useSettings';

const mockSettings = {
  general: { theme: 'dark', language: 'en', fontSize: 'medium' },
  terminal: { fontSize: 14 },
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'api', {
    value: {
      settings: {
        getAll: vi.fn().mockResolvedValue(mockSettings),
        set: vi.fn().mockResolvedValue({ success: true }),
        reset: vi.fn().mockResolvedValue({ success: true }),
      },
    },
    writable: true,
  });
});

describe('useSettings', () => {
  it('loads settings on mount', async () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.settings).toEqual(mockSettings);
  });

  it('calls settings.set with path and value', async () => {
    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.set('general.theme', 'light');
    });

    expect(window.api.settings.set).toHaveBeenCalledWith('general.theme', 'light');
  });
});
