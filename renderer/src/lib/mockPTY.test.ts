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

  it('cancels pending response on kill', async () => {
    vi.useFakeTimers();
    const pty = createMockPTY('claude', mockConfig);
    const onData = vi.fn();
    pty.onData(onData);
    
    pty.write('help');
    expect(pty.state).toBe('working');
    expect(onData).toHaveBeenCalledWith('$ help\n');
    
    pty.kill();
    expect(pty.state).toBe('killed');
    
    vi.advanceTimersByTime(1000);
    
    expect(onData).toHaveBeenCalledTimes(1);
    expect(pty.state).toBe('killed');
    expect(pty.getHistory()).toHaveLength(0);
    
    vi.useRealTimers();
  });

  it('cancels pending response on restart', async () => {
    vi.useFakeTimers();
    const pty = createMockPTY('claude', mockConfig);
    const onStateChange = vi.fn();
    pty.onStateChange(onStateChange);
    
    pty.write('help');
    expect(pty.state).toBe('working');
    
    pty.restart();
    expect(pty.state).toBe('idle');
    expect(pty.getHistory()).toHaveLength(0);
    
    vi.advanceTimersByTime(1000);
    
    expect(pty.state).toBe('idle');
    expect(pty.getHistory()).toHaveLength(0);
    
    vi.useRealTimers();
  });
});
