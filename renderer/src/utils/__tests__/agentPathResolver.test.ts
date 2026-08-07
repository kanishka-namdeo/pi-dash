import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveAgentPath } from '../agentPathResolver';

describe('resolveAgentPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a path string for known agent claude', async () => {
    const path = await resolveAgentPath('claude');
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('returns a path string for known agent cursor', async () => {
    const path = await resolveAgentPath('cursor');
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('returns a path string for known agent aider', async () => {
    const path = await resolveAgentPath('aider');
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('returns a path string for known agent omp', async () => {
    const path = await resolveAgentPath('omp');
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('returns a path string for known agent copilot', async () => {
    const path = await resolveAgentPath('copilot');
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('returns default path for unknown agent', async () => {
    const path = await resolveAgentPath('unknown-agent');
    expect(typeof path).toBe('string');
  });
});
