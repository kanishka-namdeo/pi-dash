import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectSetupState } from '../useProjectSetupState';

describe('useProjectSetupState', () => {
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
});
