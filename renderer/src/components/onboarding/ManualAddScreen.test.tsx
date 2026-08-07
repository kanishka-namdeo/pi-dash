import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ManualAddScreen } from './ManualAddScreen';
import type { AgentConfig } from '../../types';

vi.useFakeTimers();

function mockApi(overrides: Record<string, ReturnType<typeof vi.fn>> = {}) {
  (globalThis as unknown as Record<string, unknown>).window = {
    api: {
      validateAgent: vi.fn().mockResolvedValue({ valid: true, executable: true, isDirectory: false }),
      identifyAgent: vi.fn().mockResolvedValue({
        knownAgentId: 'cursor',
        suggestedName: 'Cursor',
        suggestedIcon: 'cursor',
        confidence: 'high',
      }),
      ...overrides,
    },
  };
}

const noop = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ManualAddScreen', () => {
  it('renders path input', () => {
    mockApi();
    render(<ManualAddScreen onNavigate={noop} addAgent={noop} />);
    expect(screen.getByPlaceholderText(/e\.g\.|path/i)).toBeInTheDocument();
  });

  it('validates path on change (debounced)', async () => {
    const mockValidate = vi.fn().mockResolvedValue({ valid: true, executable: true, isDirectory: false });
    mockApi({ validateAgent: mockValidate });
    render(<ManualAddScreen onNavigate={noop} addAgent={noop} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '/usr/bin/cursor' } });

    expect(mockValidate).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(mockValidate).toHaveBeenCalledWith('/usr/bin/cursor');
  });

  it('shows error for invalid path', async () => {
    const mockValidate = vi.fn().mockResolvedValue({
      valid: false,
      error: 'Path does not exist',
      executable: false,
      isDirectory: false,
    });
    mockApi({ validateAgent: mockValidate });
    render(<ManualAddScreen onNavigate={noop} addAgent={noop} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '/nonexistent/path' } });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText('Path does not exist')).toBeInTheDocument();
  });

  it('disables Add button when path is invalid', async () => {
    const mockValidate = vi.fn().mockResolvedValue({
      valid: false,
      error: 'Path does not exist',
      executable: false,
      isDirectory: false,
    });
    mockApi({ validateAgent: mockValidate });
    render(<ManualAddScreen onNavigate={noop} addAgent={noop} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '/nonexistent/path' } });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByRole('button', { name: /add this agent/i })).toBeDisabled();
  });

  it('auto-fills name/icon for known agents', async () => {
    const mockValidate = vi.fn().mockResolvedValue({ valid: true, executable: true, isDirectory: false });
    const mockIdentify = vi.fn().mockResolvedValue({
      knownAgentId: 'cursor',
      suggestedName: 'Cursor',
      suggestedIcon: 'cursor',
      confidence: 'high',
    });
    mockApi({ validateAgent: mockValidate, identifyAgent: mockIdentify });
    render(<ManualAddScreen onNavigate={noop} addAgent={noop} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '/usr/bin/cursor' } });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(within(screen.getByRole('region', { name: /detected agent/i })).getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText(/confidence.*high/i)).toBeInTheDocument();
  });

  it('calls addAgent with correct AgentConfig when Add clicked', async () => {
    const addAgent = vi.fn();
    const mockValidate = vi.fn().mockResolvedValue({ valid: true, executable: true, isDirectory: false });
    const mockIdentify = vi.fn().mockResolvedValue({
      knownAgentId: 'aider',
      suggestedName: 'Aider',
      suggestedIcon: 'aider',
      confidence: 'high',
    });
    mockApi({ validateAgent: mockValidate, identifyAgent: mockIdentify });
    const onNavigate = vi.fn();

    render(<ManualAddScreen onNavigate={onNavigate} addAgent={addAgent} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '/usr/bin/aider' } });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const addButton = screen.getByRole('button', { name: /add this agent/i });
    fireEvent.click(addButton);

    expect(addAgent).toHaveBeenCalledTimes(1);
    const addedAgent: AgentConfig = addAgent.mock.calls[0][0];
    expect(addedAgent.id).toMatch(/^manual-\d+$/);
    expect(addedAgent.name).toBe('Aider');
    expect(addedAgent.icon).toBe('aider');
    expect(addedAgent.path).toBe('/usr/bin/aider');
    expect(addedAgent.source).toBe('manual');
  });

  it('navigates to ready screen after adding', async () => {
    const addAgent = vi.fn();
    const onNavigate = vi.fn();
    const mockValidate = vi.fn().mockResolvedValue({ valid: true, executable: true, isDirectory: false });
    mockApi({ validateAgent: mockValidate });

    render(<ManualAddScreen onNavigate={onNavigate} addAgent={addAgent} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '/usr/bin/something' } });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const addButton = screen.getByRole('button', { name: /add this agent/i });
    fireEvent.click(addButton);

    expect(onNavigate).toHaveBeenCalledWith('ready');
  });

  it('navigates back to results when Back is clicked', () => {
    mockApi();
    const onNavigate = vi.fn();
    render(<ManualAddScreen onNavigate={onNavigate} addAgent={noop} />);

    fireEvent.click(screen.getByRole('button', { name: /go back/i }));
    expect(onNavigate).toHaveBeenCalledWith('results');
  });

  it('enables Add button when path is valid', async () => {
    mockApi();
    render(<ManualAddScreen onNavigate={noop} addAgent={noop} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '/usr/bin/valid-agent' } });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByRole('button', { name: /add this agent/i })).not.toBeDisabled();
  });

  it('does not call validateAgent on empty input', async () => {
    const mockValidate = vi.fn();
    mockApi({ validateAgent: mockValidate });
    render(<ManualAddScreen onNavigate={noop} addAgent={noop} />);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('renders AgentChip group with known agents', () => {
    mockApi();
    render(<ManualAddScreen onNavigate={noop} addAgent={noop} />);
    expect(screen.getByText(/Or choose a known agent/i)).toBeInTheDocument();
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('Aider')).toBeInTheDocument();
  });
});
