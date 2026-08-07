import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TerminalPanel } from '../TerminalPanel';

// Mock TerminalView to avoid xterm.js issues in test environment
vi.mock('../../terminal/TerminalView', () => ({
  TerminalView: ({ agentId }: { agentId: string }) => (
    <div data-testid="terminal-view">Terminal for {agentId}</div>
  ),
}));

describe('TerminalPanel', () => {
  it('shows empty state when no agent selected', () => {
    render(<TerminalPanel agentId={null} />);
    expect(screen.getByText('No agent selected')).toBeInTheDocument();
    expect(screen.getByText('Click an agent to view terminal')).toBeInTheDocument();
  });

  it('renders TerminalView when agentId is provided', () => {
    render(<TerminalPanel agentId="claude-code" />);
    expect(screen.queryByText('No agent selected')).not.toBeInTheDocument();
    expect(screen.getByTestId('terminal-view')).toBeInTheDocument();
    expect(screen.getByText('Terminal for claude-code')).toBeInTheDocument();
  });
});
