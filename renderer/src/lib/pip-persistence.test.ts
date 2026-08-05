import { describe, it, expect, beforeEach } from 'vitest';
import { savePiPState, loadPiPState, clearPiPState, PIP_STORAGE_KEY } from './pip-persistence';

describe('pip-persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads PiP state', () => {
    const state = {
      mainAgentId: 'main',
      overlays: [{ agentId: 'worker', x: 10, y: 20, width: 300, height: 200 }],
    };
    savePiPState(state);
    expect(loadPiPState()).toEqual(state);
  });

  it('returns null when no state saved', () => {
    expect(loadPiPState()).toBeNull();
  });

  it('returns null when JSON is corrupt', () => {
    localStorage.setItem(PIP_STORAGE_KEY, 'not json');
    expect(loadPiPState()).toBeNull();
  });

  it('clears PiP state', () => {
    savePiPState({ mainAgentId: 'main', overlays: [] });
    clearPiPState();
    expect(loadPiPState()).toBeNull();
  });
});
