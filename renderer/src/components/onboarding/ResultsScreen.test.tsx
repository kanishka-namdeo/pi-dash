import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsScreen } from './ResultsScreen';
import type { AgentConfig } from '../../types';

describe('ResultsScreen', () => {
  const mockOnNavigate = vi.fn();
  const mockToggleAgent = vi.fn();
  const mockSelectAll = vi.fn();
  const mockDeselectAll = vi.fn();

  const mockAgents: AgentConfig[] = [
    { id: 'claude-1', name: 'Claude Code', path: '/usr/local/bin/claude', icon: 'claude', source: 'detected' },
    { id: 'cursor-1', name: 'Cursor', path: '/Applications/Cursor.app', icon: 'cursor', source: 'detected' },
  ];

  it('renders agent list using AgentRow', () => {
    render(
      <ResultsScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1']}
        toggleAgent={mockToggleAgent}
        selectAll={mockSelectAll}
        deselectAll={mockDeselectAll}
      />
    );
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
  });

  it('renders checkboxes for each agent', () => {
    render(
      <ResultsScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1']}
        toggleAgent={mockToggleAgent}
        selectAll={mockSelectAll}
        deselectAll={mockDeselectAll}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(2);
  });

  it('shows select count in Continue button', () => {
    render(
      <ResultsScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1']}
        toggleAgent={mockToggleAgent}
        selectAll={mockSelectAll}
        deselectAll={mockDeselectAll}
      />
    );
    expect(screen.getByText(/Continue \(1\)/)).toBeInTheDocument();
  });

  it('renders Select All and Deselect All buttons', () => {
    render(
      <ResultsScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={[]}
        toggleAgent={mockToggleAgent}
        selectAll={mockSelectAll}
        deselectAll={mockDeselectAll}
      />
    );
    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
  });

  it('calls selectAll when Select All is clicked', () => {
    render(
      <ResultsScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={[]}
        toggleAgent={mockToggleAgent}
        selectAll={mockSelectAll}
        deselectAll={mockDeselectAll}
      />
    );
    fireEvent.click(screen.getByText('Select All'));
    expect(mockSelectAll).toHaveBeenCalled();
  });

  it('calls onNavigate with ready when Continue is clicked', () => {
    render(
      <ResultsScreen
        onNavigate={mockOnNavigate}
        agents={mockAgents}
        selectedAgents={['claude-1']}
        toggleAgent={mockToggleAgent}
        selectAll={mockSelectAll}
        deselectAll={mockDeselectAll}
      />
    );
    fireEvent.click(screen.getByText(/Continue/));
    expect(mockOnNavigate).toHaveBeenCalledWith('ready');
  });
});
