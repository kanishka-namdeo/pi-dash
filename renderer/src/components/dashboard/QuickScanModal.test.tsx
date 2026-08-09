import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickScanModal } from './QuickScanModal';

describe('QuickScanModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'api', {
      value: {
        scanAgents: vi.fn().mockImplementation(() => new Promise(res =>
          setTimeout(() => res({ agents: [], warnings: [], locationsScanned: 0, duration: 0 }), 50)
        )),
        getAgents: vi.fn().mockResolvedValue([]),
        saveAgents: vi.fn(),
        validateAgent: vi.fn(),
        findAgentInPath: vi.fn(),
      },
      writable: true,
    });
  });

  it('shows scanning state then completes', async () => {
    render(<QuickScanModal open={true} onOpenChange={() => {}} />);
    // Dialog title should always be visible
    expect(screen.getByText('Scan for Agents')).toBeInTheDocument();
    // After getAgents resolves and scan fires, scanning text appears
    const scanning = await screen.findByText(/scanning for agents/i);
    expect(scanning).toBeInTheDocument();
    // After scan completes with empty results → "No new agents detected"
    const noNew = await screen.findByText(/no new agents detected/i);
    expect(noNew).toBeInTheDocument();
  });
});
