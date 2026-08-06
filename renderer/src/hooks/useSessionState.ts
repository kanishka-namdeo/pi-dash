import { useState, useEffect } from 'react';
import type { SessionInfo } from '../../../src/shared/types';

export function useSessionState() {
  const [sessions, setSessions] = useState<Map<string, SessionInfo>>(new Map());

  useEffect(() => {
    async function fetchSessions() {
      if (!window.api) return;

      try {
        const sessionList = await window.api.session.list();
        if ('error' in sessionList) {
          console.error('Failed to fetch sessions:', sessionList.error);
          return;
        }

        const sessionMap = new Map<string, SessionInfo>();
        for (const session of sessionList) {
          sessionMap.set(session.agentId, session);
        }
        setSessions(sessionMap);
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      }
    }

    fetchSessions();

    // Subscribe to session events
    if (!window.api) return;

    const unsubData = window.api.session.onData((agentId) => {
      // Session is active, update state
      setSessions((prev) => {
        const next = new Map(prev);
        const existing = next.get(agentId);
        if (existing && existing.state === 'idle') {
          next.set(agentId, { ...existing, state: 'running' });
        }
        return next;
      });
    });

    const unsubExit = window.api.session.onExit((agentId, exitCode) => {
      setSessions((prev) => {
        const next = new Map(prev);
        const existing = next.get(agentId);
        if (existing) {
          next.set(agentId, { ...existing, state: 'exited', exitCode });
        }
        return next;
      });
    });

    return () => {
      unsubData();
      unsubExit();
    };
  }, []);

  return { sessions };
}
