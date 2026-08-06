import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { SessionState } from '../../src/shared/types';
import { useSessionContext } from '../context/SessionContext';
import { usePiPContext } from '../context/PiPContext';

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
  const sessionContext = useSessionContext();
  const pipContext = usePiPContext();

  const spawn = useCallback(async (cwd: string) => {
    const existing = sessionContext.getSession(agentId);
    if (existing && existing.state === 'running') {
      return;
    }
    try {
      const result = await window.api.session.create(agentId, cwd);
      if ('error' in result) {
        toast.error(`Failed to start ${agentId}: ${result.error}`);
        throw new Error(result.error);
      }
      setState('running');
      setPid(result.pid);
      sessionContext.registerSession(agentId, result.pid, cwd);
    } catch (err) {
      if (!(err instanceof Error && err.message.startsWith('Failed to start'))) {
        toast.error(`Failed to start ${agentId}: ${err instanceof Error ? err.message : String(err)}`);
      }
      throw err;
    }
  }, [agentId, sessionContext]);

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
    sessionContext.unregisterSession(agentId);
  }, [agentId, sessionContext]);

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
        sessionContext.updateSessionState(agentId, 'exited');
        if (pipContext.state.mainAgentId === agentId) {
          pipContext.actions.setMainAgent(null);
        }
        if (exitCode !== null && exitCode !== 0) {
          toast.error(`${agentId} exited unexpectedly with code ${exitCode}`);
        }
      }
    });

    return () => {
      unsubData();
      unsubExit();
    };
  }, [agentId, sessionContext, pipContext]);

  return { state, pid, spawn, write, resize, destroy };
}
