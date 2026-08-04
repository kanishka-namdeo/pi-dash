import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScanningScreen } from './ScanningScreen';
import type { ScanResult, AgentConfig } from '../../types';

function makeResult(agents: AgentConfig[]): ScanResult {
  return { agents, warnings: [], locationsScanned: 5, duration: 1200 };
}

describe('ScanningScreen', () => {
  it('renders scanning message', () => {
    const mockScanAgents = vi.fn().mockReturnValue(new Promise(() => {}));
    (globalThis as unknown as Record<string, unknown>).window = { api: { scanAgents: mockScanAgents } };
    render(<ScanningScreen onNavigate={vi.fn()} setAgents={vi.fn()} />);
    expect(screen.getByText(/Scanning for agents/i)).toBeInTheDocument();
    expect(screen.getByText(/Looking for installed/i)).toBeInTheDocument();
  });

  it('calls scanAgents on mount', async () => {
    const mockScanAgents = vi.fn().mockResolvedValue(makeResult([]));
    (globalThis as unknown as Record<string, unknown>).window = { api: { scanAgents: mockScanAgents } };
    render(<ScanningScreen onNavigate={vi.fn()} setAgents={vi.fn()} />);
    await vi.waitFor(() => {
      expect(mockScanAgents).toHaveBeenCalled();
    });
  });

  it('navigates to results when agents found', async () => {
    const onNavigate = vi.fn();
    const agents: AgentConfig[] = [{ id: 'a', name: 'A', icon: '🤖', path: '/bin/a', source: 'detected' }];
    const mockScanAgents = vi.fn().mockResolvedValue(makeResult(agents));
    (globalThis as unknown as Record<string, unknown>).window = { api: { scanAgents: mockScanAgents } };

    render(<ScanningScreen onNavigate={onNavigate} setAgents={vi.fn()} />);

    await vi.waitFor(() => {
      expect(screen.getByText(/Scan Complete/i)).toBeInTheDocument();
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 1500));
    });

    expect(onNavigate).toHaveBeenCalledWith('results');
  });

  it('navigates to no-agents when none found', async () => {
    const onNavigate = vi.fn();
    const mockScanAgents = vi.fn().mockResolvedValue(makeResult([]));
    (globalThis as unknown as Record<string, unknown>).window = { api: { scanAgents: mockScanAgents } };

    render(<ScanningScreen onNavigate={onNavigate} setAgents={vi.fn()} />);

    await vi.waitFor(() => {
      expect(screen.getByText(/Scan Complete/i)).toBeInTheDocument();
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 1500));
    });

    expect(onNavigate).toHaveBeenCalledWith('no-agents');
  });

  it('shows error state and offers manual add fallback', async () => {
    const mockScanAgents = vi.fn().mockRejectedValue(new Error('scan failed'));
    (globalThis as unknown as Record<string, unknown>).window = { api: { scanAgents: mockScanAgents } };

    render(<ScanningScreen onNavigate={vi.fn()} setAgents={vi.fn()} />);

    await vi.waitFor(() => {
      expect(screen.getByRole('heading', { name: /Scan Failed/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /add agents manually/i })).toBeInTheDocument();
  });

  it('sets agents via setAgents callback', async () => {
    const setAgents = vi.fn();
    const agents: AgentConfig[] = [{ id: 'test-agent', name: 'Test', icon: '🤖', path: '/usr/bin/test', source: 'detected' }];
    const mockScanAgents = vi.fn().mockResolvedValue(makeResult(agents));
    (globalThis as unknown as Record<string, unknown>).window = { api: { scanAgents: mockScanAgents } };

    render(<ScanningScreen onNavigate={vi.fn()} setAgents={setAgents} />);

    await vi.waitFor(() => {
      expect(setAgents).toHaveBeenCalledWith(agents);
    });
  });
});
