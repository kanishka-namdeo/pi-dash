import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadAgents, saveAgents, completeOnboarding } from './agent-store';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('agent-store', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pidash-test-'));
    process.env.PI_DASH_USER_DATA = testDir;
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    delete process.env.PI_DASH_USER_DATA;
  });

  it('returns empty store when file does not exist', async () => {
    const store = await loadAgents();
    expect(store.agents).toEqual([]);
    expect(store.onboardingCompleted).toBe(false);
  });

  it('saves and loads agents', async () => {
    const agents = [
      {
        id: 'test-1',
        name: 'Test Agent',
        icon: 'generic',
        path: '/test/path',
        source: 'manual' as const,
      },
    ];
    await saveAgents(agents);
    const loaded = await loadAgents();
    expect(loaded.agents).toEqual(agents);
  });

  it('marks onboarding as completed', async () => {
    await completeOnboarding();
    const store = await loadAgents();
    expect(store.onboardingCompleted).toBe(true);
  });

  it('creates parent directory if missing', async () => {
    const nestedDir = path.join(testDir, 'nested', 'dir');
    process.env.PI_DASH_USER_DATA = nestedDir;
    await saveAgents([]);
    const exists = await fs.access(path.join(nestedDir, 'agents.json')).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });
});
