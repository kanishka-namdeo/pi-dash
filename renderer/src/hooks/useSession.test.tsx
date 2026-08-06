import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSession } from './useSession';
import { SessionProvider, useSessionContext } from '../context/SessionContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

beforeEach(() => {
  vi.stubGlobal('window', {
    api: {
      session: {
        create: vi.fn().mockResolvedValue({ pid: 1234, state: 'running' }),
        write: vi.fn(),
        resize: vi.fn(),
        destroy: vi.fn(),
        onData: vi.fn().mockReturnValue(() => {}),
        onExit: vi.fn().mockReturnValue(() => {}),
      },
    },
  });
});

describe('useSession with SessionContext', () => {
  it('registers session with context after spawn', async () => {
    // Use a combined hook so useSession and useSessionContext share the same provider tree
    const { result } = renderHook(
      () => {
        const session = useSession('pi');
        const ctx = useSessionContext();
        return { session, ctx };
      },
      { wrapper },
    );

    await act(async () => {
      await result.current.session.spawn('/home/user');
    });

    expect(result.current.session.state).toBe('running');
    expect(result.current.session.pid).toBe(1234);
    expect(result.current.ctx.getSession('pi')).toBeDefined();
    expect(result.current.ctx.getSession('pi')!.pid).toBe(1234);
    expect(result.current.ctx.getActiveSessions().length).toBe(1);
  });

  it('unregisters session from context on destroy', async () => {
    const { result } = renderHook(
      () => {
        const session = useSession('pi');
        const ctx = useSessionContext();
        return { session, ctx };
      },
      { wrapper },
    );

    await act(async () => {
      await result.current.session.spawn('/home/user');
    });

    act(() => {
      result.current.session.destroy();
    });

    expect(result.current.ctx.getSession('pi')).toBeUndefined();
    expect(result.current.ctx.getActiveSessions().length).toBe(0);
  });

  it('updates session state to exited on exit event', async () => {
    let exitCallback: ((agentId: string, code: number) => void) | null = null;
    (window.api.session.onExit as ReturnType<typeof vi.fn>).mockImplementation(
      (cb: (agentId: string, code: number) => void) => {
        exitCallback = cb;
        return () => {};
      },
    );

    const { result } = renderHook(
      () => {
        const session = useSession('pi');
        const ctx = useSessionContext();
        return { session, ctx };
      },
      { wrapper },
    );

    await act(async () => {
      await result.current.session.spawn('/home/user');
    });

    act(() => {
      exitCallback!('pi', 0);
    });

    expect(result.current.session.state).toBe('exited');
    expect(result.current.ctx.getSession('pi')!.state).toBe('exited');
  });
});
