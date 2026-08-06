import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePiP } from './usePiP';

describe('usePiP', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => usePiP());
    expect(result.current.state.mainAgentId).toBeNull();
    expect(result.current.state.overlays).toEqual([]);
    expect(result.current.state.nextZIndex).toBe(10);
  });
  it('prevents adding duplicate overlay when agent is main', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.setMainAgent('agent-1');
    });
    act(() => {
      result.current.actions.addOverlay('agent-1');
    });
    expect(result.current.state.overlays).toEqual([]);
  });

  it('prevents adding duplicate overlay when already in overlays', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.addOverlay('agent-1');
    });
    act(() => {
      result.current.actions.addOverlay('agent-1');
    });
    expect(result.current.state.overlays).toHaveLength(1);
  });

  it('adds overlay with default position and size', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.addOverlay('agent-1');
    });
    expect(result.current.state.overlays).toHaveLength(1);
    expect(result.current.state.overlays[0].agentId).toBe('agent-1');
    expect(result.current.state.overlays[0].size).toBe('M');
    expect(result.current.state.overlays[0].width).toBe(400);
    expect(result.current.state.overlays[0].height).toBe(260);
  });
  it('promotes overlay to main and demotes current main to overlay', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.setMainAgent('agent-1');
      result.current.actions.addOverlay('agent-2');
    });
    act(() => {
      result.current.actions.promoteToMain('agent-2');
    });
    expect(result.current.state.mainAgentId).toBe('agent-2');
    expect(result.current.state.overlays).toHaveLength(1);
    expect(result.current.state.overlays[0].agentId).toBe('agent-1');
  });

  it('promotes overlay to main when no current main', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.addOverlay('agent-1');
    });
    act(() => {
      result.current.actions.promoteToMain('agent-1');
    });
    expect(result.current.state.mainAgentId).toBe('agent-1');
    expect(result.current.state.overlays).toHaveLength(0);
  });
  it('brings overlay to front by incrementing z-index', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.addOverlay('agent-1');
      result.current.actions.addOverlay('agent-2');
    });
    const initialZ1 = result.current.state.overlays[0].zIndex;
    const initialZ2 = result.current.state.overlays[1].zIndex;
    expect(initialZ2).toBeGreaterThan(initialZ1);

    act(() => {
      result.current.actions.bringOverlayToFront('agent-1');
    });
    const newZ1 = result.current.state.overlays[0].zIndex;
    expect(newZ1).toBeGreaterThan(initialZ2);
  });
  it('starts with dashboard viewMode', () => {
    const { result } = renderHook(() => usePiP());
    expect(result.current.state.viewMode).toBe('dashboard');
  });

  it('toggles viewMode from dashboard to terminal', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.toggleViewMode();
    });
    expect(result.current.state.viewMode).toBe('terminal');
  });

  it('toggles viewMode from terminal back to dashboard', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.toggleViewMode();
      result.current.actions.toggleViewMode();
    });
    expect(result.current.state.viewMode).toBe('dashboard');
  });

  it('sets viewMode directly', () => {
    const { result } = renderHook(() => usePiP());
    act(() => {
      result.current.actions.setViewMode('terminal');
    });
    expect(result.current.state.viewMode).toBe('terminal');

    act(() => {
      result.current.actions.setViewMode('dashboard');
    });
    expect(result.current.state.viewMode).toBe('dashboard');
  });
});
