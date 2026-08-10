import { describe, it, expect } from 'vitest';
import { findNewAgents, mergeAgents } from './agentScope';
import type { AgentConfig } from '../../../src/shared/types';

describe('findNewAgents', () => {
  it('returns agents not in global config', () => {
    const globalAgents: AgentConfig[] = [
      {
        id: 'claude',
        name: 'Claude Code',
        icon: 'claude',
        path: '/usr/local/bin/claude',
        cwd: '/home/user',
        source: 'detected',
      },
      {
        id: 'cursor',
        name: 'Cursor',
        icon: 'cursor',
        path: '/usr/local/bin/cursor',
        cwd: '/home/user',
        source: 'detected',
      },
    ];

    const selected: AgentConfig[] = [
      {
        id: 'claude',
        name: 'Claude Code',
        icon: 'claude',
        path: '/usr/local/bin/claude',
        cwd: '/home/user',
        source: 'detected',
      },
      {
        id: 'aider',
        name: 'Aider',
        icon: 'aider',
        path: '/usr/local/bin/aider',
        cwd: '/home/user',
        source: 'manual',
      },
    ];

    const result = findNewAgents(selected, globalAgents);
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('aider');
    expect(result[0].name).toBe('Aider');
  });

  it('returns empty when all agents are global', () => {
    const globalAgents: AgentConfig[] = [
      {
        id: 'claude',
        name: 'Claude Code',
        icon: 'claude',
        path: '/usr/local/bin/claude',
        cwd: '/home/user',
        source: 'detected',
      },
      {
        id: 'cursor',
        name: 'Cursor',
        icon: 'cursor',
        path: '/usr/local/bin/cursor',
        cwd: '/home/user',
        source: 'detected',
      },
    ];

    const selected: AgentConfig[] = [
      {
        id: 'claude',
        name: 'Claude Code',
        icon: 'claude',
        path: '/usr/local/bin/claude',
        cwd: '/home/user',
        source: 'detected',
      },
    ];

    const result = findNewAgents(selected, globalAgents);
    
    expect(result).toHaveLength(0);
  });
});

describe('mergeAgents', () => {
  it('combines global and project agents', () => {
    const globalAgents: AgentConfig[] = [
      {
        id: 'claude',
        name: 'Claude Code',
        icon: 'claude',
        path: '/usr/local/bin/claude',
        cwd: '/home/user',
        source: 'detected',
      },
    ];

    const projectAgents: AgentConfig[] = [
      {
        id: 'cursor',
        name: 'Cursor',
        icon: 'cursor',
        path: '/usr/local/bin/cursor',
        cwd: '/home/user/project',
        source: 'manual',
      },
    ];

    const result = mergeAgents(globalAgents, projectAgents);
    
    expect(result).toHaveLength(2);
    expect(result.find(a => a.id === 'claude')).toBeDefined();
    expect(result.find(a => a.id === 'cursor')).toBeDefined();
  });

  it('project agents override global with same ID', () => {
    const globalAgents: AgentConfig[] = [
      {
        id: 'claude',
        name: 'Claude Code',
        icon: 'claude',
        path: '/usr/local/bin/claude',
        cwd: '/home/user',
        source: 'detected',
      },
    ];

    const projectAgents: AgentConfig[] = [
      {
        id: 'claude',
        name: 'Claude Code (Project)',
        icon: 'claude',
        path: '/usr/local/bin/claude',
        cwd: '/home/user/project',
        source: 'manual',
      },
    ];

    const result = mergeAgents(globalAgents, projectAgents);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Claude Code (Project)');
    expect(result[0].cwd).toBe('/home/user/project');
    expect(result[0].source).toBe('manual');
  });
});
