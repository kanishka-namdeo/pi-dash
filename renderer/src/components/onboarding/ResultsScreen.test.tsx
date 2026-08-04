import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsScreen } from './ResultsScreen';
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

const SAMPLE_AGENTS: AgentConfig[] = [
  makeAgent({ id: 'a', name: 'Agent A', icon: 'cursor', path: '/usr/bin/a' }),
  makeAgent({ id: 'b', name: 'Agent B', icon: 'aider', path: '/usr/bin/b' }),
  makeAgent({ id: 'c', name: 'Agent C', icon: 'omp', path: '/usr/bin/c' }),
];

describe('ResultsScreen', () => {
  const noop = vi.fn();

  it('renders detected agents count', () => {
    render(
      <ResultsScreen
        onNavigate={noop}
        agents={SAMPLE_AGENTS}
        selectedAgents={[]}
        toggleAgent={noop}
        selectAll={noop}
        deselectAll={noop}
      />,
    );
    expect(screen.getByText(/We found 3 agents/i)).toBeInTheDocument();
  });

  it('renders each agent name', () => {
    render(
      <ResultsScreen
        onNavigate={noop}
        agents={SAMPLE_AGENTS}
        selectedAgents={[]}
        toggleAgent={noop}
        selectAll={noop}
        deselectAll={noop}
      />,
    );
    expect(screen.getByText('Agent A')).toBeInTheDocument();
    expect(screen.getByText('Agent B')).toBeInTheDocument();
    expect(screen.getByText('Agent C')).toBeInTheDocument();
  });

  it('renders agent paths', () => {
    render(
      <ResultsScreen
        onNavigate={noop}
        agents={SAMPLE_AGENTS}
        selectedAgents={[]}
        toggleAgent={noop}
        selectAll={noop}
        deselectAll={noop}
      />,
    );
    const paths = screen.getAllByText('/usr/bin/a');
    expect(paths.length).toBe(1);
  });

  it('calls toggleAgent when an agent checkbox is clicked', () => {
    const toggleAgent = vi.fn();
    render(
      <ResultsScreen
        onNavigate={noop}
        agents={SAMPLE_AGENTS}
        selectedAgents={[]}
        toggleAgent={toggleAgent}
        selectAll={noop}
        deselectAll={noop}
      />,
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Select Agent A' });
    fireEvent.click(checkbox);
    expect(toggleAgent).toHaveBeenCalledWith('a');
  });

  it('disables Continue button when no agents selected', () => {
    render(
      <ResultsScreen
        onNavigate={noop}
        agents={SAMPLE_AGENTS}
        selectedAgents={[]}
        toggleAgent={noop}
        selectAll={noop}
        deselectAll={noop}
      />,
    );
    const btn = screen.getByRole('button', { name: /select at least one agent to continue/i });
    expect(btn).toBeDisabled();
  });

  it('enables Continue button when agents are selected', () => {
    render(
      <ResultsScreen
        onNavigate={noop}
        agents={SAMPLE_AGENTS}
        selectedAgents={['a']}
        toggleAgent={noop}
        selectAll={noop}
        deselectAll={noop}
      />,
    );
    const btn = screen.getByRole('button', { name: /continue with selected agents/i });
    expect(btn).not.toBeDisabled();
  });

  it('calls selectAll when Select All is clicked', () => {
    const selectAll = vi.fn();
    render(
      <ResultsScreen
        onNavigate={noop}
        agents={SAMPLE_AGENTS}
        selectedAgents={[]}
        toggleAgent={noop}
        selectAll={selectAll}
        deselectAll={noop}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Select all agents' }));
    expect(selectAll).toHaveBeenCalled();
  });

  it('calls deselectAll when Deselect All is clicked', () => {
    const deselectAll = vi.fn();
    render(
      <ResultsScreen
        onNavigate={noop}
        agents={SAMPLE_AGENTS}
        selectedAgents={['a', 'b']}
        toggleAgent={noop}
        selectAll={noop}
        deselectAll={deselectAll}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Deselect all agents' }));
    expect(deselectAll).toHaveBeenCalled();
  });

  it('navigates to manual-add when Add Manually is clicked', () => {
    const onNavigate = vi.fn();
    render(
      <ResultsScreen
        onNavigate={onNavigate}
        agents={SAMPLE_AGENTS}
        selectedAgents={['a']}
        toggleAgent={noop}
        selectAll={noop}
        deselectAll={noop}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add an agent manually' }));
    expect(onNavigate).toHaveBeenCalledWith('manual-add');
  });

  it('navigates to ready when Continue is clicked', () => {
    const onNavigate = vi.fn();
    render(
      <ResultsScreen
        onNavigate={onNavigate}
        agents={SAMPLE_AGENTS}
        selectedAgents={['a']}
        toggleAgent={noop}
        selectAll={noop}
        deselectAll={noop}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /continue with selected agents/i }));
    expect(onNavigate).toHaveBeenCalledWith('ready');
  });

  it('shows "No Agents Found" when agents list is empty', () => {
    render(
      <ResultsScreen
        onNavigate={noop}
        agents={[]}
        selectedAgents={[]}
        toggleAgent={noop}
        selectAll={noop}
        deselectAll={noop}
      />,
    );
    expect(screen.getByText(/No Agents Found/i)).toBeInTheDocument();
    expect(screen.getByText(/didn't detect any agents/i)).toBeInTheDocument();
  });

  it('shows selection count', () => {
    render(
      <ResultsScreen
        onNavigate={noop}
        agents={SAMPLE_AGENTS}
        selectedAgents={['a', 'b']}
        toggleAgent={noop}
        selectAll={noop}
        deselectAll={noop}
      />,
    );
    expect(screen.getByText('2 / 3 selected')).toBeInTheDocument();
  });

  it('Continue button shows correct count', () => {
    render(
      <ResultsScreen
        onNavigate={noop}
        agents={SAMPLE_AGENTS}
        selectedAgents={SAMPLE_AGENTS.map((a) => a.id)}
        toggleAgent={noop}
        selectAll={noop}
        deselectAll={noop}
      />,
    );
    // visible text says "Continue (3)"
    expect(screen.getByText(/Continue \(3\)/)).toBeInTheDocument();
  });

  it('renders unknown icon with fallback', () => {
    const unknownAgent = [makeAgent({ id: 'x', name: 'Unknown', icon: 'unknown-icon' })];
    render(
      <ResultsScreen
        onNavigate={noop}
        agents={unknownAgent}
        selectedAgents={[]}
        toggleAgent={noop}
        selectAll={noop}
        deselectAll={noop}
      />,
    );
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    // fallback icon renders "?" symbol
    expect(screen.getByText('?').parentElement).toHaveClass('bg-slate-700');
  });
});
