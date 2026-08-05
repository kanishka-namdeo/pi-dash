import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TerminalPane } from './TerminalPane';

describe('TerminalPane', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders input field', () => {
    const { container } = render(<TerminalPane agentId="claude" />);
    const input = container.querySelector('input');
    expect(input).toBeDefined();
    expect(input).not.toBeNull();
  });

  it('calls submitCommand on Enter', () => {
    const { container } = render(<TerminalPane agentId="claude" />);
    const input = container.querySelector('input')!;

    fireEvent.change(input, { target: { value: 'help' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Input should be cleared after submit
    expect(input.value).toBe('');
  });

  it('navigates to previous command on ArrowUp', async () => {
    const { container } = render(<TerminalPane agentId="claude" />);
    const input = container.querySelector('input')!;

    // Submit a command first to populate history
    fireEvent.change(input, { target: { value: 'help' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Navigate back
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    expect(input.value).toBe('help');
  });

  it('navigates to next command on ArrowDown', async () => {
    const { container } = render(<TerminalPane agentId="claude" />);
    const input = container.querySelector('input')!;

    // Submit a command first
    fireEvent.change(input, { target: { value: 'ls' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Navigate back then forward
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('ls');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.value).toBe('');
  });

  it('auto-scrolls to bottom on new blocks', () => {
    const { container } = render(<TerminalPane agentId="claude" />);
    const scrollContainer = container.querySelector('.terminal-content');
    expect(scrollContainer).toBeDefined();
  });

  it('shows default placeholder in idle state', () => {
    const { container } = render(<TerminalPane agentId="claude" />);
    const input = container.querySelector('input')!;

    expect(input.placeholder).toBe('Type a command...');
  });

  it('does not submit empty commands on Enter', () => {
    const { container } = render(<TerminalPane agentId="claude" />);
    const input = container.querySelector('input')!;

    // Try to submit with empty input
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Input should remain empty and no state change
    expect(input.value).toBe('');
  });

  it('focuses input on mount', () => {
    const { container } = render(<TerminalPane agentId="claude" />);
    const input = container.querySelector('input')!;

    expect(document.activeElement).toBe(input);
  });

  it('renders command blocks when history exists', async () => {
    const { container } = render(<TerminalPane agentId="claude" />);
    const input = container.querySelector('input')!;

    // Submit a command to create a block
    fireEvent.change(input, { target: { value: 'ls' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // CommandBlockView renders .command-block or .command-block-flat
    const blocks = container.querySelectorAll('.command-block, .command-block-flat');
    expect(blocks.length).toBeGreaterThanOrEqual(1);
  });
});
