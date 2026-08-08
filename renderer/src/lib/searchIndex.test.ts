import { describe, it, expect } from 'vitest';
import { buildSearchItems, createSearchEngine } from './searchIndex';
import type { SearchIndexConfig } from './searchIndex';

describe('buildSearchItems', () => {
  const emptyConfig: SearchIndexConfig = {
    runningSessions: [],
    availableAgents: [],
    repos: [],
    prs: [],
    branches: [],
  };

  it('returns route items even with empty config', () => {
    const items = buildSearchItems(emptyConfig);
    expect(items.length).toBeGreaterThan(0);
    expect(items.some(i => i.type === 'route')).toBe(true);
  });

  it('includes running agents', () => {
    const config: SearchIndexConfig = {
      ...emptyConfig,
      runningSessions: [{
        agentId: 'claude-code',
        state: 'running',
        pid: 1234,
        cwd: '/projects/test',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        commandHistory: [],
      }],
    };
    const items = buildSearchItems(config);
    const agentItem = items.find(i => i.id === 'agent-running-claude-code');
    expect(agentItem).toBeDefined();
    expect(agentItem?.title).toBe('claude-code');
    expect(agentItem?.icon).toBe('bot');
    expect(agentItem?.iconColor).toBe('$accent-amber');
  });

  it('includes available agents not already running', () => {
    const config: SearchIndexConfig = {
      ...emptyConfig,
      availableAgents: [{
        id: 'aider',
        name: 'Aider',
        icon: 'aider',
        path: '/usr/local/bin/aider',
        source: 'detected',
      }],
    };
    const items = buildSearchItems(config);
    const agentItem = items.find(i => i.id === 'agent-available-aider');
    expect(agentItem).toBeDefined();
    expect(agentItem?.title).toBe('Aider');
    expect(agentItem?.iconColor).toBe('$accent-emerald');
  });

  it('skips available agents that are already running', () => {
    const config: SearchIndexConfig = {
      runningSessions: [{
        agentId: 'aider',
        state: 'running',
        pid: 1234,
        cwd: '/test',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        commandHistory: [],
      }],
      availableAgents: [{
        id: 'aider',
        name: 'Aider',
        icon: 'aider',
        path: '/usr/local/bin/aider',
        source: 'detected',
      }],
      repos: [],
      prs: [],
      branches: [],
    };
    const items = buildSearchItems(config);
    expect(items.find(i => i.id === 'agent-available-aider')).toBeUndefined();
  });
});

describe('createSearchEngine', () => {
  it('finds items by title', () => {
    const items = buildSearchItems({
      runningSessions: [],
      availableAgents: [{
        id: 'claude',
        name: 'Claude Code',
        icon: 'claude',
        path: '/usr/local/bin/claude',
        source: 'detected',
      }],
      repos: [],
      prs: [],
      branches: [],
    });
    const fuse = createSearchEngine(items);
    const results = fuse.search('claude');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.title).toBe('Claude Code');
  });

  it('returns empty for no match', () => {
    const items = buildSearchItems({
      runningSessions: [],
      availableAgents: [],
      repos: [],
      prs: [],
      branches: [],
    });
    const fuse = createSearchEngine(items);
    const results = fuse.search('xyznotfound');
    expect(results.length).toBe(0);
  });
});
