import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DriftModal } from './DriftModal';
import type { DriftReport } from '../../../src/shared/types';

describe('DriftModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'api', {
      value: {
        saveAgents: vi.fn(),
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
});
