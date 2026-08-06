const PREFIX = 'pidash:session-state:';

export type PersistedSession = { state: 'running' | 'exited'; cwd: string };

export function saveSessionState(agentId: string, session: PersistedSession): void {
  const key = PREFIX + agentId;
  localStorage.setItem(key, JSON.stringify(session));
}

export function loadSessionState(agentId: string): PersistedSession | null {
  const key = PREFIX + agentId;
  const data = localStorage.getItem(key);
  if (!data) return null;

  try {
    return JSON.parse(data) as PersistedSession;
  } catch {
    return null;
  }
}
