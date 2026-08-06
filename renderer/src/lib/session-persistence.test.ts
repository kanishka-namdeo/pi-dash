import { describe, it, expect, beforeEach } from 'vitest';
import { saveSessionState, loadSessionState } from './session-persistence';

describe('session-persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads session state', () => {
    const session = { state: 'running' as const, cwd: '/tmp/project' };
    saveSessionState('claude', session);
    const loaded = loadSessionState('claude');
    expect(loaded).toEqual(session);
  });

  it('returns null when session does not exist', () => {
    expect(loadSessionState('nonexistent')).toBeNull();
  });

  it('returns null when JSON parsing fails', () => {
    localStorage.setItem('pidash:session-state:corrupt', 'not json');
    expect(loadSessionState('corrupt')).toBeNull();
  });

  it('isolates sessions by agentId', () => {
    saveSessionState('agent1', { state: 'running', cwd: '/path1' });
    saveSessionState('agent2', { state: 'exited', cwd: '/path2' });

    expect(loadSessionState('agent1')).toEqual({ state: 'running', cwd: '/path1' });
    expect(loadSessionState('agent2')).toEqual({ state: 'exited', cwd: '/path2' });
  });

  it('overwrites existing session state', () => {
    saveSessionState('test', { state: 'running', cwd: '/path1' });
    saveSessionState('test', { state: 'exited', cwd: '/path2' });

    expect(loadSessionState('test')).toEqual({ state: 'exited', cwd: '/path2' });
  });
});
