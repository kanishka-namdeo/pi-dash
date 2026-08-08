import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectSetupState } from '../useProjectSetupState';

describe('useProjectSetupState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'api', {
      value: {
        addProject: vi.fn().mockResolvedValue(undefined),
        isGitRepo: vi.fn().mockResolvedValue(true),
      },
      writable: true,
    });
  });

  it('starts at project-selection in full mode', () => {
    const { result } = renderHook(() => useProjectSetupState('full'));
    expect(result.current.currentScreen).toBe('project-selection');
    expect(result.current.flowMode).toBe('full');
  });

  it('starts at project-selection in condensed mode', () => {
    const { result } = renderHook(() => useProjectSetupState('condensed'));
    expect(result.current.currentScreen).toBe('project-selection');
    expect(result.current.flowMode).toBe('condensed');
  });

  it('navigates to next screen', () => {
    const { result } = renderHook(() => useProjectSetupState('full'));

    act(() => {
      result.current.navigate('clone-repository');
    });

    expect(result.current.currentScreen).toBe('clone-repository');
  });

  it('updates project path', () => {
    const { result } = renderHook(() => useProjectSetupState('full'));

    act(() => {
      result.current.updateProject('/path/to/project');
    });

    expect(result.current.projectPath).toBe('/path/to/project');
    expect(result.current.projectName).toBe('project');
  });

  it('updates selected agents', () => {
    const { result } = renderHook(() => useProjectSetupState('full'));

    act(() => {
      result.current.updateSelectedAgents(['omp', 'claude-code']);
    });

    expect(result.current.selectedAgents).toEqual(['omp', 'claude-code']);
  });

  describe('complete()', () => {
    it('calls addProject and onComplete on success', async () => {
      const { result } = renderHook(() => useProjectSetupState('full'));

      act(() => {
        result.current.updateProject('/path/to/project');
        result.current.updateSelectedAgents(['omp']);
      });

      const onComplete = vi.fn();

      await act(async () => {
        await result.current.complete(onComplete);
      });

      expect(window.api.addProject).toHaveBeenCalledWith(expect.objectContaining({
        path: '/path/to/project',
        name: 'project',
        selectedAgents: ['omp'],
      }));
      expect(window.api.isGitRepo).toHaveBeenCalledWith('/path/to/project');
      expect(onComplete).toHaveBeenCalled();
    });

    it('navigates to project-already-added on PROJECT_ALREADY_EXISTS error', async () => {
      window.api.addProject = vi.fn().mockRejectedValue(new Error('PROJECT_ALREADY_EXISTS'));

      const { result } = renderHook(() => useProjectSetupState('full'));

      act(() => {
        result.current.updateProject('/path/to/project');
      });

      const onComplete = vi.fn();

      await act(async () => {
        await result.current.complete(onComplete);
      });

      expect(window.api.addProject).toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
      expect(result.current.currentScreen).toBe('project-already-added');
    });

    it('calls isGitRepo with projectPath', async () => {
      const { result } = renderHook(() => useProjectSetupState('full'));

      act(() => {
        result.current.updateProject('/some/other/path');
      });

      await act(async () => {
        await result.current.complete();
      });

      expect(window.api.isGitRepo).toHaveBeenCalledWith('/some/other/path');
    });
  });
});
