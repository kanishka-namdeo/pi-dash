import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScanningScreen } from './ScanningScreen';

vi.mock('../../types', async () => {
  const actual = await vi.importActual('../../types');
  return { ...actual };
});

describe('ScanningScreen', () => {
  const mockOnNavigate = vi.fn();
  const mockSetAgents = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.api.scanAgents to never resolve (keeps scanning state)
    const pending = new Promise<never>(() => {});
    const mockApi = { scanAgents: vi.fn().mockReturnValue(pending) };
    Object.assign(window, { api: mockApi });
  });

  it('renders scanning title', () => {
    render(<ScanningScreen onNavigate={mockOnNavigate} setAgents={mockSetAgents} />);
    expect(screen.getByText(/Scanning for agents/i)).toBeInTheDocument();
  });

  it('renders Spinner component', () => {
    render(<ScanningScreen onNavigate={mockOnNavigate} setAgents={mockSetAgents} />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders privacy note', () => {
    render(<ScanningScreen onNavigate={mockOnNavigate} setAgents={mockSetAgents} />);
    expect(screen.getByText(/locally installed agents/i)).toBeInTheDocument();
  });

  it('has loading status indicator', () => {
    render(<ScanningScreen onNavigate={mockOnNavigate} setAgents={mockSetAgents} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
