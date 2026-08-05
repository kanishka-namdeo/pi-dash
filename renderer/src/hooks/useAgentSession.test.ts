import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAgentSession } from './useAgentSession';

describe('useAgentSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useAgentSession('claude'));
    expect(result.current.state).toBe('idle');
  });

  it('transitions to working when submitting command', () => {
    const { result } = renderHook(() => useAgentSession('claude'));

    act(() => {
      result.current.submitCommand('help');
    });

    expect(result.current.state).toBe('working');
  });

  it('can pause and resume', () => {
    const { result } = renderHook(() => useAgentSession('claude'));

    act(() => {
      result.current.submitCommand('help');
    });

    expect(result.current.state).toBe('working');

    act(() => {
      result.current.pause();
    });

    expect(result.current.state).toBe('paused');

    act(() => {
      result.current.resume();
    });

    expect(result.current.state).toBe('waiting');
  });

  it('can kill a session', () => {
    const { result } = renderHook(() => useAgentSession('claude'));

    act(() => {
      result.current.submitCommand('help');
    });

    expect(result.current.state).toBe('working');

    act(() => {
      result.current.kill();
    });

    expect(result.current.state).toBe('killed');
  });

  it('can restart a session', () => {
    const { result } = renderHook(() => useAgentSession('claude'));

    act(() => {
      result.current.submitCommand('help');
    });

    expect(result.current.state).toBe('working');

    act(() => {
      result.current.restart();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.blocks).toEqual([]);
  });

  it('clears history', () => {
    const { result } = renderHook(() => useAgentSession('claude'));

    act(() => {
      result.current.submitCommand('help');
    });

    act(() => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.blocks).toEqual([]);
  });

  it('sets input', () => {
    const { result } = renderHook(() => useAgentSession('claude'));

    act(() => {
      result.current.setInput('hello');
    });

    expect(result.current.currentInput).toBe('hello');
  });

  it('toggles collapse', () => {
    const { result } = renderHook(() => useAgentSession('claude'));

    act(() => {
      result.current.submitCommand('help');
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.blocks.length).toBeGreaterThan(0);
    const blockId = result.current.blocks[0].id;

    act(() => {
      result.current.toggleCollapse(blockId);
    });

    expect(result.current.blocks[0].isCollapsed).toBe(true);

    act(() => {
      result.current.toggleCollapse(blockId);
    });

    expect(result.current.blocks[0].isCollapsed).toBe(false);
  });

  it('navigates command history back', () => {
    const { result } = renderHook(() => useAgentSession('claude'));

    act(() => {
      result.current.submitCommand('cmd1');
    });
    act(() => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.submitCommand('cmd2');
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.blocks.length).toBe(2);

    let cmd: string | null;
    act(() => {
      cmd = result.current.historyBack();
    });
    expect(cmd).toBe('cmd2');

    act(() => {
      cmd = result.current.historyBack();
    });
    expect(cmd).toBe('cmd1');
  });

  it('navigates command history forward', () => {
    const { result } = renderHook(() => useAgentSession('claude'));

    act(() => {
      result.current.submitCommand('cmd1');
    });
    act(() => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.submitCommand('cmd2');
    });
    act(() => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.historyBack();
    });
    // At cmd2 now

    act(() => {
      result.current.historyBack();
    });
    // At cmd1 now

    let cmd: string | null;
    act(() => {
      cmd = result.current.historyForward();
    });
    expect(cmd).toBe('cmd2');

    act(() => {
      cmd = result.current.historyForward();
    });
    expect(cmd).toBe('');
  });

  it('returns null for historyBack with no commands', () => {
    const { result } = renderHook(() => useAgentSession('claude'));

    let cmd: string | null = 'not null';
    act(() => {
      cmd = result.current.historyBack();
    });
    expect(cmd).toBe(null);
  });

  it('restores persisted session on initialization', () => {
    const savedSession = {
      state: 'waiting' as const,
      history: [
        {
          id: 'test-id',
          command: 'help',
          timestamp: Date.now(),
          output: 'help output',
          isMultiLine: false,
        },
      ],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    localStorage.setItem('pidash:session:claude', JSON.stringify(savedSession));

    const { result } = renderHook(() => useAgentSession('claude'));

    expect(result.current.state).toBe('waiting');
    expect(result.current.blocks.length).toBe(1);
    expect(result.current.blocks[0].command).toBe('help');
    expect(result.current.blocks[0].isCollapsed).toBe(false);
  });

  it('restores working state as waiting', () => {
    const savedSession = {
      state: 'working' as const,
      history: [],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    localStorage.setItem('pidash:session:claude', JSON.stringify(savedSession));

    const { result } = renderHook(() => useAgentSession('claude'));

    expect(result.current.state).toBe('waiting');
  });

  it('does not submit command when already working', () => {
    const { result } = renderHook(() => useAgentSession('claude'));

    act(() => {
      result.current.submitCommand('help');
    });
    expect(result.current.state).toBe('working');

    // Second submit should be ignored
    act(() => {
      result.current.submitCommand('ignored');
    });
    expect(result.current.state).toBe('working');
  });
});
