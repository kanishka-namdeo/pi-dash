import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NoAgentsScreen } from './NoAgentsScreen';

describe('NoAgentsScreen', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders friendly message when no agents found', () => {
    render(<NoAgentsScreen onNavigate={mockNavigate} />);
    expect(screen.getByText('No Agents Found')).toBeInTheDocument();
    expect(
      screen.getByText(/couldn't detect any AI coding agents/)
    ).toBeInTheDocument();
  });

  it('shows list of popular agents with names and descriptions', () => {
    render(<NoAgentsScreen onNavigate={mockNavigate} />);
    expect(screen.getByText('Oh My Pile (OMP)')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('Aider')).toBeInTheDocument();
    expect(screen.getByText('OpenAI Codex')).toBeInTheDocument();
    expect(screen.getByText('Continue')).toBeInTheDocument();
    // Descriptions
    expect(screen.getByText(/AI coding assistant with unified agent dashboard/)).toBeInTheDocument();
    expect(screen.getByText(/AI-first code editor/)).toBeInTheDocument();
    expect(screen.getByText(/AI pair programming in your terminal/)).toBeInTheDocument();
    expect(screen.getByText(/AI code generation from OpenAI/)).toBeInTheDocument();
    expect(screen.getByText(/Open-source AI coding assistant/)).toBeInTheDocument();
  });

  it('has download buttons for each agent', () => {
    render(<NoAgentsScreen onNavigate={mockNavigate} />);
    const downloadButtons = screen.getAllByRole('button', { name: /Download/ });
    expect(downloadButtons).toHaveLength(5);
  });

  it('calls onNavigate("manual-add") when Add Manually clicked', () => {
    render(<NoAgentsScreen onNavigate={mockNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Add an agent manually/ }));
    expect(mockNavigate).toHaveBeenCalledWith('manual-add');
  });

  it('calls onNavigate("scanning") when Scan Again clicked', () => {
    render(<NoAgentsScreen onNavigate={mockNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Scan again/ }));
    expect(mockNavigate).toHaveBeenCalledWith('scanning');
  });

  it('buttons are keyboard accessible', () => {
    render(<NoAgentsScreen onNavigate={mockNavigate} />);
    const addManuallyBtn = screen.getByRole('button', { name: /Add an agent manually/ });
    const scanAgainBtn = screen.getByRole('button', { name: /Scan again/ });
    // Buttons are natively keyboard accessible; verify they are actual button elements
    expect(addManuallyBtn.tagName).toBe('BUTTON');
    expect(scanAgainBtn.tagName).toBe('BUTTON');
  });
});
