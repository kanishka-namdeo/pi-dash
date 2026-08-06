import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { CommandBlock } from '../types/session';

export type SessionInfo = {
  agentId: string;
  state: 'idle' | 'running' | 'exited';
  pid: number | null;
  cwd: string;
  createdAt: number;
  lastActiveAt: number;
  commandHistory: CommandBlock[];
};

export type SessionContextType = {
  sessions: Map<string, SessionInfo>;
  registerSession: (agentId: string, pid: number, cwd: string) => void;
  unregisterSession: (agentId: string) => void;
  updateSessionState: (agentId: string, state: 'running' | 'exited') => void;
  appendCommand: (agentId: string, command: CommandBlock) => void;
  getSession: (agentId: string) => SessionInfo | undefined;
  getActiveSessions: () => SessionInfo[];
};

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Map<string, SessionInfo>>(new Map());

  const registerSession = useCallback((agentId: string, pid: number, cwd: string) => {
    setSessions(prev => {
      const next = new Map(prev);
      next.set(agentId, {
        agentId,
        state: 'running',
        pid,
        cwd,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        commandHistory: [],
      });
      return next;
    });
  }, []);

  const unregisterSession = useCallback((agentId: string) => {
    setSessions(prev => {
      const next = new Map(prev);
      next.delete(agentId);
      return next;
    });
  }, []);

  const updateSessionState = useCallback((agentId: string, state: 'running' | 'exited') => {
    setSessions(prev => {
      const next = new Map(prev);
      const session = next.get(agentId);
      if (session) {
        next.set(agentId, { ...session, state, lastActiveAt: Date.now() });
      }
      return next;
    });
  }, []);

  const appendCommand = useCallback((agentId: string, command: CommandBlock) => {
    setSessions(prev => {
      const next = new Map(prev);
      const session = next.get(agentId);
      if (session) {
        next.set(agentId, {
          ...session,
          commandHistory: [...session.commandHistory, command],
          lastActiveAt: Date.now(),
        });
      }
      return next;
    });
  }, []);

  const getSession = useCallback(
    (agentId: string) => sessions.get(agentId),
    [sessions],
  );

  const getActiveSessions = useCallback(
    () => Array.from(sessions.values()).filter(s => s.state === 'running'),
    [sessions],
  );

  const value = useMemo(() => ({
    sessions,
    registerSession,
    unregisterSession,
    updateSessionState,
    appendCommand,
    getSession,
    getActiveSessions,
  }), [sessions, registerSession, unregisterSession, updateSessionState, appendCommand, getSession, getActiveSessions]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): SessionContextType {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return context;
}
