import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgentScopeDialog } from './AgentScopeDialog';
import type { AgentConfig } from '../../../../src/shared/types';

const mockAgents: AgentConfig[] = [
  { id: '1', name: 'Agent One', icon: 'bot', path: '/path/one', cwd: '/cwd', source: 'detected' },
  { id: '2', name: 'Agent Two', icon: 'bot', path: '/path/two', cwd: '/cwd', source: 'detected' },
];

describe('AgentScopeDialog', () => {
  it('renders with agent list', () => {
    render(
      <AgentScopeDialog
        open={true}
        agents={mockAgents}
        onAddToGlobal={vi.fn()}
        onAddToProject={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Agent One (/path/one)')).toBeInTheDocument();
    expect(screen.getByText('Agent Two (/path/two)')).toBeInTheDocument();
  });

  it('renders radio buttons for scope selection', () => {
    render(
      <AgentScopeDialog
        open={true}
        agents={mockAgents}
        onAddToGlobal={vi.fn()}
        onAddToProject={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
  });

  it('defaults to global scope selected', () => {
    render(
      <AgentScopeDialog
        open={true}
        agents={mockAgents}
        onAddToGlobal={vi.fn()}
        onAddToProject={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();
  });

  it('allows switching to project scope', () => {
    render(
      <AgentScopeDialog
        open={true}
        agents={mockAgents}
        onAddToGlobal={vi.fn()}
        onAddToProject={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[1]);
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });

  it('calls onAddToGlobal when Continue is clicked with global selected', () => {
    const onAddToGlobal = vi.fn();
    render(
      <AgentScopeDialog
        open={true}
        agents={mockAgents}
        onAddToGlobal={onAddToGlobal}
        onAddToProject={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Continue'));
    expect(onAddToGlobal).toHaveBeenCalledWith(mockAgents);
  });

  it('calls onAddToProject when Continue is clicked with project selected', () => {
    const onAddToProject = vi.fn();
    render(
      <AgentScopeDialog
        open={true}
        agents={mockAgents}
        onAddToGlobal={vi.fn()}
        onAddToProject={onAddToProject}
        onCancel={vi.fn()}
      />
    );
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[1]);
    fireEvent.click(screen.getByText('Continue'));
    expect(onAddToProject).toHaveBeenCalledWith(mockAgents);
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(
      <AgentScopeDialog
        open={true}
        agents={mockAgents}
        onAddToGlobal={vi.fn()}
        onAddToProject={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
