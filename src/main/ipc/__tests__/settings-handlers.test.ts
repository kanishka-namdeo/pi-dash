import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSettingsHandlers } from '../settings-handlers';
import { ipcMain } from 'electron';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test'),
  },
}));

describe('registerSettingsHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers all settings IPC handlers', () => {
    registerSettingsHandlers();

    const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls;
    const channels = calls.map((c: unknown[]) => c[0]);

    expect(channels).toContain('settings:getAll');
    expect(channels).toContain('settings:set');
    expect(channels).toContain('settings:reset');
    expect(channels).toContain('settings:export');
    expect(channels).toContain('settings:import');
  });
});
