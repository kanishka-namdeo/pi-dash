import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgentChip } from '../AgentChip';

vi.mock('../../../utils/agentPathResolver', () => ({
  resolveAgentPath: vi.fn((id: string) => Promise.resolve(`/resolved/${id}`)),
}));

describe('AgentChip', () => {
  it('renders agent name', () => {
    render(<AgentChip name="Claude Code" agentId="claude" onClick={() => {}} />);
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
  });

  it('resolves path and calls onClick with it when clicked', async () => {
    const handleClick = vi.fn();
    render(<AgentChip name="Claude Code" agentId="claude" onClick={handleClick} />);
    fireEvent.click(screen.getByText('Claude Code'));
    await waitFor(() => {
      expect(handleClick).toHaveBeenCalledWith('/resolved/claude');
    });
  });

  it('applies selected styling when selected', () => {
    render(<AgentChip name="Claude Code" agentId="claude" onClick={() => {}} selected={true} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies unselected styling by default', () => {
    render(<AgentChip name="Claude Code" agentId="claude" onClick={() => {}} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });
});
