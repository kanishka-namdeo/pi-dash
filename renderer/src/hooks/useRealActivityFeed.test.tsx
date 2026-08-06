import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealActivityFeed } from './useRealActivityFeed';
import { SessionProvider, useSessionContext } from '../context/SessionContext';
import type { CommandBlock } from '../types/session';

function wrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

function makeCommand(command: string, timestamp: number): CommandBlock {
  return {
    id: `cmd-${timestamp}`,
    command,
    timestamp,
    output: '',
    isMultiLine: false,
    isCollapsed: false,
  };
}

describe('useRealActivityFeed', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      api: {
        spawnAgent: vi.fn(),
        stopAgent: vi.fn(),
        getAgents: vi.fn().mockResolvedValue([]),
        validateAgent: vi.fn(),
      },
    });
  });

  it('starts with empty events', () => {
    const { result } = renderHook(
      () => useRealActivityFeed(),
      { wrapper },
    );
    expect(result.current.events).toEqual([]);
    expect(result.current.isPaused).toBe(false);
  });

  it('emits session:started when a new session is registered', () => {
    const { result } = renderHook(
      () => {
        const feed = useRealActivityFeed();
        const ctx = useSessionContext();
        return { feed, ctx };
      },
      { wrapper },
    );

    act(() => {
      result.current.ctx.registerSession('agent-1', 1234, '/home/user');
    });

    expect(result.current.feed.events).toHaveLength(1);
    expect(result.current.feed.events[0].type).toBe('session:started');
    expect(result.current.feed.events[0].agentId).toBe('agent-1');
  });

  it('emits session:exited when a session is unregistered', () => {
    const { result } = renderHook(
      () => {
        const feed = useRealActivityFeed();
        const ctx = useSessionContext();
        return { feed, ctx };
      },
      { wrapper },
    );

    act(() => {
      result.current.ctx.registerSession('agent-1', 1234, '/home/user');
    });

    act(() => {
      result.current.ctx.unregisterSession('agent-1');
    });

    const exited = result.current.feed.events.find(e => e.type === 'session:exited');
    expect(exited).toBeDefined();
    expect(exited!.agentId).toBe('agent-1');
  });

  it('emits command event when a command is appended', () => {
    const { result } = renderHook(
      () => {
        const feed = useRealActivityFeed();
        const ctx = useSessionContext();
        return { feed, ctx };
      },
      { wrapper },
    );

    act(() => {
      result.current.ctx.registerSession('agent-1', 1234, '/home/user');
    });

    act(() => {
      result.current.ctx.appendCommand('agent-1', makeCommand('git status', Date.now()));
    });

    const cmdEvent = result.current.feed.events.find(e => e.type === 'command');
    expect(cmdEvent).toBeDefined();
    expect(cmdEvent!.agentId).toBe('agent-1');
    expect(cmdEvent!.command).toBe('git status');
  });

  it('does not emit duplicate command events for the same session', () => {
    const { result } = renderHook(
      () => {
        const feed = useRealActivityFeed();
        const ctx = useSessionContext();
        return { feed, ctx };
      },
      { wrapper },
    );

    act(() => {
      result.current.ctx.registerSession('agent-1', 1234, '/home/user');
    });

    act(() => {
      result.current.ctx.appendCommand('agent-1', makeCommand('git status', 1000));
    });

    act(() => {
      result.current.ctx.appendCommand('agent-1', makeCommand('git diff', 2000));
    });

    const cmdEvents = result.current.feed.events.filter(e => e.type === 'command');
    expect(cmdEvents).toHaveLength(2);
    expect(cmdEvents[0].command).toBe('git status');
    expect(cmdEvents[1].command).toBe('git diff');
  });

  it('enforces max 100 events buffer (oldest evicted)', () => {
    const { result } = renderHook(
      () => {
        const feed = useRealActivityFeed();
        const ctx = useSessionContext();
        return { feed, ctx };
      },
      { wrapper },
    );

    act(() => {
      result.current.ctx.registerSession('agent-1', 1234, '/home/user');
    });

    for (let i = 0; i < 105; i++) {
      act(() => {
        result.current.ctx.appendCommand('agent-1', makeCommand(`cmd-${i}`, 3000 + i));
      });
    }

    expect(result.current.feed.events).toHaveLength(100);
    // FIFO evicts oldest first: session:started + cmd-0..cmd-4 (6 events) dropped
    const cmdEvents = result.current.feed.events.filter(e => e.type === 'command');
    expect(cmdEvents).toHaveLength(100);
    expect(cmdEvents[0].command).toBe('cmd-5');
  });

  it('pause stops adding to visible events but continues capturing', () => {
    const { result } = renderHook(
      () => {
        const feed = useRealActivityFeed();
        const ctx = useSessionContext();
        return { feed, ctx };
      },
      { wrapper },
    );

    act(() => {
      result.current.ctx.registerSession('agent-1', 1234, '/home/user');
    });

    act(() => {
      result.current.feed.pause();
    });

    expect(result.current.feed.isPaused).toBe(true);

    act(() => {
      result.current.ctx.appendCommand('agent-1', makeCommand('paused-cmd', 5000));
    });

    // Visible events should not include the paused command
    const cmdEvents = result.current.feed.events.filter(e => e.type === 'command');
    expect(cmdEvents).toHaveLength(0);
  });

  it('resume flushes pending events to visible', () => {
    const { result } = renderHook(
      () => {
        const feed = useRealActivityFeed();
        const ctx = useSessionContext();
        return { feed, ctx };
      },
      { wrapper },
    );

    act(() => {
      result.current.ctx.registerSession('agent-1', 1234, '/home/user');
    });

    act(() => {
      result.current.feed.pause();
    });

    act(() => {
      result.current.ctx.appendCommand('agent-1', makeCommand('pending-cmd-1', 5001));
    });

    act(() => {
      result.current.ctx.appendCommand('agent-1', makeCommand('pending-cmd-2', 5002));
    });

    act(() => {
      result.current.feed.resume();
    });

    const cmdEvents = result.current.feed.events.filter(e => e.type === 'command');
    expect(cmdEvents).toHaveLength(2);
    expect(cmdEvents[0].command).toBe('pending-cmd-1');
    expect(cmdEvents[1].command).toBe('pending-cmd-2');
  });

  it('clear empties all events', () => {
    const { result } = renderHook(
      () => {
        const feed = useRealActivityFeed();
        const ctx = useSessionContext();
        return { feed, ctx };
      },
      { wrapper },
    );

    act(() => {
      result.current.ctx.registerSession('agent-1', 1234, '/home/user');
    });

    act(() => {
      result.current.ctx.appendCommand('agent-1', makeCommand('cmd-1', 6000));
    });

    expect(result.current.feed.events.length).toBeGreaterThan(0);

    act(() => {
      result.current.feed.clear();
    });

    expect(result.current.feed.events).toEqual([]);
  });
});
