import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReadyScreen } from './ReadyScreen';
import type { AgentConfig } from '../../types';

vi.mock('../../hooks/useOnboardingState', async () => {
  const actual = await vi.importActual('../../hooks/useOnboardingState');
  return { ...actual };
});

describe('ReadyScreen', () => {
  const mockOnNavigate = vi.fn();
  const mockOnComplete = vi.fn();

  const mockAgents: AgentConfig[] = [
    { id: 'claude-1', name: 'Claude Code', path: '/usr/local/bin/claude', icon: 'claude', source: 'detected' },
    { id: 'cursor-1', name: 'Cursor', path: '/Applications/Cursor.app', icon: 'cursor', source: 'manual' },
  ];

  it('renders "You\'re All Set!" title', () => {
    render(
      <ReadyScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1', 'cursor-1']}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByText(/You're All Set/i)).toBeInTheDocument();
  });

  it('renders agent count', () => {
    render(
      <ReadyScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1', 'cursor-1']}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByText(/2 agents ready to go/i)).toBeInTheDocument();
  });

  it('renders StatusIcon component', () => {
    render(
      <ReadyScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1', 'cursor-1']}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByTestId('status-icon')).toBeInTheDocument();
  });

  it('renders AgentRow with badges for each selected agent', () => {
    render(
      <ReadyScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1', 'cursor-1']}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('Detected')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('renders Open Dashboard button', () => {
    render(
      <ReadyScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1']}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByRole('button', { name: /open dashboard/i })).toBeInTheDocument();
  });

  it('renders Add Another Agent button', () => {
    render(
      <ReadyScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1']}
        onComplete={mockOnComplete}
      />
    );
    expect(screen.getByRole('button', { name: /add another agent/i })).toBeInTheDocument();
  });

  it('navigates to manual-add on Add Another Agent click', () => {
    render(
      <ReadyScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1']}
        onComplete={mockOnComplete}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /add another agent/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('manual-add');
  });
});
