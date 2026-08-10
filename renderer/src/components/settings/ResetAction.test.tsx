import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResetAction } from './ResetAction';

describe('ResetAction', () => {
  const defaultProps = {
    title: 'Reset Settings',
    description: 'Reset all settings to default values',
    impact: 'All custom settings and preferences',
    onConfirm: vi.fn().mockResolvedValue(undefined),
  };

  it('renders with title and description', () => {
    render(<ResetAction {...defaultProps} />);
    
    expect(screen.getByText('Reset Settings')).toBeInTheDocument();
    expect(screen.getByText('Reset all settings to default values')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset settings/i })).toBeInTheDocument();
  });

  it('opens dialog when button clicked', () => {
    render(<ResetAction {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /reset settings/i });
    fireEvent.click(button);
    
    // Dialog should be visible with title and impact
    expect(screen.getByText('This will remove:')).toBeInTheDocument();
    expect(screen.getByText(/all custom settings and preferences/i)).toBeInTheDocument();
  });

  it('confirm button disabled until requireText matches', async () => {
    render(<ResetAction {...defaultProps} requireText="RESET" />);
    
    const button = screen.getByRole('button', { name: /reset settings/i });
    fireEvent.click(button);
    
    // Confirm button should be disabled initially
    const confirmButton = screen.getByRole('button', { name: /^reset settings$/i });
    expect(confirmButton).toBeDisabled();
    
    // Type incorrect text
    const input = screen.getByPlaceholderText('RESET');
    fireEvent.change(input, { target: { value: 'WRONG' } });
    expect(confirmButton).toBeDisabled();
    
    // Type correct text
    fireEvent.change(input, { target: { value: 'RESET' } });
    expect(confirmButton).toBeEnabled();
  });

  it('calls onConfirm when user confirms', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ResetAction {...defaultProps} onConfirm={onConfirm} />);
    
    // Open dialog
    const button = screen.getByRole('button', { name: /reset settings/i });
    fireEvent.click(button);
    
    // Click confirm button
    const confirmButton = screen.getByRole('button', { name: /^reset settings$/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('dialog closes after successful confirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ResetAction {...defaultProps} onConfirm={onConfirm} />);
    
    // Open dialog
    const button = screen.getByRole('button', { name: /reset settings/i });
    fireEvent.click(button);
    
    // Verify dialog is open
    expect(screen.getByText('This will remove:')).toBeInTheDocument();
    
    // Click confirm
    const confirmButton = screen.getByRole('button', { name: /^reset settings$/i });
    fireEvent.click(confirmButton);
    
    // Dialog should close after confirmation
    await waitFor(() => {
      expect(screen.queryByText('This will remove:')).not.toBeInTheDocument();
    });
  });

  it('shows loading state during confirmation', async () => {
    let resolveConfirm: () => void;
    const onConfirm = vi.fn().mockImplementation(() => new Promise<void>(resolve => {
      resolveConfirm = resolve;
    }));
    
    render(<ResetAction {...defaultProps} onConfirm={onConfirm} />);
    
    // Open dialog
    const button = screen.getByRole('button', { name: /reset settings/i });
    fireEvent.click(button);
    
    // Click confirm
    const confirmButton = screen.getByRole('button', { name: /^reset settings$/i });
    fireEvent.click(confirmButton);
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Resetting...')).toBeInTheDocument();
    });
    
    // Resolve the promise
    resolveConfirm!();
    
    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Resetting...')).not.toBeInTheDocument();
    });
  });

  it('clears input when dialog closes', () => {
    render(<ResetAction {...defaultProps} requireText="RESET" />);
    
    // Open dialog
    const button = screen.getByRole('button', { name: /reset settings/i });
    fireEvent.click(button);
    
    // Type in input
    const input = screen.getByPlaceholderText('RESET');
    fireEvent.change(input, { target: { value: 'RESET' } });
    expect(input).toHaveValue('RESET');
    
    // Close dialog via cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    // Reopen dialog
    fireEvent.click(button);
    
    // Input should be cleared
    const reopenedInput = screen.getByPlaceholderText('RESET');
    expect(reopenedInput).toHaveValue('');
  });
});
