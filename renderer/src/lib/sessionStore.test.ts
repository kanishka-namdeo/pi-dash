import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, loadSession } from './sessionStore';
import type { SessionData } from '../types/session';

describe('sessionStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads session', () => {
    const session: SessionData = {
      state: 'waiting',
      history: [
        {
          id: '1',
          command: 'help',
          timestamp: Date.now(),
          output: 'help output',
          isMultiLine: false,
        },
      ],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    saveSession('claude', session);
    const loaded = loadSession('claude');

    expect(loaded).toEqual(session);
  });

  it('returns null when session does not exist', () => {
    expect(loadSession('nonexistent')).toBeNull();
  });

  it('returns null when JSON parsing fails', () => {
    localStorage.setItem('pidash:session:corrupt', 'not json');
    expect(loadSession('corrupt')).toBeNull();
  });

  it('enforces max 1000 blocks', () => {
    const history = Array.from({ length: 1005 }, (_, i) => ({
      id: String(i),
      command: `cmd${i}`,
      timestamp: Date.now(),
      output: `output${i}`,
      isMultiLine: false,
    }));

    const session: SessionData = {
      state: 'waiting',
      history,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    saveSession('claude', session);
    const loaded = loadSession('claude');

    expect(loaded?.history.length).toBe(1000);
    expect(loaded?.history[0].id).toBe('5');
  });

  it('keeps most recent blocks on FIFO eviction', () => {
    const history = Array.from({ length: 3 }, (_, i) => ({
      id: String(i),
      command: `cmd${i}`,
      timestamp: Date.now(),
      output: `output${i}`,
      isMultiLine: false,
    }));

    const session: SessionData = {
      state: 'working',
      history,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    saveSession('test', session);
    const loaded = loadSession('test');

    expect(loaded?.history.length).toBe(3);
    expect(loaded?.history.map((h) => h.id)).toEqual(['0', '1', '2']);
  });

  it('isolates sessions by agentId', () => {
    const s1: SessionData = {
      state: 'idle',
      history: [{ id: 'a', command: 'cmd1', timestamp: 1, output: 'out', isMultiLine: false }],
      createdAt: 1,
      lastActiveAt: 1,
    };
    const s2: SessionData = {
      state: 'working',
      history: [{ id: 'b', command: 'cmd2', timestamp: 2, output: 'out', isMultiLine: false }],
      createdAt: 2,
      lastActiveAt: 2,
    };

    saveSession('agent1', s1);
    saveSession('agent2', s2);

    expect(loadSession('agent1')).toEqual(s1);
    expect(loadSession('agent2')).toEqual(s2);
  });
});
