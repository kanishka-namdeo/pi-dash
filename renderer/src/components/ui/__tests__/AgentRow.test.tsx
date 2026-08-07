import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgentRow } from '../AgentRow';

describe('AgentRow', () => {
  const defaultProps = {
    name: 'Claude Code',
    path: '/usr/local/bin/claude',
    icon: 'claude',
    gradient: 'from-orange-500 to-red-600',
  };

  it('renders agent name and path', () => {
    render(<AgentRow {...defaultProps} />);
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('/usr/local/bin/claude')).toBeInTheDocument();
  });

  it('shows checkbox when showCheckbox is true', () => {
    render(<AgentRow {...defaultProps} showCheckbox={true} selected={false} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const handleToggle = vi.fn();
    render(<AgentRow {...defaultProps} showCheckbox={true} selected={false} onToggle={handleToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleToggle).toHaveBeenCalled();
  });

  it('shows badge when provided', () => {
    render(<AgentRow {...defaultProps} badge="Detected" />);
    expect(screen.getByText('Detected')).toBeInTheDocument();
  });
});
