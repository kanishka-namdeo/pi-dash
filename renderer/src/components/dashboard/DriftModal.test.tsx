import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DriftModal } from './DriftModal';
import type { DriftReport } from '../../../src/shared/types';

describe('DriftModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'api', {
      value: {
        getAgents: vi.fn().mockResolvedValue([]),
        saveAgents: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
    });
  });

  it('shows missing agents section', () => {
    const drift: DriftReport = {
      newAgents: [],
      missingAgents: [{ id: 'aider', name: 'Aider', path: '/usr/bin/aider', icon: 'aider', cwd: '', source: 'detected' }],
      movedAgents: [],
    };
    render(<DriftModal open={true} onOpenChange={() => {}} drift={drift} />);
    expect(screen.getByText(/1 agent\(s\) missing/i)).toBeInTheDocument();
    expect(screen.getByText(/Aider/)).toBeInTheDocument();
  });

  it('shows moved agents section', () => {
    const drift: DriftReport = {
      newAgents: [],
      missingAgents: [],
      movedAgents: [{
        agent: { id: 'omp', name: 'OMP', path: '/old/omp', icon: 'omp', cwd: '', source: 'detected' },
        status: 'moved',
        newPath: '/new/omp',
      }],
    };
    render(<DriftModal open={true} onOpenChange={() => {}} drift={drift} />);
    expect(screen.getByText(/1 agent\(s\) moved/i)).toBeInTheDocument();
    expect(screen.getByText(/OMP/)).toBeInTheDocument();
  });

  it('shows new agents section', () => {
    const drift: DriftReport = {
      newAgents: [{ id: 'claude', name: 'Claude', path: '/usr/bin/claude', icon: 'claude', cwd: '', source: 'detected' }],
      missingAgents: [],
      movedAgents: [],
    };
    render(<DriftModal open={true} onOpenChange={() => {}} drift={drift} />);
    expect(screen.getByText(/1 new agent\(s\) detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Claude/)).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    const drift: DriftReport = {
      newAgents: [],
      missingAgents: [{ id: 'aider', name: 'Aider', path: '/usr/bin/aider', icon: 'aider', cwd: '', source: 'detected' }],
      movedAgents: [],
    };
    render(<DriftModal open={false} onOpenChange={() => {}} drift={drift} />);
    expect(screen.queryByText(/agent\(s\) missing/i)).not.toBeInTheDocument();
  });

  it('shows all sections when all types present', () => {
    const drift: DriftReport = {
      newAgents: [{ id: 'new1', name: 'NewAgent', path: '/bin/new', icon: 'new', cwd: '', source: 'detected' }],
      missingAgents: [{ id: 'miss1', name: 'MissAgent', path: '/bin/miss', icon: 'miss', cwd: '', source: 'detected' }],
      movedAgents: [{
        agent: { id: 'mov1', name: 'MovAgent', path: '/old/mov', icon: 'mov', cwd: '', source: 'detected' },
        status: 'moved',
        newPath: '/new/mov',
      }],
    };
    render(<DriftModal open={true} onOpenChange={() => {}} drift={drift} />);
    expect(screen.getByText(/1 agent\(s\) missing/i)).toBeInTheDocument();
    expect(screen.getByText(/1 agent\(s\) moved/i)).toBeInTheDocument();
    expect(screen.getByText(/1 new agent\(s\) detected/i)).toBeInTheDocument();
  });

  it('Remove button filters out the agent from current list', async () => {
    const existingAgents = [
      { id: 'aider', name: 'Aider', path: '/usr/bin/aider', icon: 'aider', cwd: '', source: 'detected' as const },
      { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', cwd: '', source: 'detected' as const },
    ];
    window.api.getAgents = vi.fn().mockResolvedValue(existingAgents);
    const drift: DriftReport = {
      newAgents: [],
      missingAgents: [existingAgents[0]],
      movedAgents: [],
    };
    render(<DriftModal open={true} onOpenChange={() => {}} drift={drift} />);
    const removeBtn = screen.getByText('Remove');
    fireEvent.click(removeBtn);
    await waitFor(() => {
      expect(window.api.saveAgents).toHaveBeenCalledWith([existingAgents[1]]);
    });
  });

  it('Update Path button updates the agent path in current list', async () => {
    const existingAgents = [
      { id: 'omp', name: 'OMP', path: '/old/omp', icon: 'omp', cwd: '', source: 'detected' as const },
    ];
    window.api.getAgents = vi.fn().mockResolvedValue(existingAgents);
    const drift: DriftReport = {
      newAgents: [],
      missingAgents: [],
      movedAgents: [{
        agent: existingAgents[0],
        status: 'moved' as const,
        newPath: '/new/omp',
      }],
    };
    render(<DriftModal open={true} onOpenChange={() => {}} drift={drift} />);
    const updateBtn = screen.getByText('Update Path');
    fireEvent.click(updateBtn);
    await waitFor(() => {
      expect(window.api.saveAgents).toHaveBeenCalledWith([{
        ...existingAgents[0],
        path: '/new/omp',
      }]);
    });
  });

  it('Add button adds new agent to current list', async () => {
    const existingAgents = [
      { id: 'omp', name: 'OMP', path: '/usr/bin/omp', icon: 'omp', cwd: '', source: 'detected' as const },
    ];
    const newAgent = { id: 'claude', name: 'Claude', path: '/usr/bin/claude', icon: 'claude', cwd: '', source: 'detected' as const };
    window.api.getAgents = vi.fn().mockResolvedValue(existingAgents);
    const drift: DriftReport = {
      newAgents: [newAgent],
      missingAgents: [],
      movedAgents: [],
    };
    render(<DriftModal open={true} onOpenChange={() => {}} drift={drift} />);
    const addBtn = screen.getByText('Add');
    fireEvent.click(addBtn);
    await waitFor(() => {
      expect(window.api.saveAgents).toHaveBeenCalledWith([...existingAgents, newAgent]);
    });
  });

  it('Add button does not duplicate if agent already exists', async () => {
    const existingAgents = [
      { id: 'claude', name: 'Claude', path: '/usr/bin/claude', icon: 'claude', cwd: '', source: 'detected' as const },
    ];
    window.api.getAgents = vi.fn().mockResolvedValue(existingAgents);
    const drift: DriftReport = {
      newAgents: [existingAgents[0]],
      missingAgents: [],
      movedAgents: [],
    };
    render(<DriftModal open={true} onOpenChange={() => {}} drift={drift} />);
    const addBtn = screen.getByText('Add');
    fireEvent.click(addBtn);
    await waitFor(() => {
      expect(window.api.saveAgents).not.toHaveBeenCalled();
    });
  });
});
