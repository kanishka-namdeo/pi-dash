import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnboardingState } from './useOnboardingState';

describe('useOnboardingState', () => {
  it('initializes with welcome screen', () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.currentScreen).toBe('welcome');
  });

  it('initializes with empty agents list', () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.agents).toEqual([]);
  });

  it('initializes with empty selectedAgents', () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.selectedAgents).toEqual([]);
  });

  it('navigates to scanning screen', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.navigateTo('scanning');
    });
    expect(result.current.currentScreen).toBe('scanning');
  });

  it('navigates to results screen', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.navigateTo('results');
    });
    expect(result.current.currentScreen).toBe('results');
  });

  it('adds detected agents', () => {
    const { result } = renderHook(() => useOnboardingState());
    const agents = [
      { id: 'omp', name: 'Oh My Pi', icon: 'omp', path: '/usr/bin/omp', source: 'detected' as const },
    ];
    act(() => {
      result.current.setAgents(agents);
    });
    expect(result.current.agents).toEqual(agents);
  });

  it('adds manual agent', () => {
    const { result } = renderHook(() => useOnboardingState());
    const agent = {
      id: 'custom-agent',
      name: 'Custom Agent',
      icon: 'generic',
      path: '/usr/local/bin/custom',
      source: 'manual' as const,
    };
    act(() => {
      result.current.addAgent(agent);
    });
    expect(result.current.agents).toContainEqual(agent);
  });

  it('toggles agent selection', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.toggleAgent('omp');
    });
    expect(result.current.selectedAgents).toContain('omp');
    
    act(() => {
      result.current.toggleAgent('omp');
    });
    expect(result.current.selectedAgents).not.toContain('omp');
  });

  it('selects all agents', () => {
    const { result } = renderHook(() => useOnboardingState());
    const agents = [
      { id: 'omp', name: 'Oh My Pi', icon: 'omp', path: '/usr/bin/omp', source: 'detected' as const },
      { id: 'cursor', name: 'Cursor', icon: 'cursor', path: '/usr/bin/cursor', source: 'detected' as const },
    ];
    act(() => {
      result.current.setAgents(agents);
    });
    act(() => {
      result.current.selectAll();
    });
    expect(result.current.selectedAgents).toEqual(['omp', 'cursor']);
  });

  it('deselects all agents', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.toggleAgent('omp');
      result.current.toggleAgent('cursor');
      result.current.deselectAll();
    });
    expect(result.current.selectedAgents).toEqual([]);
  });
});
