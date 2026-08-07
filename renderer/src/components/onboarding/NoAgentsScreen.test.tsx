import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NoAgentsScreen } from './NoAgentsScreen';

describe('NoAgentsScreen', () => {
  const mockOnNavigate = vi.fn();

  it('renders no agents title', () => {
    render(<NoAgentsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText(/No Agents Found/i)).toBeInTheDocument();
  });

  it('renders AgentCard components for popular agents', () => {
    render(<NoAgentsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText('Oh My Pile (OMP)')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('Aider')).toBeInTheDocument();
  });

  it('renders download links for each agent', () => {
    render(<NoAgentsScreen onNavigate={mockOnNavigate} />);
    const downloadLinks = screen.getAllByText(/Download/i);
    expect(downloadLinks.length).toBeGreaterThanOrEqual(3);
  });

  it('renders Add Manually button', () => {
    render(<NoAgentsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByRole('button', { name: /add an agent manually/i })).toBeInTheDocument();
  });

  it('renders Scan Again button', () => {
    render(<NoAgentsScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByRole('button', { name: /scan again for agents/i })).toBeInTheDocument();
  });

  it('navigates to manual-add on Add Manually click', () => {
    render(<NoAgentsScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /add an agent manually/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('manual-add');
  });

  it('navigates to scanning on Scan Again click', () => {
    render(<NoAgentsScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /scan again for agents/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('scanning');
  });
});
