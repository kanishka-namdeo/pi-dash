import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WelcomeScreen } from './WelcomeScreen';
describe('WelcomeScreen', () => {
  const mockOnNavigate = vi.fn();

  it('renders welcome title', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText(/Welcome to PiDash/i)).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText(/unified dashboard/i)).toBeInTheDocument();
  });

  it('renders Get Started button', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    const button = screen.getByRole('button', { name: /get started/i });
    expect(button).toBeInTheDocument();
  });

  it('renders skip link', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    const link = screen.getByRole('button', { name: /skip/i });
    expect(link).toBeInTheDocument();
  });

  it('calls onNavigate with scanning when Get Started is clicked', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    const button = screen.getByRole('button', { name: /get started/i });
    fireEvent.click(button);
    expect(mockOnNavigate).toHaveBeenCalledWith('scanning');
  });

  it('calls onNavigate with manual-add when skip is clicked', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    const link = screen.getByRole('button', { name: /skip/i });
    fireEvent.click(link);
    expect(mockOnNavigate).toHaveBeenCalledWith('manual-add');
  });

  it('renders feature highlights', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText(/Auto-detect agents/i)).toBeInTheDocument();
    expect(screen.getByText(/One-click launch/i)).toBeInTheDocument();
    expect(screen.getByText(/Live activity/i)).toBeInTheDocument();
  });

  it('renders IconBox components for feature cards', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    const iconBoxes = screen.getAllByTestId('icon-box');
    expect(iconBoxes.length).toBe(3);
  });

  it('renders privacy note', () => {
    render(<WelcomeScreen onNavigate={mockOnNavigate} />);
    expect(screen.getByText(/locally installed agents/i)).toBeInTheDocument();
  });
});
