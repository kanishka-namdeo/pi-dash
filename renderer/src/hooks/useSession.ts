import { useState, useCallback, useEffect, useRef } from 'react';
import type { SessionState } from '../../src/shared/types';

export function useSession(agentId: string): {
  state: SessionState;
  pid: number | null;
  spawn: (cwd: string) => Promise<void>;
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  destroy: () => void;
} {
  const [state, setState] = useState<SessionState>('idle');
  const [pid, setPid] = useState<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const spawn = useCallback(async (cwd: string) => {
    const result = await window.api.session.create(agentId, cwd);
    if ('error' in result) {
      throw new Error(result.error);
    }
    setState('running');
    setPid(result.pid);
  }, [agentId]);

  const write = useCallback((data: string) => {
    if (stateRef.current !== 'running') return;
    window.api.session.write(agentId, data);
  }, [agentId]);

  const resize = useCallback((cols: number, rows: number) => {
    if (stateRef.current !== 'running') return;
    window.api.session.resize(agentId, cols, rows);
  }, [agentId]);

  const destroy = useCallback(() => {
    window.api.session.destroy(agentId);
    setState('exited');
    setPid(null);
  }, [agentId]);

  useEffect(() => {
    const unsubData = window.api.session.onData((evtAgentId, data) => {
      if (evtAgentId === agentId) {
        // Data events just flow through; TerminalView handles display
      }
    });

    const unsubExit = window.api.session.onExit((evtAgentId, exitCode) => {
      if (evtAgentId === agentId) {
        setState('exited');
        setPid(null);
      }
    });

    return () => {
      unsubData();
      unsubExit();
    };
  }, [agentId]);

  return { state, pid, spawn, write, resize, destroy };
}
