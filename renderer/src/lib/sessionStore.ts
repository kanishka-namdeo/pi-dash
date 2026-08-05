import type { SessionData } from '../types/session';

const STORAGE_PREFIX = 'pidash:session:';
const MAX_BLOCKS = 1000;

export function saveSession(agentId: string, session: SessionData): void {
  const key = STORAGE_PREFIX + agentId;

  const toStore =
    session.history.length > MAX_BLOCKS
      ? { ...session, history: session.history.slice(-MAX_BLOCKS) }
      : session;

  localStorage.setItem(key, JSON.stringify(toStore));
}

export function loadSession(agentId: string): SessionData | null {
  const key = STORAGE_PREFIX + agentId;
  const data = localStorage.getItem(key);
  if (!data) return null;

  try {
    return JSON.parse(data) as SessionData;
  } catch {
    return null;
  }
}
