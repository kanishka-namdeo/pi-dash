import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReadyScreen } from './ReadyScreen';
import type { AgentConfig } from '../../types';

function makeAgent(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: 'test-agent',
    name: 'Test Agent',
    icon: 'cursor',
    path: '/usr/bin/test',
    source: 'detected',
    ...overrides,
  };
}

describe('ReadyScreen', () => {
  const noop = vi.fn();

  it('renders success message', () => {
    render(<ReadyScreen onNavigate={noop} agents={[]} selectedAgents={[]} />);
    expect(screen.getByText(/You're All Set!/i)).toBeInTheDocument();
  });

  it('shows selected agents only', () => {
    const agents = [
      makeAgent({ id: 'a', name: 'Agent A', icon: 'cursor', path: '/usr/bin/a' }),
      makeAgent({ id: 'b', name: 'Agent B', icon: 'aider', path: '/usr/bin/b' }),
      makeAgent({ id: 'c', name: 'Agent C', icon: 'omp', path: '/usr/bin/c' }),
    ];
    render(<ReadyScreen onNavigate={noop} agents={agents} selectedAgents={['a', 'c']} />);
    expect(screen.getByText('Agent A')).toBeInTheDocument();
    expect(screen.getByText('Agent C')).toBeInTheDocument();
    expect(screen.queryByText('Agent B')).not.toBeInTheDocument();
  });

  it('shows agent paths', () => {
    const agents = [
      makeAgent({ id: 'a', name: 'Agent A', icon: 'cursor', path: '/usr/bin/a' }),
    ];
    render(<ReadyScreen onNavigate={noop} agents={agents} selectedAgents={['a']} />);
    expect(screen.getByText('/usr/bin/a')).toBeInTheDocument();
  });

  it('shows source badges', () => {
    const agents = [
      makeAgent({ id: 'a', name: 'Agent A', icon: 'cursor', path: '/usr/bin/a', source: 'detected' }),
      makeAgent({ id: 'b', name: 'Agent B', icon: 'aider', path: '/usr/bin/b', source: 'manual' }),
    ];
    render(<ReadyScreen onNavigate={noop} agents={agents} selectedAgents={['a', 'b']} />);
    expect(screen.getByText('Detected')).toBeInTheDocument();
    expect(screen.getByText('Added')).toBeInTheDocument();
  });

  it('shows selected agent count', () => {
    const agents = [
      makeAgent({ id: 'a', name: 'Agent A', icon: 'cursor', path: '/usr/bin/a' }),
      makeAgent({ id: 'b', name: 'Agent B', icon: 'aider', path: '/usr/bin/b' }),
    ];
    render(<ReadyScreen onNavigate={noop} agents={agents} selectedAgents={['a', 'b']} />);
    expect(screen.getByText(/2 agents ready to go/i)).toBeInTheDocument();
  });

  it('shows singular count for one agent', () => {
    const agents = [
      makeAgent({ id: 'a', name: 'Agent A', icon: 'cursor', path: '/usr/bin/a' }),
    ];
    render(<ReadyScreen onNavigate={noop} agents={agents} selectedAgents={['a']} />);
    expect(screen.getByText(/1 agent ready to go/i)).toBeInTheDocument();
  });

  it('calls saveAgents and completeOnboarding when Open Dashboard clicked', async () => {
    const saveAgents = vi.fn().mockResolvedValue(undefined);
    const completeOnboarding = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('api', { saveAgents, completeOnboarding });

    const agents = [
      makeAgent({ id: 'a', name: 'Agent A', icon: 'cursor', path: '/usr/bin/a' }),
    ];
    render(<ReadyScreen onNavigate={noop} agents={agents} selectedAgents={['a']} />);

    fireEvent.click(screen.getByRole('button', { name: /open dashboard/i }));

    await waitFor(() => {
      expect(saveAgents).toHaveBeenCalledWith(agents);
    });
    expect(completeOnboarding).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('shows completion message after successful save', async () => {
    const saveAgents = vi.fn().mockResolvedValue(undefined);
    const completeOnboarding = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('api', { saveAgents, completeOnboarding });

    const agents = [
      makeAgent({ id: 'a', name: 'Agent A', icon: 'cursor', path: '/usr/bin/a' }),
    ];
    render(<ReadyScreen onNavigate={noop} agents={agents} selectedAgents={['a']} />);

    fireEvent.click(screen.getByRole('button', { name: /open dashboard/i }));

    await waitFor(() => {
      expect(screen.getByText(/setup complete/i)).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });

  it('calls onNavigate("manual-add") when Add Another Agent clicked', () => {
    render(<ReadyScreen onNavigate={noop} agents={[]} selectedAgents={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /add another agent/i }));
    expect(noop).toHaveBeenCalledWith('manual-add');
  });

  it('renders unknown icon with fallback', () => {
    const agents = [
      makeAgent({ id: 'x', name: 'Unknown Agent', icon: 'unknown-icon', path: '/usr/bin/x' }),
    ];
    render(<ReadyScreen onNavigate={noop} agents={agents} selectedAgents={['x']} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
