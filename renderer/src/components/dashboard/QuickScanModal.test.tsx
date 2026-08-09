import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickScanModal } from './QuickScanModal';

describe('QuickScanModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'api', {
      value: {
        scanAgents: vi.fn().mockResolvedValue({ agents: [], warnings: [], locationsScanned: 0, duration: 0 }),
        getAgents: vi.fn().mockResolvedValue([]),
        saveAgents: vi.fn(),
        validateAgent: vi.fn(),
        findAgentInPath: vi.fn(),
      },
      writable: true,
    });
  });

  it('shows scanning state', () => {
    render(<QuickScanModal open={true} onOpenChange={() => {}} />);
    expect(screen.getByText(/scanning for agents/i)).toBeInTheDocument();
  });
});
