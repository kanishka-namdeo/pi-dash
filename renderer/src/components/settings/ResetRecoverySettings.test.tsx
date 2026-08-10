import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { toast } from 'sonner';
import { ResetRecoverySettings } from './ResetRecoverySettings';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ResetRecoverySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'api', {
      value: {
        getAgents: vi.fn().mockResolvedValue([
          { id: 'a1', name: 'Agent1' },
          { id: 'a2', name: 'Agent2' },
        ]),
        getProjects: vi.fn().mockResolvedValue([
          { path: '/p1', name: 'Project1' },
        ]),
        exportConfig: vi.fn().mockResolvedValue({ success: true }),
        importConfig: vi.fn().mockResolvedValue({ success: true }),
        resetAgents: vi.fn().mockResolvedValue({ success: true }),
        resetProjects: vi.fn().mockResolvedValue({ success: true }),
        fullReset: vi.fn().mockResolvedValue({ success: true }),
      },
      writable: true,
    });
  });

  it('renders export and import sections', () => {
    render(<ResetRecoverySettings />);
    expect(screen.getByText('Export Configuration')).toBeInTheDocument();
    expect(screen.getByText('Import Configuration')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export\.\.\./i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import\.\.\./i })).toBeInTheDocument();
  });

  it('renders danger zone with 3 reset actions', async () => {
    render(<ResetRecoverySettings />);
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/remove all 2 agents\. projects will be kept/i)).toBeInTheDocument();
      expect(screen.getByText(/remove all 1 projects\. agents will be kept/i)).toBeInTheDocument();
      expect(screen.getByText(/remove all 2 agents and 1 projects\. onboarding will restart/i)).toBeInTheDocument();
    });
  });

  it('export button calls window.api.exportConfig', async () => {
    render(<ResetRecoverySettings />);
    fireEvent.click(screen.getByRole('button', { name: /export\.\.\./i }));
    await waitFor(() => {
      expect(window.api.exportConfig).toHaveBeenCalled();
    });
  });

  it('import button calls window.api.importConfig', async () => {
    render(<ResetRecoverySettings />);
    fireEvent.click(screen.getByRole('button', { name: /import\.\.\./i }));
    await waitFor(() => {
      expect(window.api.importConfig).toHaveBeenCalled();
    });
  });

  it('shows error toast for incompatible version import failure', async () => {
    window.api.importConfig = vi.fn().mockRejectedValue(new Error('INCOMPATIBLE_VERSION'));
    render(<ResetRecoverySettings />);
    fireEvent.click(screen.getByRole('button', { name: /import\.\.\./i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Incompatible backup file format.');
    });
  });

  it('shows error toast for invalid JSON import failure', async () => {
    window.api.importConfig = vi.fn().mockRejectedValue(new Error('INVALID_JSON'));
    render(<ResetRecoverySettings />);
    fireEvent.click(screen.getByRole('button', { name: /import\.\.\./i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid JSON in backup file.');
    });
  });

  it('shows error toast for corrupted backup file', async () => {
    window.api.importConfig = vi.fn().mockRejectedValue(new Error('INVALID_AGENTS'));
    render(<ResetRecoverySettings />);
    fireEvent.click(screen.getByRole('button', { name: /import\.\.\./i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Backup file is corrupted or incomplete.');
    });
  });

  it('shows error toast for export failure', async () => {
    window.api.exportConfig = vi.fn().mockRejectedValue(new Error('disk full'));
    render(<ResetRecoverySettings />);
    fireEvent.click(screen.getByRole('button', { name: /export\.\.\./i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to export configuration. Check disk space.');
    });
  });
});
