import { describe, it, expect, vi } from 'vitest';
import { createMockPTY } from './mockPTY';
import type { AgentConfig } from '../types/session';

const mockConfig: AgentConfig = {
  id: 'claude',
  name: 'Claude',
  icon: 'claude',
  path: '/path/to/claude',
  source: 'detected',
};

describe('MockPTY', () => {
  it('starts in idle state', () => {
    const pty = createMockPTY('claude', mockConfig);
    expect(pty.state).toBe('idle');
  });

  it('transitions to working when command is written', () => {
    const pty = createMockPTY('claude', mockConfig);
    pty.write('help');
    expect(pty.state).toBe('working');
  });

  it('can pause and resume', () => {
    const pty = createMockPTY('claude', mockConfig);
    pty.start();
    expect(pty.state).toBe('waiting');
    
    pty.pause();
    expect(pty.state).toBe('paused');
    
    pty.resume();
    expect(pty.state).toBe('waiting');
  });
});
