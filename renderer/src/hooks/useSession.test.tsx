import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSession } from './useSession';
import { SessionProvider, useSessionContext } from '../context/SessionContext';
import { PiPProvider, usePiPContext } from '../context/PiPContext';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PiPProvider>{children}</PiPProvider>
    </SessionProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
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

  it('prevents duplicate spawn when session is already running', async () => {
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

    const createFn = window.api.session.create as ReturnType<typeof vi.fn>;
    const initialCallCount = createFn.mock.calls.length;

    await act(async () => {
      await result.current.session.spawn('/home/user');
    });

    expect(createFn.mock.calls.length).toBe(initialCallCount);
    expect(result.current.session.state).toBe('running');
  });

  it('shows error toast when session creation fails', async () => {
    (window.api.session.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: 'Agent binary not found',
    });

    const { result } = renderHook(
      () => {
        const session = useSession('pi');
        const ctx = useSessionContext();
        return { session, ctx };
      },
      { wrapper },
    );

    await expect(
      act(async () => {
        await result.current.session.spawn('/home/user');
      }),
    ).rejects.toThrow('Agent binary not found');

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Agent binary not found'),
    );
  });

  it('clears mainAgentId when session exits', async () => {
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
        const pip = usePiPContext();
        return { session, ctx, pip };
      },
      { wrapper },
    );

    await act(async () => {
      await result.current.session.spawn('/home/user');
    });

    act(() => {
      result.current.pip.actions.setMainAgent('pi');
    });

    expect(result.current.pip.state.mainAgentId).toBe('pi');

    act(() => {
      exitCallback!('pi', 0);
    });

    expect(result.current.pip.state.mainAgentId).toBeNull();
  });

  it('shows error toast on non-zero exit code', async () => {
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
        return { session };
      },
      { wrapper },
    );

    await act(async () => {
      await result.current.session.spawn('/home/user');
    });

    act(() => {
      exitCallback!('pi', 1);
    });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('exited unexpectedly with code 1'),
    );
  });
});
