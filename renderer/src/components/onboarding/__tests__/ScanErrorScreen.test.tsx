import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScanErrorScreen } from '../ScanErrorScreen';

describe('ScanErrorScreen', () => {
  const mockOnNavigate = vi.fn();

  it('renders scan failed title', () => {
    render(<ScanErrorScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText('Scan Failed')).toBeInTheDocument();
  });

  it('renders error description', () => {
    render(<ScanErrorScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText(/couldn't scan for agents/i)).toBeInTheDocument();
  });

  it('renders Try Again button', () => {
    render(<ScanErrorScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders Add Manually button', () => {
    render(<ScanErrorScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByRole('button', { name: /add manually/i })).toBeInTheDocument();
  });

  it('navigates to scanning on Try Again', () => {
    render(<ScanErrorScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('scanning');
  });

  it('navigates to manual-add on Add Manually', () => {
    render(<ScanErrorScreen onNavigate={mockOnNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /add manually/i }));
    expect(mockOnNavigate).toHaveBeenCalledWith('manual-add');
  });

  it('renders error status icon', () => {
    render(<ScanErrorScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByTestId('status-icon')).toBeInTheDocument();
  });
});
